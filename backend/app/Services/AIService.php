<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIService
{
    /**
     * Interpret a message with full conversation context.
     *
     * @param string     $message         The latest user message
     * @param array      $history         Previous messages: [['role' => 'user|assistant', 'content' => '...'], ...]
     * @param array|null $templateContext Optional structural descriptor from TemplateService::buildAIContext().
     *                                    When present, the system prompt is augmented with a TEMPLATE MODE block
     *                                    that constrains the AI to fill a specific section skeleton instead of
     *                                    inventing one — used by the /templates → chat flow.
     */
    public static function interpret(string $message, array $history = [], ?array $templateContext = null): array
    {
        $apiKey = config('services.anthropic.api_key');

        if (!$apiKey) {
            return self::fallbackInterpret($message);
        }

        try {
            // Build conversation for Claude
            $messages = [];
            foreach ($history as $msg) {
                $role = $msg['role'] === 'assistant' ? 'assistant' : 'user';
                $messages[] = ['role' => $role, 'content' => $msg['content']];
            }
            // Add the new message
            $messages[] = ['role' => 'user', 'content' => $message];

            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json',
            ])->timeout(45)->post('https://api.anthropic.com/v1/messages', [
                'model' => 'claude-sonnet-4-20250514',
                'max_tokens' => 1500,
                'system' => self::getSystemPrompt($templateContext),
                'messages' => $messages,
            ]);

            if (!$response->successful()) {
                Log::warning('Anthropic API error', ['status' => $response->status(), 'body' => $response->body()]);
                return self::fallbackInterpret($message);
            }

            $content = $response->json('content.0.text', '');

            return self::parseAIResponse($content, $message);
        } catch (\Throwable $e) {
            Log::warning('Anthropic API exception', ['error' => $e->getMessage()]);
            return self::fallbackInterpret($message);
        }
    }

    private static function getSystemPrompt(?array $templateContext = null): string
    {
        $base = self::baseSystemPrompt();

        if ($templateContext) {
            return $base . "\n\n" . self::templateModePrompt($templateContext);
        }

        return $base;
    }

    private static function baseSystemPrompt(): string
    {
        return <<<'PROMPT'
Você é o **Ximples**, um operador digital de marketing que conversa com o usuário para entender o que ele precisa e depois executa ações automatizadas.

# COMO VOCÊ FUNCIONA

Você trabalha em **duas fases**:

## FASE 1 — INVESTIGAÇÃO (perguntar antes de agir)
Quando o usuário pede algo (ex: "quero uma landing page"), você NÃO gera imediatamente.
Primeiro, faça perguntas para entender:
- Qual é o produto/serviço?
- Quem é o público-alvo?
- Qual o objetivo principal? (captar leads, vender, informar)
- Qual o tom desejado? (formal, descontraído, urgente)
- Algum detalhe específico? (cores, textos, ofertas)

Faça 2-4 perguntas objetivas por vez. Não faça 10 perguntas de uma vez.

## FASE 2 — EXECUÇÃO (gerar quando tiver informação suficiente)
Quando você já tiver contexto suficiente da conversa (o usuário já respondeu suas perguntas ou deu detalhes claros), aí sim gere as ações.

# COMO DECIDIR ENTRE FASE 1 E FASE 2

Analise o **histórico completo** da conversa. Se:
- O usuário acabou de pedir algo genérico ("crie uma landing page") → FASE 1 (perguntar)
- O usuário já deu vários detalhes nas mensagens anteriores → FASE 2 (executar)
- O usuário diz "pode gerar", "vai em frente", "pode fazer", "tá bom" → FASE 2 (executar com o que tem)
- O usuário deu detalhes ricos logo na primeira mensagem (produto, público, objetivo) → FASE 2 (executar)

# FORMATO DE RESPOSTA

Responda SEMPRE com JSON válido:

```json
{
  "intent": "nome_da_intencao",
  "message": "Sua resposta conversacional em português",
  "actions": []
}
```

## Quando estiver na FASE 1 (perguntando):
- intent: "gathering_info"
- message: sua pergunta conversacional
- actions: [] (vazio — nenhuma ação é executada)

## Quando estiver na FASE 2 (executando):
Use uma destas intenções com actions preenchidas:

- intent: "create_landing_page"
  actions: [{"type": "landing_page", "input": {
    "title": "título baseado no contexto",
    "type": "landing",
    "headline": "headline principal impactante",
    "subheadline": "subtítulo explicativo",
    "cta_text": "texto do botão principal",
    "features_title": "título da seção de benefícios",
    "features": [
      {"icon": "zap", "title": "Benefício 1", "description": "Descrição do benefício"},
      {"icon": "shield", "title": "Benefício 2", "description": "Descrição do benefício"},
      {"icon": "trending-up", "title": "Benefício 3", "description": "Descrição do benefício"}
    ],
    "faq": [
      {"question": "Pergunta frequente?", "answer": "Resposta detalhada."}
    ],
    "testimonials": [
      {"quote": "Depoimento do cliente.", "name": "Nome", "role": "Cargo"}
    ],
    "cta_title": "Título do CTA final",
    "cta_subtitle": "Subtítulo do CTA",
    "cta_button_text": "Texto do botão CTA",
    "meta_title": "Título para SEO",
    "meta_description": "Descrição para SEO com até 160 caracteres",
    "theme": {
      "fontFamily": "Inter",
      "primaryColor": "#183A6B",
      "backgroundColor": "#FFFFFF",
      "textColor": "#0F172A",
      "radius": "16px"
    }
  }}]
  IMPORTANTE: Preencha TODOS os campos com conteúdo real baseado no contexto da conversa. Ícones válidos: zap, shield, trending-up, star, heart, target, check, clock, users, globe. Inclua pelo menos 3 features, 2-3 FAQs e 2-3 testimonials quando possível.

- intent: "create_email_campaign"
  actions: [{"type": "email_campaign", "input": {"subject": "assunto baseado no contexto", "emails_count": 3-7}}]

- intent: "create_whatsapp_flow"
  actions: [{"type": "whatsapp_flow", "input": {"flow_name": "nome baseado no contexto", "messages_count": 3-7}}]

- intent: "create_crm_pipeline"
  actions: [{"type": "crm_pipeline", "input": {"pipeline_name": "nome baseado no contexto", "stages": 4-6}}]

- intent: "create_funnel"
  actions: combinação de landing_page + email_campaign + whatsapp_flow

- intent: "general_help"
  actions: [] (para saudações ou perguntas fora do escopo)

## Inputs ricos
Quando gerar ações, use TODA a informação coletada na conversa para preencher os inputs de forma detalhada. O título deve refletir o produto real, não ser genérico.

# REGRAS
- Sempre responda em português brasileiro
- Seja amigável, profissional e direto
- Na fase de investigação, seja conversacional e breve
- Na fase de execução, confirme o que vai ser feito
- Se o usuário pedir algo fora do escopo, explique o que você pode fazer
- Responda SOMENTE o JSON, sem markdown, sem texto extra
PROMPT;
    }

    /**
     * Extra instructions appended to the system prompt when the user has selected
     * a template. Forces the AI to fill the provided section skeleton instead of
     * inventing a new structure.
     *
     * @param array $context Output of TemplateService::buildAIContext()
     */
    private static function templateModePrompt(array $context): string
    {
        $name = $context['template_name'] ?? 'Template';
        $category = $context['template_category'] ?? 'landing';
        $sections = $context['sections'] ?? [];
        $sectionsJson = json_encode($sections, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) ?: '[]';

        return <<<PROMPT
# MODO TEMPLATE — IMPORTANTE

O usuário selecionou o template **{$name}** (categoria: {$category}).
Neste modo, você NÃO deve inventar uma nova estrutura de página: a estrutura já está definida abaixo.

Sua tarefa é adaptar o CONTEÚDO de cada seção para o nicho/produto descrito pelo usuário, mantendo:
- A mesma lista de seções, na mesma ordem e com os mesmos `id` e `type`.
- A mesma quantidade de itens em listas (features, pricing, testimonials, faq, form fields).
- Textos curtos, em português brasileiro, orientados a conversão.

## Estrutura do template (não altere ids nem tipos)

```json
{$sectionsJson}
```

## Como responder quando estiver pronto para gerar

Use `intent: "create_landing_page"` e a action `landing_page` com o `input` contendo um campo especial `template_sections` (mapa id → overrides de props). Cada override deve conter apenas os campos do template (veja `fields` acima). Exemplo:

```json
{
  "intent": "create_landing_page",
  "message": "Gerei sua landing com o template {$name} adaptado ao seu negócio.",
  "actions": [{
    "type": "landing_page",
    "input": {
      "title": "Título baseado no contexto",
      "meta_title": "SEO title",
      "meta_description": "SEO description",
      "template_sections": {
        "hero-1": {
          "headline": "Headline adaptada ao produto do usuário",
          "subheadline": "Subheadline com benefício concreto",
          "buttonText": "Quero agora",
          "buttonLink": "#oferta"
        },
        "features-1": {
          "title": "Por que escolher",
          "items": [
            {"icon": "zap", "title": "...", "description": "..."},
            {"icon": "shield", "title": "...", "description": "..."},
            {"icon": "trending-up", "title": "...", "description": "..."}
          ]
        }
      }
    }
  }]
}
```

REGRAS DO MODO TEMPLATE:
- NÃO inclua um campo `sections` no input — use SEMPRE `template_sections` (por id).
- NÃO altere os `id`/`type` das seções.
- Use EXATAMENTE os ids listados na estrutura acima; não invente novos.
- Mantenha a mesma quantidade de itens em cada lista.
- Ícones válidos em features: zap, shield, trending-up, star, heart, target, check, clock, users, globe.
- Ainda vale a FASE 1 / FASE 2: se faltar contexto, faça perguntas (`gathering_info`) antes de gerar.
PROMPT;
    }

    private static function parseAIResponse(string $content, string $originalMessage): array
    {
        $content = trim($content);

        // Remove markdown code fences if present
        if (str_starts_with($content, '```')) {
            $content = preg_replace('/^```(?:json)?\s*/', '', $content);
            $content = preg_replace('/\s*```$/', '', $content);
        }

        $parsed = json_decode($content, true);

        if (!$parsed || !isset($parsed['intent'])) {
            Log::warning('Failed to parse AI response', ['content' => $content]);
            return self::fallbackInterpret($originalMessage);
        }

        return [
            'intent'  => $parsed['intent'] ?? 'general_help',
            'message' => $parsed['message'] ?? 'Entendido! Estou processando sua solicitação.',
            'actions' => $parsed['actions'] ?? [],
        ];
    }

    /**
     * Generate an improved copy variant based on an existing piece of copy,
     * its audience/product context, and recent performance metrics.
     *
     * Always returns an array shaped as:
     *   [
     *     'summary'        => string,
     *     'reasoning'      => string[],
     *     'suggested_copy' => string,
     *   ]
     *
     * Falls back to a rule-based rewrite when the Anthropic API is
     * unavailable so the feature keeps working in dev/offline envs.
     *
     * @param  array  $context  Keys: suggestion_type, original_copy, goal?,
     *                          audience?, product?, tone?, performance?, extras?
     */
    public static function generateCopy(array $context): array
    {
        $apiKey = config('services.anthropic.api_key');

        if (!$apiKey) {
            return self::fallbackGenerateCopy($context);
        }

        try {
            $userPrompt = self::buildCopyUserPrompt($context);

            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json',
            ])->timeout(45)->post('https://api.anthropic.com/v1/messages', [
                'model'      => 'claude-sonnet-4-20250514',
                'max_tokens' => 1200,
                'system'     => self::getCopySystemPrompt(),
                'messages'   => [
                    ['role' => 'user', 'content' => $userPrompt],
                ],
            ]);

            if (!$response->successful()) {
                Log::warning('Anthropic copy API error', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return self::fallbackGenerateCopy($context);
            }

            $content = (string) $response->json('content.0.text', '');
            return self::parseCopyAIResponse($content, $context);
        } catch (\Throwable $e) {
            Log::warning('Anthropic copy API exception', ['error' => $e->getMessage()]);
            return self::fallbackGenerateCopy($context);
        }
    }

    private static function getCopySystemPrompt(): string
    {
        return <<<'PROMPT'
Você é um copywriter sênior brasileiro especializado em marketing de performance.
Sua função é reescrever um trecho de copy para AUMENTAR a taxa de conversão,
usando dados reais de performance fornecidos pelo usuário.

Princípios:
- Escreva em português brasileiro natural e direto
- Clareza > criatividade. Benefício > feature.
- Preserve placeholders como {{name}}, {{link}}, {{phone}} se existirem no original
- Adapte ao tipo pedido (headline, cta, message_opening, body, etc)
- Respeite limites de tamanho típicos do canal:
  * headline: 5-12 palavras
  * subheadline: 10-25 palavras
  * cta: 2-5 palavras, verbo no imperativo
  * message_opening: 1-2 frases, personalizada
  * body: 2-5 frases
  * full_message: mensagem WhatsApp completa curta (até ~400 chars)
- Seja específico quando houver números de performance disponíveis

Responda EXCLUSIVAMENTE com um objeto JSON válido, sem markdown, sem prefácio,
no seguinte formato:

{
  "summary": "Resumo curto (1 frase) do porquê a copy atual pode estar performando mal.",
  "reasoning": [
    "ponto curto 1",
    "ponto curto 2",
    "ponto curto 3"
  ],
  "suggested_copy": "A nova copy, já pronta para ser aplicada."
}
PROMPT;
    }

    private static function buildCopyUserPrompt(array $context): string
    {
        $type = $context['suggestion_type'] ?? 'full_message';
        $original = trim((string) ($context['original_copy'] ?? ''));
        $goal = $context['goal'] ?? 'aumentar conversão';
        $audience = $context['audience'] ?? 'público geral';
        $product = $context['product'] ?? '';
        $tone = $context['tone'] ?? 'direto, confiável, próximo';
        $performance = $context['performance'] ?? [];
        $extras = $context['extras'] ?? [];

        $performanceBlock = json_encode($performance, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) ?: '{}';
        $extrasBlock = json_encode($extras, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) ?: '{}';

        return <<<PROMPT
Reescreva o trecho de copy abaixo para maximizar conversão.

Tipo de copy: {$type}
Objetivo: {$goal}
Público-alvo: {$audience}
Produto/serviço: {$product}
Tom desejado: {$tone}

=== COPY ORIGINAL ===
{$original}
=== FIM DA COPY ===

Métricas de performance atuais (reais do sistema):
{$performanceBlock}

Contexto adicional:
{$extrasBlock}

Gere UMA nova versão da copy, já pronta para uso, seguindo o JSON especificado.
PROMPT;
    }

    private static function parseCopyAIResponse(string $content, array $context): array
    {
        $content = trim($content);
        if (str_starts_with($content, '```')) {
            $content = (string) preg_replace('/^```(?:json)?\s*/', '', $content);
            $content = (string) preg_replace('/\s*```$/', '', $content);
        }

        $parsed = json_decode($content, true);

        if (!is_array($parsed) || empty($parsed['suggested_copy'])) {
            Log::warning('Failed to parse copy AI response', ['content' => $content]);
            return self::fallbackGenerateCopy($context);
        }

        return [
            'summary'        => (string) ($parsed['summary'] ?? ''),
            'reasoning'      => is_array($parsed['reasoning'] ?? null) ? array_values($parsed['reasoning']) : [],
            'suggested_copy' => trim((string) $parsed['suggested_copy']),
        ];
    }

    /**
     * Rule-based fallback so the feature remains usable without an API key.
     * Produces a deterministic rewrite that tightens and personalises the copy.
     */
    public static function fallbackGenerateCopy(array $context): array
    {
        $type = $context['suggestion_type'] ?? 'full_message';
        $original = trim((string) ($context['original_copy'] ?? ''));
        $perf = $context['performance'] ?? [];

        $reasoning = [];
        if (($perf['ctr'] ?? null) !== null && (float) $perf['ctr'] < 10) {
            $reasoning[] = 'CTR baixo indica que a abertura não gera cliques suficientes.';
        }
        if (($perf['conversion_rate'] ?? null) !== null && (float) $perf['conversion_rate'] < 5) {
            $reasoning[] = 'Taxa de conversão baixa sugere CTA pouco claro ou proposta pouco específica.';
        }
        if (strlen($original) > 400) {
            $reasoning[] = 'A mensagem está longa demais — mensagens curtas costumam performar melhor.';
        }
        if (!str_contains($original, '{{name}}') && in_array($type, ['message_opening', 'full_message', 'body'], true)) {
            $reasoning[] = 'A copy não usa personalização ({{name}}), o que reduz a taxa de resposta.';
        }
        if (empty($reasoning)) {
            $reasoning[] = 'Pode ser reescrita de forma mais direta e com benefício mais explícito.';
        }

        $suggested = match ($type) {
            'headline'        => 'Descubra como resolver isso em minutos',
            'subheadline'     => 'A forma mais simples de obter resultados reais — sem complicação.',
            'cta'             => 'Quero começar agora',
            'message_opening' => 'Olá {{name}}, tenho algo rápido e útil para te mostrar hoje.',
            'body'            => "Olá {{name}}, separei uma solução prática que pode te trazer resultado ainda esta semana. Clique e veja em 1 minuto: {{link}}",
            default           => "Olá {{name}}, separei uma oportunidade prática que pode gerar um resultado rápido para você. Dá uma olhada: {{link}}",
        };

        return [
            'summary'        => 'Copy atual é genérica e pode ser mais direta, personalizada e orientada a benefício.',
            'reasoning'      => $reasoning,
            'suggested_copy' => $suggested,
        ];
    }

    public static function fallbackInterpret(string $message): array
    {
        $message = mb_strtolower($message);

        if (str_contains($message, 'funil') || str_contains($message, 'funnel')) {
            return [
                'intent' => 'gathering_info',
                'message' => 'Legal, você quer criar um funil de vendas! Para montar algo eficiente, preciso entender melhor. Me conta: qual é o seu produto ou serviço? E quem é o público que você quer atingir?',
                'actions' => [],
            ];
        }

        if (str_contains($message, 'landing') || str_contains($message, 'página')) {
            return [
                'intent' => 'gathering_info',
                'message' => 'Ótimo, vamos criar uma landing page! Para fazer algo que converta de verdade, me responde: qual produto ou serviço essa página vai promover? E qual o principal objetivo — captar leads, vender diretamente ou apresentar algo?',
                'actions' => [],
            ];
        }

        if (str_contains($message, 'email') || str_contains($message, 'campanha')) {
            return [
                'intent' => 'gathering_info',
                'message' => 'Vamos montar uma campanha de email! Me conta: qual é o objetivo dessa campanha? E para quem ela será enviada?',
                'actions' => [],
            ];
        }

        if (str_contains($message, 'whatsapp') || str_contains($message, 'zap')) {
            return [
                'intent' => 'gathering_info',
                'message' => 'Vamos criar um fluxo de WhatsApp! Para qual situação — follow-up de leads, pós-venda, promoção? E qual é o produto ou serviço?',
                'actions' => [],
            ];
        }

        if (str_contains($message, 'crm') || str_contains($message, 'pipeline') || str_contains($message, 'vendas')) {
            return [
                'intent' => 'gathering_info',
                'message' => 'Vamos configurar seu pipeline de vendas! Me diz: qual é o seu tipo de negócio e como funciona seu processo comercial hoje?',
                'actions' => [],
            ];
        }

        return [
            'intent' => 'general_help',
            'message' => 'Olá! Sou o Ximples, seu operador digital de marketing. Posso criar landing pages, campanhas de email, fluxos de WhatsApp e funis de vendas. O que você gostaria de fazer?',
            'actions' => [],
        ];
    }
}
