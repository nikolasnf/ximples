<?php

namespace App\Services;

use App\Services\AIService;

class TokenPricingService
{
    public function getCostForAction(string $actionType): int
    {
        $pricing = config('tokens.pricing', []);
        return $pricing[$actionType] ?? $pricing['simple_chat_message'] ?? 1;
    }

    public function getCostForIntent(array $intent): int
    {
        $actions = $intent['actions'] ?? [];
        $intentName = $intent['intent'] ?? 'general_help';

        // Conversational intents are free
        if (empty($actions) || $intentName === 'gathering_info' || $intentName === 'general_help') {
            return 0;
        }

        $total = 0;
        foreach ($actions as $action) {
            $total += $this->getCostForAction($action['type'] ?? 'simple_chat_message');
        }

        return $total;
    }

    public function estimateFromMessage(string $message): array
    {
        $intent = AIService::interpret($message);
        $cost = $this->getCostForIntent($intent);

        return [
            'intent'               => $intent['intent'],
            'estimated_token_cost' => $cost,
            'actions'              => array_map(fn ($a) => [
                'type' => $a['type'],
                'cost' => $this->getCostForAction($a['type']),
            ], $intent['actions'] ?? []),
        ];
    }
}
