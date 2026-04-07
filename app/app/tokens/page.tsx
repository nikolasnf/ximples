'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { tokensService } from '@/services/tokens.service';
import type { TokenTransaction, TokenPackage } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { paymentService } from '@/services/payment.service';
import { ArrowLeft, Coins, ArrowUpCircle, ArrowDownCircle, Package, Loader2, CheckCircle, XCircle } from 'lucide-react';

function TokensContent() {
  const router = useRouter();
  const { user, refreshBalance } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(null);

  useEffect(() => {
    loadData();
    // Check URL for payment status
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') {
      setPaymentStatus('success');
      refreshBalance();
    } else if (payment === 'cancelled') {
      setPaymentStatus('cancelled');
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bal, txns, pkgs] = await Promise.all([
        tokensService.getBalance(),
        tokensService.getTransactions(),
        tokensService.getPackages(),
      ]);
      setBalance(bal);
      setTransactions(txns.data);
      setPackages(pkgs);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'signup_bonus': return 'Bônus de cadastro';
      case 'purchase': return 'Compra';
      case 'usage': return 'Uso';
      case 'adjustment': return 'Ajuste';
      default: return source;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tokens</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus créditos</p>
          </div>
        </div>

        {/* Payment Status */}
        {paymentStatus === 'success' && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">Pagamento confirmado!</p>
              <p className="text-xs text-green-600">Seus tokens foram creditados na sua conta.</p>
            </div>
            <button onClick={() => setPaymentStatus(null)} className="ml-auto text-green-400 hover:text-green-600">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
        {paymentStatus === 'cancelled' && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <XCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">Pagamento cancelado. Você pode tentar novamente quando quiser.</p>
            <button onClick={() => setPaymentStatus(null)} className="ml-auto text-amber-400 hover:text-amber-600">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Balance Card */}
        <Card className="ximples-shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Coins className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo atual</p>
              <p className="text-3xl font-bold text-primary">{balance ?? 0} tokens</p>
            </div>
          </div>
        </Card>

        {/* Packages */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Pacotes disponíveis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="ximples-shadow p-6 flex flex-col items-center text-center">
                <p className="font-semibold text-lg text-foreground">{pkg.name}</p>
                <p className="text-3xl font-bold text-primary my-3">{pkg.tokens}</p>
                <p className="text-sm text-muted-foreground mb-1">tokens</p>
                <p className="text-xl font-semibold text-foreground mb-4">{formatCurrency(pkg.price)}</p>
                <Button
                  className="ximples-button-primary w-full"
                  disabled={buyingId !== null}
                  onClick={async () => {
                    setBuyingId(pkg.id);
                    try {
                      const { checkout_url } = await paymentService.createCheckout(pkg.id);
                      window.location.href = checkout_url;
                    } catch {
                      setBuyingId(null);
                    }
                  }}
                >
                  {buyingId === pkg.id ? 'Redirecionando...' : 'Comprar'}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Histórico de transações</h2>
          <Card className="ximples-shadow">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma transação ainda
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {tx.type === 'credit' ? (
                        <ArrowUpCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <ArrowDownCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {tx.description || getSourceLabel(tx.source)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString('pt-BR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge className={tx.type === 'credit'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                    }>
                      {tx.type === 'credit' ? '+' : '-'}{tx.amount} tokens
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function TokensPage() {
  return (
    <ProtectedRoute>
      <TokensContent />
    </ProtectedRoute>
  );
}
