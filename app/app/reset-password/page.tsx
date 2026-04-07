'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { passwordService } from '@/services/password.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Lock } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !passwordConfirm) {
      setError('Preencha todos os campos');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    if (password !== passwordConfirm) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    try {
      await passwordService.resetPassword({
        email,
        token,
        password,
        password_confirmation: passwordConfirm,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao redefinir senha.';
      if (message.includes('Token') || message.includes('token') || message.includes('expirado') || message.includes('inválido')) {
        setError('Este link expirou ou já foi utilizado. Solicite um novo link de recuperação.');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Link inválido</h1>
        <p className="text-muted-foreground">Este link de recuperação é inválido ou expirou.</p>
        <Link href="/forgot-password">
          <Button className="ximples-button-primary">Solicitar novo link</Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Senha redefinida!</h1>
        <p className="text-muted-foreground">Sua senha foi alterada com sucesso.</p>
        <Button className="ximples-button-primary" onClick={() => router.push('/login')}>
          Fazer login
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Nova senha</h1>
        <p className="text-muted-foreground">Defina sua nova senha para <strong>{email}</strong></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm space-y-2">
            <p>{error}</p>
            {error.includes('expirou') && (
              <Link href="/forgot-password" className="inline-block text-primary font-medium hover:underline text-sm">
                Solicitar novo link
              </Link>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="password" className="mb-2 block text-sm font-medium">Nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ximples-input pl-10"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="passwordConfirm" className="mb-2 block text-sm font-medium">Confirmar nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="passwordConfirm"
              type="password"
              placeholder="Repita a nova senha"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="ximples-input pl-10"
            />
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="ximples-button-primary w-full">
          {isLoading ? 'Redefinindo...' : 'Redefinir senha'}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 ximples-gradient flex-col justify-between p-12">
        <div>
          <div className="flex items-center justify-center p-4">
            <Image src="/logo-ximples-white.png" alt="Ximples" width={400} height={120} className="w-96 h-auto" />
          </div>
        </div>
        <div className="text-white">
          <h2 className="text-4xl font-bold mb-4 leading-tight">Defina sua nova senha</h2>
          <p className="text-lg opacity-90">Escolha uma senha forte para proteger sua conta.</p>
        </div>
        <div className="text-white/60 text-sm">Ximples - Seu marketing simplificado</div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <div className="bg-primary rounded-xl flex items-center justify-center p-2">
              <Image src="/logo-ximples-white.png" alt="Ximples" width={240} height={72} className="w-60 h-auto" />
            </div>
          </div>
          <Suspense fallback={<div className="text-center text-muted-foreground">Carregando...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
