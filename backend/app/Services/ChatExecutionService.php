<?php

namespace App\Services;

use App\Jobs\ProcessTaskJob;
use App\Models\Chat;
use App\Models\Message;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ChatExecutionService
{
    public function __construct(
        private TokenService $tokenService,
        private TokenPricingService $pricingService,
        private TemplateService $templateService,
        private PageBuilderService $pageBuilderService,
    ) {}

    public function execute(User $user, Chat $chat, string $messageText, ?int $templateId = null): array
    {
        // Save user message
        Message::create([
            'chat_id' => $chat->id,
            'role'    => 'user',
            'content' => $messageText,
        ]);

        // Build conversation history for AI context
        $history = Message::where('chat_id', $chat->id)
            ->orderBy('created_at')
            ->get(['role', 'content'])
            ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])
            ->toArray();

        // Remove the last message (it's the one we just saved — we pass it separately)
        array_pop($history);

        // If the user picked a template in /templates, load it and build the AI
        // context descriptor. When present, AIService switches to "template mode"
        // and fills the provided section skeleton instead of inventing one.
        $template = null;
        $templateContext = null;
        if ($templateId) {
            try {
                $template = $this->templateService->find($templateId);
                $templateContext = $this->templateService->buildAIContext($template);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('ChatExecutionService: unknown template_id', [
                    'template_id' => $templateId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Interpret with full conversation context
        $intent = AIService::interpret($messageText, $history, $templateContext);

        $hasActions = !empty($intent['actions']);
        $isGathering = ($intent['intent'] === 'gathering_info' || $intent['intent'] === 'general_help');

        // If AI is just conversing (no actions), respond without charging tokens
        if (!$hasActions || $isGathering) {
            Message::create([
                'chat_id'  => $chat->id,
                'role'     => 'assistant',
                'content'  => $intent['message'] ?? '',
                'metadata' => ['intent' => $intent['intent'], 'token_cost' => 0],
            ]);

            $chat->load('messages');

            return [
                'success'         => true,
                'chat'            => $chat,
                'token_cost'      => 0,
                'current_balance' => $this->tokenService->getBalance($user),
            ];
        }

        // AI decided to execute — calculate cost
        $tokenCost = $this->pricingService->getCostForIntent($intent);

        // Validate and debit atomically
        $debitResult = DB::transaction(function () use ($user, $tokenCost) {
            $wallet = \App\Models\TokenWallet::where('user_id', $user->id)->lockForUpdate()->first();
            $balance = $wallet ? $wallet->balance : 0;

            if ($balance < $tokenCost) {
                return ['success' => false, 'balance' => $balance];
            }

            return ['success' => true, 'balance' => $balance];
        });

        if (!$debitResult['success']) {
            Message::create([
                'chat_id'  => $chat->id,
                'role'     => 'assistant',
                'content'  => "Saldo insuficiente para executar esta ação. Você precisa de {$tokenCost} tokens, mas tem apenas {$debitResult['balance']}. Adquira mais tokens para continuar.",
                'metadata' => ['intent' => $intent['intent'], 'error' => 'insufficient_balance'],
            ]);

            $chat->load('messages');

            return [
                'success'         => false,
                'error'           => 'insufficient_balance',
                'message'         => 'Saldo de tokens insuficiente para executar esta ação.',
                'required_tokens' => $tokenCost,
                'current_balance' => $debitResult['balance'],
                'chat'            => $chat,
            ];
        }

        // Debit tokens
        $this->tokenService->debit(
            $user,
            $tokenCost,
            'usage',
            "Ação: {$intent['intent']}",
            $chat,
            ['intent' => $intent['intent'], 'actions_count' => count($intent['actions'])]
        );

        // Create tasks
        foreach ($intent['actions'] as $action) {
            $actionCost = $this->pricingService->getCostForAction($action['type'] ?? 'simple_chat_message');

            $input = $action['input'] ?? [];
            if (!is_array($input)) {
                $input = [];
            }

            // When a template is active and the AI returned a template-mode landing_page
            // action, expand the by-id overrides (template_sections) into a concrete
            // sections[] array by merging them onto the template skeleton. This keeps
            // ProcessTaskJob::processLandingPage fully template-agnostic — it just sees
            // an input with `sections` already filled and persists it as-is.
            if ($template && ($action['type'] ?? null) === 'landing_page') {
                $overrides = [];
                if (!empty($input['template_sections']) && is_array($input['template_sections'])) {
                    $overrides['sections'] = $input['template_sections'];
                }
                if (!empty($input['theme']) && is_array($input['theme'])) {
                    $overrides['theme'] = $input['theme'];
                }

                $document = $this->pageBuilderService->buildDocument($template, $overrides);

                $input['sections'] = $document['sections'];
                $input['theme'] = $document['theme'];
                $input['template_id'] = $template->id;
                unset($input['template_sections']);
            }

            $task = Task::create([
                'chat_id'    => $chat->id,
                'tenant_id'  => $user->tenant_id,
                'type'       => $action['type'] ?? 'general',
                'status'     => 'pending',
                'token_cost' => $actionCost,
                'input'      => $input,
            ]);

            ProcessTaskJob::dispatch($task);
        }

        // Save assistant response
        Message::create([
            'chat_id'  => $chat->id,
            'role'     => 'assistant',
            'content'  => $intent['message'] ?? '',
            'metadata' => ['intent' => $intent['intent'], 'token_cost' => $tokenCost],
        ]);

        $chat->load('messages');

        return [
            'success'         => true,
            'chat'            => $chat,
            'token_cost'      => $tokenCost,
            'current_balance' => $this->tokenService->getBalance($user),
        ];
    }
}
