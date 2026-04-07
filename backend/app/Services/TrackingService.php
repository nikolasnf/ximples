<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Contact;
use App\Models\Event;
use App\Models\Page;
use App\Models\TrackedLink;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TrackingService
{
    /**
     * Dedup window for identical events from the same session/IP.
     * Used to avoid double-counting refreshes and bot retries.
     */
    private const DEDUP_WINDOW_SECONDS = 10;

    /**
     * Resolve (or create) a tracked short link for a given original URL,
     * optionally tied to a campaign and contact. Calling this repeatedly
     * with the same tuple returns the same row (idempotent).
     */
    public function createOrGetLink(
        User $user,
        string $originalUrl,
        ?Campaign $campaign = null,
        ?Contact $contact = null,
        ?Page $page = null,
    ): TrackedLink {
        // Idempotency: for campaign/contact combos we always want one short code.
        if ($campaign && $contact) {
            $existing = TrackedLink::where('user_id', $user->id)
                ->where('campaign_id', $campaign->id)
                ->where('contact_id', $contact->id)
                ->where('original_url', $originalUrl)
                ->first();

            if ($existing) {
                return $existing;
            }
        }

        return TrackedLink::create([
            'user_id'      => $user->id,
            'tenant_id'    => $user->tenant_id,
            'campaign_id'  => $campaign?->id,
            'contact_id'   => $contact?->id,
            'page_id'      => $page?->id,
            'original_url' => $originalUrl,
            'short_code'   => $this->generateUniqueShortCode(),
        ]);
    }

    /**
     * Register a click event for a short code and return the TrackedLink.
     * Returns null if the code is unknown.
     *
     * Caller is responsible for redirecting to $link->original_url. To let
     * downstream pixels correlate visits, the caller should append
     * ?xtl={short_code} (or similar) to the target URL.
     */
    public function registerClick(string $shortCode, Request $request): ?TrackedLink
    {
        $link = TrackedLink::where('short_code', $shortCode)->first();
        if (!$link) {
            return null;
        }

        $ip = $this->clientIp($request);
        $ua = substr((string) $request->userAgent(), 0, 512);

        if ($this->isLikelyBot($ua)) {
            // Still redirect, but don't count as a click
            return $link;
        }

        if ($this->isDuplicate(Event::TYPE_CLICK, $link->user_id, $ip, $ua, ['tracked_link_id' => $link->id])) {
            return $link;
        }

        DB::transaction(function () use ($link, $request, $ip, $ua) {
            Event::create([
                'user_id'         => $link->user_id,
                'tenant_id'       => $link->tenant_id,
                'contact_id'      => $link->contact_id,
                'campaign_id'     => $link->campaign_id,
                'page_id'         => $link->page_id,
                'tracked_link_id' => $link->id,
                'type'            => Event::TYPE_CLICK,
                'metadata'        => [
                    'short_code' => $link->short_code,
                ],
                'ip'         => $ip,
                'user_agent' => $ua,
                'referer'    => substr((string) $request->headers->get('referer', ''), 0, 1024) ?: null,
                'session_id' => $request->headers->get('x-session-id'),
            ]);

            $link->increment('click_count');
            $link->update(['last_clicked_at' => now()]);
        });

        return $link->fresh();
    }

    /**
     * Record an arbitrary tracking event (visit, conversion, etc.)
     * coming from the public pixel endpoint. Returns null if rejected
     * (dedup / invalid input).
     */
    public function recordEvent(array $payload, Request $request): ?Event
    {
        $type = $payload['type'] ?? null;
        if (!in_array($type, [Event::TYPE_VISIT, Event::TYPE_CONVERSION, Event::TYPE_CLICK], true)) {
            return null;
        }

        $ip = $this->clientIp($request);
        $ua = substr((string) $request->userAgent(), 0, 512);

        if ($this->isLikelyBot($ua)) {
            return null;
        }

        // Resolve page → user (tenant) from page_id (required for visits/conversions).
        $page = null;
        if (!empty($payload['page_id'])) {
            $page = Page::find($payload['page_id']);
        }

        // Resolve tracked link (xtl short code) so we can attribute to campaign/contact.
        $link = null;
        if (!empty($payload['xtl'])) {
            $link = TrackedLink::where('short_code', $payload['xtl'])->first();
        }

        // Without a page and without a tracked link we have no user to attribute to.
        if (!$page && !$link) {
            return null;
        }

        $userId = $page?->user_id ?? $link?->user_id;
        $tenantId = $page?->tenant_id ?? $link?->tenant_id;

        if (!$userId || !$tenantId) {
            return null;
        }

        $contactId = $link?->contact_id;
        $campaignId = $link?->campaign_id;
        $pageId = $page?->id ?? $link?->page_id;

        $dedupContext = [
            'page_id'         => $pageId,
            'tracked_link_id' => $link?->id,
            'session_id'      => $payload['session_id'] ?? null,
        ];

        if ($this->isDuplicate($type, $userId, $ip, $ua, $dedupContext)) {
            return null;
        }

        return Event::create([
            'user_id'         => $userId,
            'tenant_id'       => $tenantId,
            'contact_id'      => $contactId,
            'campaign_id'     => $campaignId,
            'page_id'         => $pageId,
            'tracked_link_id' => $link?->id,
            'type'            => $type,
            'name'            => isset($payload['name']) ? substr((string) $payload['name'], 0, 64) : null,
            'metadata'        => is_array($payload['metadata'] ?? null) ? $payload['metadata'] : null,
            'ip'              => $ip,
            'user_agent'      => $ua,
            'referer'         => substr((string) $request->headers->get('referer', ''), 0, 1024) ?: null,
            'session_id'      => $payload['session_id'] ?? null,
        ]);
    }

    /**
     * Build the final URL a user is redirected to after clicking a tracked
     * link. Appends ?xtl={code} so the downstream pixel can correlate visits.
     */
    public function buildRedirectUrl(TrackedLink $link): string
    {
        $url = $link->original_url;
        $separator = str_contains($url, '?') ? '&' : '?';
        return $url . $separator . 'xtl=' . urlencode($link->short_code);
    }

    private function generateUniqueShortCode(int $length = 8): string
    {
        do {
            // URL-safe, no ambiguous chars
            $code = substr(strtr(base64_encode(random_bytes(12)), '+/', '-_'), 0, $length);
            $code = preg_replace('/[^A-Za-z0-9_-]/', '', $code);
            if (strlen($code) < $length) {
                $code = Str::random($length);
            }
        } while (TrackedLink::where('short_code', $code)->exists());

        return $code;
    }

    private function clientIp(Request $request): ?string
    {
        return substr((string) $request->ip(), 0, 64) ?: null;
    }

    private function isLikelyBot(?string $userAgent): bool
    {
        if (!$userAgent) {
            return true;
        }
        return (bool) preg_match(
            '/bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegrambot|linkedinbot|pinterest|embedly|preview/i',
            $userAgent,
        );
    }

    /**
     * Detect near-duplicate events from the same (user, ip, ua) within a
     * small time window. Context is a set of additional fields that must
     * match exactly (e.g. tracked_link_id, page_id).
     */
    private function isDuplicate(string $type, int $userId, ?string $ip, ?string $ua, array $context): bool
    {
        $query = Event::where('type', $type)
            ->where('user_id', $userId)
            ->where('created_at', '>=', now()->subSeconds(self::DEDUP_WINDOW_SECONDS));

        if ($ip) {
            $query->where('ip', $ip);
        }
        if ($ua) {
            $query->where('user_agent', $ua);
        }

        foreach ($context as $key => $value) {
            if ($value === null) {
                continue;
            }
            $query->where($key, $value);
        }

        return $query->exists();
    }

    /**
     * Render the inline JavaScript pixel that landing pages should embed
     * to auto-record visits and provide a window.ximples.track(...) helper
     * for conversion events.
     */
    public function renderPixelScript(int $pageId): string
    {
        $endpoint = rtrim((string) config('app.url'), '/') . '/api/v1/tracking/event';
        $pageIdJs = (int) $pageId;

        // The pixel is served cross-origin (app.ximples → backend.ximples),
        // so we MUST use a CORS-safelisted Content-Type for sendBeacon —
        // otherwise the browser silently drops the request (sendBeacon can't
        // issue preflights). "text/plain" is safelisted and the backend
        // parses the raw JSON body when it sees a non-JSON content-type.
        return <<<JS
(function(){
  try {
    var ep = "{$endpoint}";
    var pid = {$pageIdJs};
    function xtl() {
      try { return new URL(window.location.href).searchParams.get('xtl'); } catch(e){ return null; }
    }
    function sid() {
      try {
        var k = 'xmpl_sid';
        var s = sessionStorage.getItem(k);
        if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem(k, s); }
        return s;
      } catch(e) { return null; }
    }
    function send(type, name, meta) {
      try {
        var body = JSON.stringify({
          page_id: pid, type: type, name: name || null,
          metadata: meta || null, xtl: xtl(), session_id: sid()
        });
        var blob = new Blob([body], {type: 'text/plain;charset=UTF-8'});
        if (navigator.sendBeacon && navigator.sendBeacon(ep, blob)) {
          return;
        }
        fetch(ep, {
          method: 'POST',
          headers: {'Content-Type': 'text/plain;charset=UTF-8'},
          body: body,
          keepalive: true,
          mode: 'cors',
          credentials: 'omit'
        }).catch(function(){});
      } catch(e) {}
    }
    window.ximples = window.ximples || {};
    window.ximples.track = function(name, meta) { send('conversion', name, meta); };
    window.ximples.visit = function() { send('visit', null, null); };
    // Auto-visit on load
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      send('visit', null, null);
    } else {
      document.addEventListener('DOMContentLoaded', function(){ send('visit', null, null); });
    }
  } catch(e) {}
})();
JS;
    }
}
