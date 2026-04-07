<?php

namespace Database\Seeders;

use App\Models\PageTemplate;
use Illuminate\Database\Seeder;

/**
 * Seeds the curated catalog of landing page templates.
 *
 * Each template is stored as a PageDocument (version, theme, sections[]),
 * which is the exact shape consumed by both the React PageRenderer and the
 * PHP PageExportService. Using a single format means templates render
 * identically in the /templates gallery preview, in /pages/{id}/preview,
 * and in the exported HTML/ZIP — no duplicated rendering code.
 *
 * Only block types already implemented in PageRenderer + PageExportService
 * are used: hero, text, features, faq, cta, image, testimonial, pricing,
 * countdown, form, footer, html.
 */
class PageTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            $this->vslSalesTemplate(),
            $this->leadMagnetTemplate(),
            $this->digitalProductTemplate(),
            $this->webinarTemplate(),
            $this->institutionalTemplate(),
        ];

        foreach ($templates as $data) {
            PageTemplate::updateOrCreate(
                ['slug' => $data['slug']],
                $data,
            );
        }
    }

    private function vslSalesTemplate(): array
    {
        $theme = [
            'fontFamily' => 'Inter',
            'primaryColor' => '#B91C1C',
            'backgroundColor' => '#0F172A',
            'textColor' => '#F8FAFC',
            'radius' => '12px',
        ];

        return [
            'name' => 'VSL — Vendas Diretas',
            'slug' => 'vsl-vendas-diretas',
            'description' => 'Página com vídeo de vendas e oferta direta, focada em conversão imediata.',
            'category' => 'vendas',
            'preview_image' => '/storage/templates/vsl-vendas-diretas.png',
            'is_active' => true,
            'sort_order' => 10,
            'structure_json' => [
                'version' => 1,
                'page' => ['title' => 'VSL — Vendas Diretas', 'type' => 'sales'],
                'theme' => $theme,
                'sections' => [
                    [
                        'id' => 'hero-1',
                        'type' => 'hero',
                        'props' => [
                            'headline' => 'Descubra o método que está transformando resultados',
                            'subheadline' => 'Assista ao vídeo abaixo e entenda como aplicar no seu negócio a partir de hoje.',
                            'buttonText' => 'Quero garantir minha vaga',
                            'buttonLink' => '#oferta',
                        ],
                    ],
                    [
                        'id' => 'video-1',
                        'type' => 'html',
                        'props' => [
                            'content' => '<div style="max-width:820px;margin:0 auto;aspect-ratio:16/9;background:#000;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#FFF;font-size:1rem;opacity:0.7;">Cole aqui o embed do seu vídeo de vendas</div>',
                        ],
                    ],
                    [
                        'id' => 'features-1',
                        'type' => 'features',
                        'props' => [
                            'title' => 'O que você vai descobrir',
                            'items' => [
                                ['icon' => 'target', 'title' => 'O método completo', 'description' => 'Passo a passo prático para aplicar hoje mesmo.'],
                                ['icon' => 'trending-up', 'title' => 'Resultados reais', 'description' => 'Casos de quem já aplicou e transformou o faturamento.'],
                                ['icon' => 'shield', 'title' => 'Garantia incondicional', 'description' => '7 dias para testar sem risco — 100% do seu dinheiro de volta.'],
                            ],
                        ],
                    ],
                    [
                        'id' => 'testimonial-1',
                        'type' => 'testimonial',
                        'props' => [
                            'title' => 'Quem já aplicou, aprovou',
                            'items' => [
                                ['quote' => 'Em 30 dias dobrei minhas vendas. Recomendo para qualquer pessoa séria.', 'name' => 'Marina Costa', 'role' => 'Empreendedora'],
                                ['quote' => 'Finalmente um método direto ao ponto. Mudou o jogo pra mim.', 'name' => 'Rafael Lima', 'role' => 'Produtor digital'],
                                ['quote' => 'A clareza do conteúdo fez toda a diferença nos meus resultados.', 'name' => 'Juliana Ribeiro', 'role' => 'Coach'],
                            ],
                        ],
                    ],
                    [
                        'id' => 'pricing-1',
                        'type' => 'pricing',
                        'props' => [
                            'title' => 'Escolha sua condição',
                            'plans' => [
                                [
                                    'name' => 'Oferta completa',
                                    'price' => 'R$ 497',
                                    'period' => 'à vista',
                                    'highlighted' => true,
                                    'buttonText' => 'Garantir acesso agora',
                                    'buttonLink' => '#checkout',
                                    'features' => [
                                        'Acesso imediato ao método completo',
                                        'Bônus exclusivos de implementação',
                                        'Suporte direto por 30 dias',
                                        'Garantia incondicional de 7 dias',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'id' => 'faq-1',
                        'type' => 'faq',
                        'props' => [
                            'title' => 'Perguntas frequentes',
                            'items' => [
                                ['question' => 'Como funciona o acesso?', 'answer' => 'Você recebe por e-mail o link da área de membros logo após a confirmação do pagamento.'],
                                ['question' => 'E se eu não gostar?', 'answer' => 'Você tem 7 dias para testar. Se não gostar, devolvemos 100% do valor investido.'],
                                ['question' => 'Quanto tempo preciso dedicar?', 'answer' => 'Entre 15 e 30 minutos por dia já são suficientes para aplicar o método.'],
                            ],
                        ],
                    ],
                    [
                        'id' => 'cta-1',
                        'type' => 'cta',
                        'props' => [
                            'title' => 'Pronto para começar?',
                            'subtitle' => 'Garanta sua vaga enquanto a condição especial estiver disponível.',
                            'buttonText' => 'Quero entrar agora',
                            'buttonLink' => '#checkout',
                        ],
                    ],
                    [
                        'id' => 'footer-1',
                        'type' => 'footer',
                        'props' => [
                            'text' => '© ' . date('Y') . ' — Todos os direitos reservados',
                            'powered_by' => 'Ximples',
                        ],
                    ],
                ],
            ],
        ];
    }

    private function leadMagnetTemplate(): array
    {
        $theme = [
            'fontFamily' => 'Inter',
            'primaryColor' => '#183A6B',
            'backgroundColor' => '#F6F8FC',
            'textColor' => '#0F172A',
            'radius' => '16px',
        ];

        return [
            'name' => 'Lead Magnet — Captura de E-mail',
            'slug' => 'lead-magnet-captura',
            'description' => 'Captura de e-mails em troca de um material gratuito (e-book, checklist, mini-curso).',
            'category' => 'lead',
            'preview_image' => '/storage/templates/lead-magnet-captura.png',
            'is_active' => true,
            'sort_order' => 20,
            'structure_json' => [
                'version' => 1,
                'page' => ['title' => 'Lead Magnet — Captura de E-mail', 'type' => 'lead_capture'],
                'theme' => $theme,
                'sections' => [
                    [
                        'id' => 'hero-1',
                        'type' => 'hero',
                        'props' => [
                            'headline' => 'Baixe agora o material gratuito',
                            'subheadline' => 'Receba no seu e-mail o conteúdo que vai te ajudar a dar o próximo passo.',
                            'buttonText' => 'Quero receber',
                            'buttonLink' => '#form',
                        ],
                    ],
                    [
                        'id' => 'features-1',
                        'type' => 'features',
                        'props' => [
                            'title' => 'O que você vai receber',
                            'items' => [
                                ['icon' => 'check', 'title' => 'Conteúdo prático', 'description' => 'Direto ao ponto, pronto para aplicar.'],
                                ['icon' => 'zap', 'title' => 'Resultados rápidos', 'description' => 'Aprenda em minutos, aplique hoje mesmo.'],
                                ['icon' => 'heart', 'title' => '100% gratuito', 'description' => 'Sem pegadinhas, sem cobranças escondidas.'],
                            ],
                        ],
                    ],
                    [
                        'id' => 'form-1',
                        'type' => 'form',
                        'props' => [
                            'title' => 'Receba agora no seu e-mail',
                            'subtitle' => 'Preencha seus dados e acesse o material imediatamente.',
                            'buttonText' => 'Quero baixar agora',
                            'action' => '#',
                            'fields' => [
                                ['name' => 'name', 'label' => 'Seu nome', 'type' => 'text', 'required' => true, 'placeholder' => 'Como podemos te chamar?'],
                                ['name' => 'email', 'label' => 'Seu melhor e-mail', 'type' => 'email', 'required' => true, 'placeholder' => 'voce@exemplo.com.br'],
                            ],
                        ],
                    ],
                    [
                        'id' => 'testimonial-1',
                        'type' => 'testimonial',
                        'props' => [
                            'title' => 'Quem já baixou, aprovou',
                            'items' => [
                                ['quote' => 'Material simples e objetivo. Já comecei a aplicar no mesmo dia.', 'name' => 'Paula Mendes', 'role' => 'Consultora'],
                                ['quote' => 'Muito mais conteúdo do que eu esperava de algo gratuito.', 'name' => 'André Souza', 'role' => 'Afiliado'],
                            ],
                        ],
                    ],
                    [
                        'id' => 'footer-1',
                        'type' => 'footer',
                        'props' => [
                            'text' => '© ' . date('Y') . ' — Seus dados estão seguros',
                            'powered_by' => 'Ximples',
                        ],
                    ],
                ],
            ],
        ];
    }

    private function digitalProductTemplate(): array
    {
        $theme = [
            'fontFamily' => 'Inter',
            'primaryColor' => '#7C3AED',
            'backgroundColor' => '#FFFFFF',
            'textColor' => '#0F172A',
            'radius' => '18px',
        ];

        return [
            'name' => 'Produto Digital — E-book',
            'slug' => 'produto-digital-ebook',
            'description' => 'Página de venda para e-book, curso ou infoproduto, com foco em benefícios e prova social.',
            'category' => 'produto',
            'preview_image' => '/storage/templates/produto-digital-ebook.png',
            'is_active' => true,
            'sort_order' => 30,
            'structure_json' => [
                'version' => 1,
                'page' => ['title' => 'Produto Digital — E-book', 'type' => 'sales'],
                'theme' => $theme,
                'sections' => [
                    [
                        'id' => 'hero-1',
                        'type' => 'hero',
                        'props' => [
                            'headline' => 'O guia definitivo que você estava procurando',
                            'subheadline' => 'Aprenda passo a passo o caminho completo para alcançar seu objetivo.',
                            'buttonText' => 'Quero meu exemplar',
                            'buttonLink' => '#oferta',
                        ],
                    ],
                    [
                        'id' => 'image-1',
                        'type' => 'image',
                        'props' => [
                            'src' => 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
                            'alt' => 'Capa do e-book',
                            'caption' => 'Capa ilustrativa — substitua pela sua arte final.',
                        ],
                    ],
                    [
                        'id' => 'features-1',
                        'type' => 'features',
                        'props' => [
                            'title' => 'O que você vai aprender',
                            'items' => [
                                ['icon' => 'star', 'title' => 'Fundamentos essenciais', 'description' => 'Tudo que você precisa saber para começar bem.'],
                                ['icon' => 'target', 'title' => 'Estratégias práticas', 'description' => 'Técnicas testadas e prontas para aplicar.'],
                                ['icon' => 'trending-up', 'title' => 'Plano de ação', 'description' => 'Um caminho claro para você seguir e evoluir.'],
                            ],
                        ],
                    ],
                    [
                        'id' => 'pricing-1',
                        'type' => 'pricing',
                        'props' => [
                            'title' => 'Escolha seu plano',
                            'plans' => [
                                [
                                    'name' => 'Básico',
                                    'price' => 'R$ 47',
                                    'period' => 'à vista',
                                    'buttonText' => 'Começar',
                                    'buttonLink' => '#checkout-basico',
                                    'features' => ['E-book completo em PDF', 'Acesso vitalício', 'Atualizações gratuitas'],
                                ],
                                [
                                    'name' => 'Completo',
                                    'price' => 'R$ 97',
                                    'period' => 'à vista',
                                    'highlighted' => true,
                                    'buttonText' => 'Quero o completo',
                                    'buttonLink' => '#checkout-completo',
                                    'features' => ['Tudo do plano Básico', 'Bônus de templates prontos', 'Grupo exclusivo de alunos', 'Suporte por 30 dias'],
                                ],
                            ],
                        ],
                    ],
                    [
                        'id' => 'testimonial-1',
                        'type' => 'testimonial',
                        'props' => [
                            'title' => 'Quem já leu, recomenda',
                            'items' => [
                                ['quote' => 'Linguagem clara e direta. Consegui colocar em prática já na primeira semana.', 'name' => 'Camila Torres', 'role' => 'Leitora'],
                                ['quote' => 'O melhor investimento que fiz no último ano.', 'name' => 'Bruno Almeida', 'role' => 'Leitor'],
                            ],
                        ],
                    ],
                    [
                        'id' => 'faq-1',
                        'type' => 'faq',
                        'props' => [
                            'title' => 'Dúvidas frequentes',
                            'items' => [
                                ['question' => 'Como recebo o e-book?', 'answer' => 'Por e-mail, logo após a confirmação da compra.'],
                                ['question' => 'Funciona em qualquer dispositivo?', 'answer' => 'Sim, é um PDF que abre em celular, tablet e computador.'],
                            ],
                        ],
                    ],
                    [
                        'id' => 'cta-1',
                        'type' => 'cta',
                        'props' => [
                            'title' => 'Comece sua transformação agora',
                            'subtitle' => 'Garanta seu exemplar e dê o primeiro passo hoje mesmo.',
                            'buttonText' => 'Quero garantir o meu',
                            'buttonLink' => '#checkout-completo',
                        ],
                    ],
                    [
                        'id' => 'footer-1',
                        'type' => 'footer',
                        'props' => [
                            'text' => '© ' . date('Y') . ' — Todos os direitos reservados',
                            'powered_by' => 'Ximples',
                        ],
                    ],
                ],
            ],
        ];
    }

    private function webinarTemplate(): array
    {
        $theme = [
            'fontFamily' => 'Inter',
            'primaryColor' => '#0EA5E9',
            'backgroundColor' => '#FFFFFF',
            'textColor' => '#0F172A',
            'radius' => '16px',
        ];

        // A webinar two weeks in the future gives the countdown something to count down to
        // in the seeded preview. Hosts replace it with their real event date.
        $targetDate = now()->addDays(14)->setTime(20, 0, 0)->toIso8601String();

        return [
            'name' => 'Webinar ao Vivo',
            'slug' => 'webinar-ao-vivo',
            'description' => 'Inscrições para um webinar ao vivo com contagem regressiva e captura de leads.',
            'category' => 'webinar',
            'preview_image' => '/storage/templates/webinar-ao-vivo.png',
            'is_active' => true,
            'sort_order' => 40,
            'structure_json' => [
                'version' => 1,
                'page' => ['title' => 'Webinar ao Vivo', 'type' => 'webinar'],
                'theme' => $theme,
                'sections' => [
                    [
                        'id' => 'hero-1',
                        'type' => 'hero',
                        'props' => [
                            'headline' => 'Webinar ao vivo e gratuito',
                            'subheadline' => 'Participe e aprenda o que tem funcionado agora com quem está na prática.',
                            'buttonText' => 'Quero participar',
                            'buttonLink' => '#inscricao',
                        ],
                    ],
                    [
                        'id' => 'countdown-1',
                        'type' => 'countdown',
                        'props' => [
                            'title' => 'Faltam poucos dias',
                            'subtitle' => 'As vagas são limitadas. Garanta a sua agora.',
                            'targetDate' => $targetDate,
                        ],
                    ],
                    [
                        'id' => 'features-1',
                        'type' => 'features',
                        'props' => [
                            'title' => 'O que você vai aprender ao vivo',
                            'items' => [
                                ['icon' => 'zap', 'title' => 'Estratégias atuais', 'description' => 'O que está funcionando agora, sem enrolação.'],
                                ['icon' => 'users', 'title' => 'Tira-dúvidas ao vivo', 'description' => 'Traga suas perguntas — vamos responder em tempo real.'],
                                ['icon' => 'check', 'title' => 'Material de apoio', 'description' => 'Receba os slides e bônus após a transmissão.'],
                            ],
                        ],
                    ],
                    [
                        'id' => 'testimonial-1',
                        'type' => 'testimonial',
                        'props' => [
                            'title' => 'O que dizem quem já participou',
                            'items' => [
                                ['quote' => 'Conteúdo denso e aplicável. Saí com um plano de ação na mão.', 'name' => 'Luana Dias', 'role' => 'Participante'],
                                ['quote' => 'Webinar mais objetivo que já assisti na minha área.', 'name' => 'Felipe Araújo', 'role' => 'Participante'],
                            ],
                        ],
                    ],
                    [
                        'id' => 'form-1',
                        'type' => 'form',
                        'props' => [
                            'title' => 'Garanta sua inscrição',
                            'subtitle' => 'Preencha os dados e receba o link de acesso por e-mail.',
                            'buttonText' => 'Quero minha vaga',
                            'action' => '#',
                            'fields' => [
                                ['name' => 'name', 'label' => 'Nome completo', 'type' => 'text', 'required' => true],
                                ['name' => 'email', 'label' => 'Melhor e-mail', 'type' => 'email', 'required' => true],
                                ['name' => 'phone', 'label' => 'WhatsApp', 'type' => 'tel', 'required' => false],
                            ],
                        ],
                    ],
                    [
                        'id' => 'footer-1',
                        'type' => 'footer',
                        'props' => [
                            'text' => '© ' . date('Y') . ' — Transmissão online e gratuita',
                            'powered_by' => 'Ximples',
                        ],
                    ],
                ],
            ],
        ];
    }

    private function institutionalTemplate(): array
    {
        $theme = [
            'fontFamily' => 'Inter',
            'primaryColor' => '#183A6B',
            'backgroundColor' => '#FFFFFF',
            'textColor' => '#0F172A',
            'radius' => '14px',
        ];

        return [
            'name' => 'Institucional — Página Simples',
            'slug' => 'institucional-simples',
            'description' => 'Página institucional limpa para apresentar empresa, serviço ou projeto.',
            'category' => 'institucional',
            'preview_image' => '/storage/templates/institucional-simples.png',
            'is_active' => true,
            'sort_order' => 50,
            'structure_json' => [
                'version' => 1,
                'page' => ['title' => 'Institucional — Página Simples', 'type' => 'landing'],
                'theme' => $theme,
                'sections' => [
                    [
                        'id' => 'hero-1',
                        'type' => 'hero',
                        'props' => [
                            'headline' => 'Soluções que aproximam pessoas e negócios',
                            'subheadline' => 'Conheça nosso trabalho e descubra como podemos ajudar sua empresa a crescer.',
                            'buttonText' => 'Fale com a gente',
                            'buttonLink' => '#contato',
                        ],
                    ],
                    [
                        'id' => 'text-1',
                        'type' => 'text',
                        'props' => [
                            'title' => 'Sobre nós',
                            'content' => 'Somos uma empresa comprometida em entregar valor real aos nossos clientes. Nossa missão é simplificar processos, elevar resultados e construir relações de longo prazo com quem confia no nosso trabalho.',
                        ],
                    ],
                    [
                        'id' => 'features-1',
                        'type' => 'features',
                        'props' => [
                            'title' => 'O que oferecemos',
                            'items' => [
                                ['icon' => 'users', 'title' => 'Atendimento próximo', 'description' => 'Uma equipe dedicada a entender cada necessidade.'],
                                ['icon' => 'shield', 'title' => 'Confiabilidade', 'description' => 'Processos sólidos e entregas previsíveis.'],
                                ['icon' => 'globe', 'title' => 'Alcance amplo', 'description' => 'Atuação em todo o Brasil, com foco no digital.'],
                            ],
                        ],
                    ],
                    [
                        'id' => 'cta-1',
                        'type' => 'cta',
                        'props' => [
                            'title' => 'Vamos conversar?',
                            'subtitle' => 'Entre em contato e descubra como podemos caminhar juntos.',
                            'buttonText' => 'Entrar em contato',
                            'buttonLink' => '#contato',
                        ],
                    ],
                    [
                        'id' => 'footer-1',
                        'type' => 'footer',
                        'props' => [
                            'text' => '© ' . date('Y') . ' — Todos os direitos reservados',
                            'powered_by' => 'Ximples',
                        ],
                    ],
                ],
            ],
        ];
    }
}
