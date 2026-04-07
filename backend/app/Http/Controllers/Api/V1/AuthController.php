<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\SignupRequest;
use App\Models\User;
use App\Services\TokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(
        private TokenService $tokenService,
    ) {}

    public function signup(SignupRequest $request): JsonResponse
    {
        $user = User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'password'  => $request->password,
            'tenant_id' => Str::uuid(),
        ]);

        // Create wallet and grant signup bonus
        $this->tokenService->createWallet($user);
        $this->tokenService->grantSignupBonus($user);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'    => $user,
            'token'   => $token,
            'balance' => $this->tokenService->getBalance($user),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'Credenciais inválidas.',
            ], 401);
        }

        $user  = Auth::user();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'    => $user,
            'token'   => $token,
            'balance' => $this->tokenService->getBalance($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout realizado com sucesso.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user'    => $user,
            'balance' => $this->tokenService->getBalance($user),
        ]);
    }
}
