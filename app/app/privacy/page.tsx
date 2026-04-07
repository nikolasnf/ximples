'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

const LAST_UPDATED = '04/04/2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/login" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Image
                src="/logo-ximples-white.png"
                alt="Ximples"
                width={48}
                height={48}
                className="w-10 h-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Política de Privacidade</h1>
          </div>
          <p className="text-muted-foreground">Última atualização: {LAST_UPDATED}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              Na Ximples, levamos a privacidade de nossos usuários muito a sério. Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações pessoais quando você usa nossa plataforma. Leia esta política cuidadosamente para entender nossas práticas de privacidade.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">2. Informações que Coletamos</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Coletamos informações de várias formas:
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Informações fornecidas por você:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Nome completo e endereço de e-mail</li>
                  <li>Número de telefone e endereço (opcional)</li>
                  <li>Informações de pagamento (processadas de forma segura)</li>
                  <li>Conteúdo que você cria, faz upload ou compartilha</li>
                  <li>Informações de perfil e preferências</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Informações coletadas automaticamente:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Tipo de dispositivo e sistema operacional</li>
                  <li>Endereço IP e dados de localização aproximada</li>
                  <li>Páginas visitadas e duração das visitas</li>
                  <li>Cliques e interações com conteúdo</li>
                  <li>Dados de cookies e similares</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">3. Como Usamos Suas Informações</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Usamos as informações coletadas para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Fornecer, manter e melhorar o Serviço</li>
              <li>Processar transações e enviar confirmações</li>
              <li>Enviar comunicações técnicas e atualizações de segurança</li>
              <li>Responder a suas perguntas e fornecer suporte ao cliente</li>
              <li>Personalizar sua experiência no Serviço</li>
              <li>Detectar e prevenir fraude e atividades ilícitas</li>
              <li>Cumprir obrigações legais e regulatórias</li>
              <li>Enviar atualizações de produtos e ofertas promocionais (com seu consentimento)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Compartilhamento de Informações</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Não vendemos suas informações pessoais. No entanto, podemos compartilhar informações com:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Provedores de serviço que nos ajudam a operar a plataforma (pagamento, hospedagem, suporte)</li>
              <li>Autoridades legais quando exigido por lei</li>
              <li>Parceiros de negócios (apenas com seu consentimento)</li>
              <li>Sucessores em caso de venda ou fusão</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">5. Segurança dos Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas de segurança técnicas, administrativas e físicas para proteger suas informações pessoais contra acesso não autorizado, alteração e destruição. Isso inclui criptografia SSL/TLS, firewalls e controles de acesso rigorosos. No entanto, nenhum método de transmissão pela Internet é 100% seguro. Se você tiver motivos para acreditar que sua privacidade foi comprometida, entre em contato conosco imediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">6. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Retemos suas informações pessoais apenas pelo tempo necessário para fornecer o Serviço e cumprir os fins descritos nesta Política de Privacidade. Você pode solicitar a exclusão de sua conta e dados pessoais a qualquer momento enviando uma solicitação para privacy@ximples.com.br.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">7. Seus Direitos</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Você tem direito a:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Acessar suas informações pessoais</li>
              <li>Corrigir informações imprecisas</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Optar por não receber comunicações de marketing</li>
              <li>Revogar seu consentimento para coleta de dados</li>
              <li>Solicitar uma cópia portátil de seus dados</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Para exercer esses direitos, entre em contato conosco usando as informações abaixo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">8. Cookies e Tecnologias de Rastreamento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Usamos cookies e tecnologias similares para melhorar sua experiência, manter sessões de usuário e analisar o uso do Serviço. Você pode controlar as configurações de cookies em seu navegador. Desabilitar cookies pode afetar a funcionalidade de alguns recursos do Serviço.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">9. Terceiros</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Serviço pode conter links para sites de terceiros. Não somos responsáveis pelas práticas de privacidade desses sites. Recomendamos revisar as políticas de privacidade de qualquer terceiro antes de fornecer suas informações pessoais.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">10. Conformidade com LGPD</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ximples está em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD) do Brasil. Processamos dados pessoais apenas com uma base legal legítima e protegemos seus direitos de acordo com a LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">11. Menores</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Serviço não é direcionado a menores de 18 anos. Não coletamos intencionalmente informações pessoais de menores. Se descobrirmos que coletamos informações de um menor, excluiremos essas informações imediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">12. Mudanças nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças materiais por e-mail ou com um aviso destacado no Serviço. Seu uso continuado do Serviço após tais mudanças constitui aceitação da Política atualizada.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">13. Contato</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Se você tiver perguntas, preocupações ou desejar exercer seus direitos de privacidade, entre em contato conosco:
            </p>
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-foreground font-semibold">Ximples - Departamento de Privacidade</p>
              <p className="text-muted-foreground">Email: privacy@ximples.com.br</p>
              <p className="text-muted-foreground">Site: www.ximples.com.br</p>
              <p className="text-muted-foreground mt-2">Tempo de resposta: até 30 dias úteis</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
