<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\TrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TrackingController extends Controller
{
    public function __construct(
        private readonly TrackingService $tracking,
    ) {}

    /**
     * GET /t/{code}
     * Public redirect endpoint. Registers the click and 302-redirects
     * to the original URL with an ?xtl=<code> query param so downstream
     * pixels can correlate visits back to the click.
     */
    public function redirect(Request $request, string $code): RedirectResponse
    {
        $link = $this->tracking->registerClick($code, $request);

        if (!$link) {
            // Fall back to homepage to avoid leaking internal 404s to end users.
            return redirect()->away(config('app.frontend_url', '/'));
        }

        $target = $this->tracking->buildRedirectUrl($link);

        return redirect()->away($target, 302);
    }

    /**
     * GET /api/v1/tracking/resolve/{code}
     * JSON variant of the redirect endpoint used by the frontend SSR route.
     * Also registers the click.
     */
    public function resolve(Request $request, string $code): JsonResponse
    {
        $link = $this->tracking->registerClick($code, $request);

        if (!$link) {
            return response()->json(['success' => false, 'message' => 'Link inválido.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'short_code'    => $link->short_code,
                'original_url'  => $link->original_url,
                'redirect_url'  => $this->tracking->buildRedirectUrl($link),
            ],
        ]);
    }

    /**
     * POST /api/v1/tracking/event
     * Public pixel endpoint. Accepts visit/conversion (and click) events.
     * Always returns 204 so pixel failures never surface to end users.
     *
     * The pixel uses `sendBeacon` with a CORS-safelisted content-type
     * (text/plain) to avoid preflights, so we parse the raw JSON body
     * manually when the request isn't already JSON-parsed by Laravel.
     */
    public function event(Request $request): JsonResponse
    {
        if (empty($request->all()) && $request->getContent() !== '') {
            $decoded = json_decode($request->getContent(), true);
            if (is_array($decoded)) {
                $request->merge($decoded);
            }
        }

        try {
            $payload = $request->validate([
                'type'       => 'required|string|in:visit,conversion,click',
                'page_id'    => 'nullable|integer',
                'xtl'        => 'nullable|string|max:32',
                'name'       => 'nullable|string|max:64',
                'metadata'   => 'nullable|array',
                'session_id' => 'nullable|string|max:64',
            ]);
        } catch (\Illuminate\Validation\ValidationException) {
            // Silent 204 — tracking must never surface errors to end users.
            return response()->json(null, 204);
        }

        $this->tracking->recordEvent($payload, $request);

        return response()->json(null, 204);
    }
}
