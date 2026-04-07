<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\Chat;
use App\Models\Message;
use App\Models\Milestone;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $tenantId = '11111111-1111-1111-1111-111111111111';

        $user = User::create([
            'name' => 'Admin Ximples',
            'email' => 'admin@ximples.com.br',
            'password' => Hash::make('password'),
            'tenant_id' => $tenantId,
        ]);

        $chat = Chat::create([
            'user_id' => $user->id,
            'tenant_id' => $tenantId,
            'title' => 'Meu primeiro funil',
        ]);

        // Messages
        Message::create([
            'chat_id' => $chat->id,
            'role' => 'user',
            'content' => 'Quero criar um funil de vendas completo com landing page, emails e WhatsApp.',
            'metadata' => null,
        ]);

        Message::create([
            'chat_id' => $chat->id,
            'role' => 'assistant',
            'content' => 'Vou criar um funil completo para você com landing page, sequência de emails e mensagens de WhatsApp.',
            'metadata' => [
                'intent' => 'create_funnel',
                'actions_count' => 3,
            ],
        ]);

        Message::create([
            'chat_id' => $chat->id,
            'role' => 'user',
            'content' => 'Obrigado! Ficou ótimo.',
            'metadata' => null,
        ]);

        // Milestones
        Milestone::create([
            'chat_id' => $chat->id,
            'tenant_id' => $tenantId,
            'title' => 'Criação do Funil',
            'description' => 'Geração automática de landing page, emails e fluxo de WhatsApp.',
            'status' => 'completed',
            'progress' => 100,
        ]);

        Milestone::create([
            'chat_id' => $chat->id,
            'tenant_id' => $tenantId,
            'title' => 'Otimização de Conversão',
            'description' => 'Ajustes finos para melhorar taxa de conversão do funil.',
            'status' => 'in_progress',
            'progress' => 40,
        ]);

        // Assets
        Asset::create([
            'chat_id' => $chat->id,
            'tenant_id' => $tenantId,
            'type' => 'landing',
            'name' => 'Landing Page do Funil',
            'content' => [
                'html' => '<html><body><h1>Landing Page do Funil</h1></body></html>',
                'template' => 'conversion',
            ],
            'status' => 'ready',
        ]);

        Asset::create([
            'chat_id' => $chat->id,
            'tenant_id' => $tenantId,
            'type' => 'email',
            'name' => 'Sequência de Email',
            'content' => [
                'emails' => [
                    ['sequence' => 1, 'subject' => 'Bem-vindo!', 'body' => 'Olá {{nome}}, seja bem-vindo!'],
                    ['sequence' => 2, 'subject' => 'Dica especial', 'body' => 'Olá {{nome}}, temos uma dica para você.'],
                    ['sequence' => 3, 'subject' => 'Oferta exclusiva', 'body' => 'Olá {{nome}}, aproveite nossa oferta.'],
                ],
            ],
            'status' => 'ready',
        ]);

        Asset::create([
            'chat_id' => $chat->id,
            'tenant_id' => $tenantId,
            'type' => 'whatsapp',
            'name' => 'Follow-up WhatsApp',
            'content' => [
                'messages' => [
                    ['sequence' => 1, 'text' => 'Olá {{nome}}! Tudo bem?', 'delay_hours' => 0],
                    ['sequence' => 2, 'text' => '{{nome}}, viu nossa oferta?', 'delay_hours' => 24],
                    ['sequence' => 3, 'text' => 'Última chance, {{nome}}!', 'delay_hours' => 48],
                ],
            ],
            'status' => 'ready',
        ]);

        // Tasks
        Task::create([
            'chat_id' => $chat->id,
            'tenant_id' => $tenantId,
            'type' => 'landing_page',
            'status' => 'done',
            'input' => ['title' => 'Landing Page do Funil', 'template' => 'conversion'],
            'output' => ['asset_type' => 'landing', 'title' => 'Landing Page do Funil'],
        ]);

        Task::create([
            'chat_id' => $chat->id,
            'tenant_id' => $tenantId,
            'type' => 'email_campaign',
            'status' => 'done',
            'input' => ['subject' => 'Sequência de Email', 'emails_count' => 3],
            'output' => ['asset_type' => 'email', 'subject' => 'Sequência de Email', 'emails_count' => 3],
        ]);

        // Token wallet for admin user
        \App\Models\TokenWallet::create([
            'user_id' => $user->id,
            'tenant_id' => $tenantId,
            'balance' => 100,
        ]);

        // Token transaction for signup bonus
        \App\Models\TokenTransaction::create([
            'user_id' => $user->id,
            'tenant_id' => $tenantId,
            'type' => 'credit',
            'amount' => 100,
            'source' => 'signup_bonus',
            'description' => 'Bônus de boas-vindas: 100 tokens',
        ]);

        // Token packages
        \App\Models\TokenPackage::create([
            'name' => 'Starter',
            'slug' => 'starter',
            'tokens' => 100,
            'price' => 19.00,
            'currency' => 'BRL',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        \App\Models\TokenPackage::create([
            'name' => 'Growth',
            'slug' => 'growth',
            'tokens' => 300,
            'price' => 39.00,
            'currency' => 'BRL',
            'is_active' => true,
            'sort_order' => 2,
        ]);

        \App\Models\TokenPackage::create([
            'name' => 'Pro',
            'slug' => 'pro',
            'tokens' => 1000,
            'price' => 97.00,
            'currency' => 'BRL',
            'is_active' => true,
            'sort_order' => 3,
        ]);

        // Curated landing page templates (tenant-global).
        $this->call(PageTemplateSeeder::class);
    }
}
