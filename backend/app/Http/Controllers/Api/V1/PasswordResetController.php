<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Models\User;

class PasswordResetController extends Controller
{
    public function sendResetLink(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        // Always return success to prevent email enumeration
        if (!$user) {
            return response()->json([
                'success' => true,
                'message' => 'Se o email estiver cadastrado, você receberá um link de recuperação.',
            ]);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($token), 'created_at' => now()],
        );

        $resetUrl = config('app.frontend_url') . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);

        Mail::raw(
            "Olá {$user->name},\n\nVocê solicitou a recuperação de senha da sua conta Ximples.\n\nClique no link para redefinir sua senha:\n{$resetUrl}\n\nEste link expira em 2 horas.\n\nSe você não solicitou, ignore este email.\n\nEquipe Ximples",
            function ($message) use ($user) {
                $message->to($user->email)
                    ->subject('Ximples - Recuperação de Senha');
            }
        );

        return response()->json([
            'success' => true,
            'message' => 'Se o email estiver cadastrado, você receberá um link de recuperação.',
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json([
                'success' => false,
                'message' => 'Token inválido ou expirado.',
            ], 422);
        }

        // Check expiration (120 minutes)
        if (!$record->created_at || now()->diffInMinutes($record->created_at) > 120) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json([
                'success' => false,
                'message' => 'Token expirado. Solicite um novo link.',
            ], 422);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->update(['password' => $request->password]);

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Senha redefinida com sucesso.',
        ]);
    }
}
