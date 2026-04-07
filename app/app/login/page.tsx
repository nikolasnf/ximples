'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    try {
      await login(email, password);
      router.push('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao fazer login. Tente novamente.';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 ximples-gradient flex-col justify-between p-12">
        <div>
          <div className="flex items-center justify-center p-4">
            <Image
              src="/logo-ximples-white.png"
              alt="Ximples"
              width={400}
              height={120}
              className="w-96 h-auto"
            />
          </div>
        </div>

        <div className="text-white">
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Entre e continue de onde parou
          </h2>
          <p className="text-lg opacity-90 mb-12">
            Seu marketing, suas automações e suas entregas em uma experiência simples.
          </p>

          {/* Benefits */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm opacity-90">Landing pages em minutos</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm opacity-90">Campanhas e automações</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm opacity-90">Você pede. Ximples faz.</span>
            </div>
          </div>
        </div>

        <div className="text-white/60 text-sm">
          Trusted by marketing leaders • Securely Encrypted
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <div className="bg-primary rounded-xl flex items-center justify-center p-2">
              <Image
                src="/logo-ximples-white.png"
                alt="Ximples"
                width={240}
                height={72}
                className="w-60 h-auto"
              />
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Entrar</h1>
            <p className="text-muted-foreground">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="email" className="mb-2 block text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ximples-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="mb-2 block text-sm font-medium">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ximples-input"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  Lembrar-me
                </label>
              </div>
              <a href="/forgot-password" className="text-sm text-primary hover:underline">
                Esqueci minha senha
              </a>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="ximples-button-primary w-full"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Não tem conta?{' '}
            <a href="/signup" className="text-primary font-medium hover:underline">
              Cadastre-se
            </a>
          </p>

          {/* Terms and Privacy Links */}
          <div className="flex flex-wrap justify-center gap-4 pt-4 border-t border-border text-xs text-muted-foreground">
            <a href="/terms" className="hover:text-primary transition-colors">
              Termos de Serviço
            </a>
            <span>•</span>
            <a href="/privacy" className="hover:text-primary transition-colors">
              Política de Privacidade
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
