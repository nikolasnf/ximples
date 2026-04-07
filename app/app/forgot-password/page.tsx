'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { passwordService } from '@/services/password.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Informe seu e-mail');
      return;
    }

    setIsLoading(true);
    try {
      await passwordService.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 ximples-gradient flex-col justify-between p-12">
        <div>
          <div className="flex items-center justify-center p-4">
            <Image src="/logo-ximples-white.png" alt="Ximples" width={400} height={120} className="w-96 h-auto" />
          </div>
        </div>
        <div className="text-white">
          <h2 className="text-4xl font-bold mb-4 leading-tight">Recupere o acesso à sua conta</h2>
          <p className="text-lg opacity-90">Enviaremos um link para redefinir sua senha de forma segura.</p>
        </div>
        <div className="text-white/60 text-sm">Ximples - Seu marketing simplificado</div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <div className="bg-primary rounded-xl flex items-center justify-center p-2">
              <Image src="/logo-ximples-white.png" alt="Ximples" width={240} height={72} className="w-60 h-auto" />
            </div>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">E-mail enviado!</h1>
              <p className="text-muted-foreground">
                Se <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
              </p>
              <p className="text-sm text-muted-foreground">Verifique também sua caixa de spam.</p>
              <Link href="/login">
                <Button className="ximples-button-primary mt-4">Voltar para o login</Button>
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </Link>

              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Esqueci minha senha</h1>
                <p className="text-muted-foreground">Informe seu e-mail para receber o link de recuperação</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
                )}

                <div>
                  <Label htmlFor="email" className="mb-2 block text-sm font-medium">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="voce@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="ximples-input !pl-10"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="ximples-button-primary w-full">
                  {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
