'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [company, setCompany] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !passwordConfirm) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (password !== passwordConfirm) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    if (!agreeTerms) {
      setError('Você deve concordar com os termos');
      return;
    }

    try {
      await signup(name, email, password, passwordConfirm);
      router.push('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao criar conta. Tente novamente.';
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
            Crie sua conta e comece em minutos
          </h2>
          <p className="text-lg opacity-90 mb-12">
            Gere landing pages, campanhas, mensagens e automações com uma experiência simples e guiada.
          </p>

          {/* Checklist */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">Crie e gerencie campanhas em minutos</span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">Operador digital fazendo o trabalho</span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">Suporte dedicado 24/7</span>
            </div>
          </div>
        </div>

        <div className="text-white/60 text-sm">
          Confiado por líderes de marketing • Criptografia Segura
        </div>
      </div>

      {/* Right Panel - Signup Form */}
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Cadastre-se</h1>
            <p className="text-muted-foreground">Comece agora com uma conta gratuita</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="name" className="mb-2 block text-sm font-medium">
                Nome
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="ximples-input"
              />
            </div>

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
                placeholder="Crie uma senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ximples-input"
              />
              <p className="text-xs text-muted-foreground mt-1">Mínimo 8 caracteres</p>
            </div>

            <div>
              <Label htmlFor="passwordConfirm" className="mb-2 block text-sm font-medium">
                Confirmar Senha
              </Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="Repita sua senha"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="ximples-input"
              />
            </div>

            <div>
              <Label htmlFor="company" className="mb-2 block text-sm font-medium">
                Empresa <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="company"
                type="text"
                placeholder="Nome da empresa"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="ximples-input"
              />
            </div>

            <div className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors ${
                agreeTerms ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
              <Checkbox
                id="terms"
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                className="mt-0.5 h-5 w-5"
              />
              <label htmlFor="terms" className="text-sm text-foreground leading-relaxed">
                Li e concordo com os{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                  Termos de Serviço
                </a>
                {' '}e a{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                  Política de Privacidade
                </a>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="ximples-button-primary w-full"
            >
              {isLoading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Já tem conta?{' '}
            <a href="/login" className="text-primary font-medium hover:underline">
              Entrar
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
