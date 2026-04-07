'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

const LAST_UPDATED = '04/04/2026';

export default function TermsPage() {
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
            <h1 className="text-3xl font-bold text-foreground">Termos de Serviço</h1>
          </div>
          <p className="text-muted-foreground">Última atualização: {LAST_UPDATED}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar e usar a plataforma Ximples (&quot;Serviço&quot;), você concorda em cumprir estes Termos de Serviço. Se não concordar com qualquer parte destes termos, você não deve usar o Serviço. Ximples se reserva o direito de modificar estes termos a qualquer momento. Continuando a usar o Serviço após tais modificações, você concorda com os termos atualizados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">2. Uso Autorizado</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Você concorda em usar o Serviço apenas para fins legais e de acordo com estes Termos. Especificamente, você concorda em não:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Violar qualquer lei ou regulamento aplicável</li>
              <li>Infringir direitos de propriedade intelectual de terceiros</li>
              <li>Transmitir conteúdo obsceno, ofensivo ou prejudicial</li>
              <li>Interferir com a segurança ou funcionalidade do Serviço</li>
              <li>Realizar engenharia reversa ou tentar acessar código-fonte não autorizado</li>
              <li>Usar o Serviço para fins comerciais sem permissão expressa</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">3. Contas de Usuário</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao criar uma conta, você é responsável por manter a confidencialidade de suas credenciais de login e por todas as atividades que ocorrem em sua conta. Você concorda em fornecer informações precisas e completas durante o registro. Você é totalmente responsável por qualquer atividade não autorizada em sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Conteúdo do Usuário</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Você retém todos os direitos sobre o conteúdo que faz upload ou cria na plataforma Ximples. Ao fazer upload de conteúdo, você nos concede uma licença não exclusiva, mundial e royalty-free para usar, reproduzir, modificar e exibir esse conteúdo para fornecer o Serviço.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Você declara e garante que possui todos os direitos necessários sobre o conteúdo e que o conteúdo não viola direitos de terceiros ou leis aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">5. Planos e Pagamento</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              O Ximples oferece diferentes planos de preço. Os termos específicos de cada plano serão apresentados antes do checkout. Ao selecionar um plano:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Você autoriza cobranças recorrentes no seu método de pagamento</li>
              <li>Você pode cancelar sua assinatura a qualquer momento</li>
              <li>Cancelamentos entram em vigor no final do ciclo de faturamento</li>
              <li>Não há reembolsos por uso parcial de um período de faturamento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">6. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              Na máxima extensão permitida pela lei, o Ximples e seus diretores, funcionários e fornecedores não serão responsáveis por danos indiretos, incidentais, especiais, consequentes ou punitivos, incluindo perda de lucros, dados ou use, mesmo se avisados da possibilidade de tais danos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">7. Disponibilidade do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ximples se esforça para manter o Serviço disponível 99,5% do tempo, excluindo manutenção programada. No entanto, não garantimos disponibilidade ininterrupta. Podemos suspender ou descontinuar o Serviço a qualquer momento, com aviso prévio quando possível.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">8. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo, recursos e funcionalidades do Serviço, incluindo mas não limitado a software, design, gráficos e texto, são propriedade do Ximples ou seus licenciadores e protegidos por leis de direitos autorais e outras leis de propriedade intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">9. Rescisão</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ximples pode encerrar ou suspender sua conta e acesso ao Serviço imediatamente, sem aviso prévio ou responsabilidade, se você violar qualquer disposição destes Termos de Serviço.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">10. Lei Aplicável</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes Termos de Serviço serão regidos por e construídos de acordo com as leis do Brasil, sem considerar seus conflitos de disposições legais. Você concorda em se submeter à jurisdição exclusiva dos tribunais localizados no Brasil.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">11. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você tiver perguntas sobre estes Termos de Serviço, entre em contato conosco em:
            </p>
            <div className="mt-4 p-4 bg-secondary rounded-lg">
              <p className="text-foreground font-semibold">Ximples</p>
              <p className="text-muted-foreground">Email: legal@ximples.com.br</p>
              <p className="text-muted-foreground">Site: www.ximples.com.br</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
