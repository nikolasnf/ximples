<?php

namespace App\Services;

use App\Models\TokenTransaction;
use App\Models\TokenWallet;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class TokenService
{
    public function createWallet(User $user): TokenWallet
    {
        return TokenWallet::firstOrCreate(
            ['user_id' => $user->id],
            ['tenant_id' => $user->tenant_id, 'balance' => 0]
        );
    }

    public function getBalance(User $user): int
    {
        $wallet = $user->wallet;
        return $wallet ? $wallet->balance : 0;
    }

    public function hasEnoughBalance(User $user, int $amount): bool
    {
        return $this->getBalance($user) >= $amount;
    }

    public function credit(
        User $user,
        int $amount,
        string $source,
        ?string $description = null,
        ?Model $reference = null,
        ?array $metadata = null,
    ): TokenTransaction {
        return DB::transaction(function () use ($user, $amount, $source, $description, $reference, $metadata) {
            $wallet = $this->createWallet($user);

            $wallet->increment('balance', $amount);

            return TokenTransaction::create([
                'user_id'        => $user->id,
                'tenant_id'      => $user->tenant_id,
                'type'           => 'credit',
                'amount'         => $amount,
                'source'         => $source,
                'reference_type' => $reference ? get_class($reference) : null,
                'reference_id'   => $reference?->id,
                'description'    => $description,
                'metadata'       => $metadata,
            ]);
        });
    }

    public function debit(
        User $user,
        int $amount,
        string $source,
        ?string $description = null,
        ?Model $reference = null,
        ?array $metadata = null,
    ): TokenTransaction {
        return DB::transaction(function () use ($user, $amount, $source, $description, $reference, $metadata) {
            $wallet = TokenWallet::where('user_id', $user->id)->lockForUpdate()->firstOrFail();

            if ($wallet->balance < $amount) {
                throw new \RuntimeException('Saldo de tokens insuficiente.');
            }

            $wallet->decrement('balance', $amount);

            return TokenTransaction::create([
                'user_id'        => $user->id,
                'tenant_id'      => $user->tenant_id,
                'type'           => 'debit',
                'amount'         => $amount,
                'source'         => $source,
                'reference_type' => $reference ? get_class($reference) : null,
                'reference_id'   => $reference?->id,
                'description'    => $description,
                'metadata'       => $metadata,
            ]);
        });
    }

    public function grantSignupBonus(User $user): TokenTransaction
    {
        $bonus = config('tokens.signup_bonus', 100);
        return $this->credit(
            $user,
            $bonus,
            'signup_bonus',
            "Bônus de boas-vindas: {$bonus} tokens"
        );
    }
}
