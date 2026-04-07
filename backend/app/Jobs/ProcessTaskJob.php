<?php

namespace App\Jobs;

use App\Models\Asset;
use App\Models\Milestone;
use App\Models\Task;
use App\Services\PageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessTaskJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Task $task,
    ) {}

    public function handle(): void
    {
        $this->task->update(['status' => 'processing']);

        try {
            $chat = $this->task->chat;
            $tenantId = $chat->tenant_id;
            $input = $this->task->input ?? [];

            match ($this->task->type) {
                'landing_page' => $this->processLandingPage($chat->id, $tenantId, $input),
                'email_campaign' => $this->processEmailCampaign($chat->id, $tenantId, $input),
                'whatsapp_flow' => $this->processWhatsAppFlow($chat->id, $tenantId, $input),
                'crm_pipeline' => $this->processCrmPipeline($chat->id, $tenantId, $input),
                default => null,
            };

            $this->task->update(['status' => 'done']);
            $this->updateMilestone($chat->id, $tenantId);
        } catch (\Throwable $e) {
            $this->task->update([
                'status' => 'failed',
                'output' => ['error' => $e->getMessage()],
            ]);
            \Illuminate\Support\Facades\Log::error('ProcessTaskJob failed', [
                'task_id' => $this->task->id,
                'type' => $this->task->type,
                'error' => $e->getMessage(),
            ]);
            $this->fail($e);
        }
    }

    private function processLandingPage(int $chatId, string $tenantId, array $input): void
    {
        $title = $input['title'] ?? 'Landing Page';

        // Build structured sections from AI input
        $sections = $this->buildPageSections($input);
        $theme = $input['theme'] ?? [
            'fontFamily' => 'Inter',
            'primaryColor' => '#183A6B',
            'backgroundColor' => '#FFFFFF',
            'textColor' => '#0F172A',
            'radius' => '16px',
        ];

        // Create asset with structured content
        $asset = Asset::create([
            'chat_id' => $chatId,
            'tenant_id' => $tenantId,
            'type' => 'landing',
            'name' => $title,
            'content' => [
                'type' => $input['type'] ?? 'landing',
                'theme' => $theme,
                'sections' => $sections,
                'meta_title' => $input['meta_title'] ?? $title,
                'meta_description' => $input['meta_description'] ?? null,
            ],
            'status' => 'ready',
        ]);

        // Create public page
        $pageService = app(PageService::class);
        $chat = $this->task->chat;
        $page = $pageService->createFromAsset($asset, $chat->user_id, $tenantId);

        // Attribute the page to the source template if the chat flow passed one through.
        if (!empty($input['template_id'])) {
            $page->forceFill(['template_id' => (int) $input['template_id']])->save();
        }

        $this->task->update([
            'output' => [
                'asset_type' => 'landing',
                'title' => $title,
                'page_id' => $page->id,
                'page_slug' => $page->slug,
                'page_url' => $page->getPublicUrl(),
                'preview_url' => $page->getPreviewUrl(),
                'template_id' => $input['template_id'] ?? null,
            ],
        ]);
    }

    /**
     * Build structured page sections from AI input.
     */
    private function buildPageSections(array $input): array
    {
        $title = $input['title'] ?? 'Landing Page';
        $sections = [];

        // If AI already provided structured sections, use them directly
        if (!empty($input['sections']) && is_array($input['sections'])) {
            return $input['sections'];
        }

        // Hero
        $sections[] = [
            'id' => 'hero-1',
            'type' => 'hero',
            'props' => [
                'headline' => $input['headline'] ?? $title,
                'subheadline' => $input['subheadline'] ?? 'Descubra como nossa solução pode transformar seus resultados.',
                'buttonText' => $input['cta_text'] ?? 'Começar Agora',
                'buttonLink' => $input['cta_url'] ?? '#cta',
            ],
        ];

        // Features/Benefits
        $features = $input['features'] ?? [
            ['icon' => 'zap', 'title' => 'Rápido e eficiente', 'description' => 'Resultados visíveis em poucos dias.'],
            ['icon' => 'shield', 'title' => 'Seguro e confiável', 'description' => 'Seus dados protegidos com a melhor tecnologia.'],
            ['icon' => 'trending-up', 'title' => 'Crescimento real', 'description' => 'Aumente suas conversões em até 300%.'],
        ];

        $sections[] = [
            'id' => 'features-1',
            'type' => 'features',
            'props' => [
                'title' => $input['features_title'] ?? 'Por que escolher?',
                'items' => $features,
            ],
        ];

        // Testimonials (if provided)
        if (!empty($input['testimonials'])) {
            $sections[] = [
                'id' => 'testimonial-1',
                'type' => 'testimonial',
                'props' => [
                    'title' => 'O que dizem nossos clientes',
                    'items' => $input['testimonials'],
                ],
            ];
        }

        // FAQ (if provided)
        if (!empty($input['faq'])) {
            $sections[] = [
                'id' => 'faq-1',
                'type' => 'faq',
                'props' => [
                    'title' => 'Perguntas Frequentes',
                    'items' => $input['faq'],
                ],
            ];
        }

        // CTA
        $sections[] = [
            'id' => 'cta-1',
            'type' => 'cta',
            'props' => [
                'title' => $input['cta_title'] ?? 'Pronto para começar?',
                'subtitle' => $input['cta_subtitle'] ?? 'Entre em contato e descubra como podemos ajudar.',
                'buttonText' => $input['cta_button_text'] ?? 'Fale Conosco',
                'buttonLink' => $input['cta_button_link'] ?? '#contato',
            ],
        ];

        // Footer
        $sections[] = [
            'id' => 'footer-1',
            'type' => 'footer',
            'props' => [
                'text' => '© ' . date('Y') . ' ' . ($input['company'] ?? '') . ' - Todos os direitos reservados',
                'powered_by' => 'Ximples',
            ],
        ];

        return $sections;
    }

    private function processEmailCampaign(int $chatId, string $tenantId, array $input): void
    {
        $subject = $input['subject'] ?? 'Campanha de Email';
        $count = $input['emails_count'] ?? 3;

        $emails = [];
        for ($i = 1; $i <= $count; $i++) {
            $emails[] = [
                'sequence' => $i,
                'subject' => "{$subject} - Email {$i}",
                'body' => "Olá {{nome}},\n\nEste é o email {$i} da sua sequência \"{$subject}\".\n\nConteúdo personalizado para engajar seu lead e avançar no funil de vendas.\n\nAbraços,\nEquipe Ximples",
                'delay_hours' => ($i - 1) * 24,
            ];
        }

        Asset::create([
            'chat_id' => $chatId,
            'tenant_id' => $tenantId,
            'type' => 'email',
            'name' => $subject,
            'content' => ['emails' => $emails],
            'status' => 'ready',
        ]);

        $this->task->update([
            'output' => ['asset_type' => 'email', 'subject' => $subject, 'emails_count' => $count],
        ]);
    }

    private function processWhatsAppFlow(int $chatId, string $tenantId, array $input): void
    {
        $flowName = $input['flow_name'] ?? 'Fluxo WhatsApp';
        $count = $input['messages_count'] ?? 5;

        $messages = [];
        $templates = [
            'Olá {{nome}}! Tudo bem? Vi que você se interessou pelo nosso produto. Posso te ajudar?',
            'Oi {{nome}}! Só passando para lembrar da nossa oferta especial. Ainda está disponível!',
            '{{nome}}, temos uma condição exclusiva para você. Quer saber mais?',
            'Última chance, {{nome}}! Nossa promoção encerra hoje. Não perca!',
            '{{nome}}, obrigado pelo seu interesse! Estamos aqui para qualquer dúvida.',
        ];

        for ($i = 0; $i < $count; $i++) {
            $messages[] = [
                'sequence' => $i + 1,
                'text' => $templates[$i % count($templates)],
                'delay_hours' => $i * 24,
                'type' => 'text',
            ];
        }

        Asset::create([
            'chat_id' => $chatId,
            'tenant_id' => $tenantId,
            'type' => 'whatsapp',
            'name' => $flowName,
            'content' => ['messages' => $messages],
            'status' => 'ready',
        ]);

        $this->task->update([
            'output' => ['asset_type' => 'whatsapp', 'flow_name' => $flowName, 'messages_count' => $count],
        ]);
    }

    private function processCrmPipeline(int $chatId, string $tenantId, array $input): void
    {
        $pipelineName = $input['pipeline_name'] ?? 'Pipeline de Vendas';
        $stagesCount = $input['stages'] ?? 5;

        $defaultStages = [
            ['name' => 'Novo Lead', 'order' => 1, 'color' => '#3B82F6'],
            ['name' => 'Qualificação', 'order' => 2, 'color' => '#F59E0B'],
            ['name' => 'Proposta Enviada', 'order' => 3, 'color' => '#8B5CF6'],
            ['name' => 'Negociação', 'order' => 4, 'color' => '#F97316'],
            ['name' => 'Fechado/Ganho', 'order' => 5, 'color' => '#10B981'],
        ];

        $stages = array_slice($defaultStages, 0, $stagesCount);

        Asset::create([
            'chat_id' => $chatId,
            'tenant_id' => $tenantId,
            'type' => 'crm',
            'name' => $pipelineName,
            'content' => ['stages' => $stages],
            'status' => 'ready',
        ]);

        $this->task->update([
            'output' => ['asset_type' => 'crm', 'pipeline_name' => $pipelineName, 'stages_count' => $stagesCount],
        ]);
    }

    private function updateMilestone(int $chatId, string $tenantId): void
    {
        $milestone = Milestone::firstOrCreate(
            [
                'chat_id' => $chatId,
                'tenant_id' => $tenantId,
                'status' => 'in_progress',
            ],
            [
                'title' => 'Processando tarefas',
                'description' => 'Gerando assets automaticamente a partir das tarefas do chat.',
                'progress' => 0,
            ],
        );

        $totalTasks = Task::where('chat_id', $chatId)->count();
        $doneTasks = Task::where('chat_id', $chatId)->where('status', 'done')->count();
        $progress = $totalTasks > 0 ? (int) round(($doneTasks / $totalTasks) * 100) : 0;

        $milestone->update([
            'progress' => $progress,
            'status' => $progress >= 100 ? 'completed' : 'in_progress',
        ]);
    }
}
