import type { Metadata } from 'next'
import { Geist, Geist_Mono, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Ximples - Seu Marketing Feito por Você. Só Que Sem Você.',
  description: 'Ximples: operador digital de marketing via chat. Crie landing pages, campanhas, emails e WhatsApp com IA. Você pede. Ele faz.',
  generator: 'v0.app',
  openGraph: {
    title: 'Ximples',
    description: 'Seu Marketing Feito por Você. Só Que Sem Você.',
    url: 'https://app.ximples.com.br',
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 400,
        height: 400,
        alt: 'Ximples Logo',
      },
    ],
  },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased bg-background text-foreground">
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  )
}
