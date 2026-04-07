<?php

use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\AssetController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CampaignController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\ContactController;
use App\Http\Controllers\Api\V1\ContactListController;
use App\Http\Controllers\Api\V1\CopySuggestionController;
use App\Http\Controllers\Api\V1\MilestoneController;
use App\Http\Controllers\Api\V1\PageController;
use App\Http\Controllers\Api\V1\TemplateController;
use App\Http\Controllers\Api\V1\TrackingController;
use App\Http\Controllers\Api\V1\PasswordResetController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\TokenController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Auth (public)
    Route::prefix('auth')->middleware('throttle:10,1')->group(function () {
        Route::post('/signup', [AuthController::class, 'signup']);
        Route::post('/login', [AuthController::class, 'login']);
    });

    // Password reset (public)
    Route::middleware('throttle:5,1')->group(function () {
        Route::post('/password/forgot', [PasswordResetController::class, 'sendResetLink']);
        Route::post('/password/reset', [PasswordResetController::class, 'reset']);
    });

    // Token packages (public)
    Route::get('/tokens/packages', [TokenController::class, 'packages']);

    // Public pages (no auth)
    Route::get('/public/pages/{slug}', [PageController::class, 'showPublic']);

    // Public templates catalog (no auth, rate limited)
    Route::middleware('throttle:60,1')->group(function () {
        Route::get('/templates', [TemplateController::class, 'index']);
        Route::get('/templates/{idOrSlug}', [TemplateController::class, 'show'])
            ->where('idOrSlug', '[A-Za-z0-9_-]+');
    });

    // Stripe webhook (public, no auth)
    Route::post('/webhooks/stripe', [PaymentController::class, 'webhook']);

    // Tracking (public, throttled)
    Route::middleware('throttle:300,1')->group(function () {
        Route::post('/tracking/event', [TrackingController::class, 'event']);
        Route::get('/tracking/resolve/{code}', [TrackingController::class, 'resolve'])
            ->where('code', '[A-Za-z0-9_-]{4,32}');
    });

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {

        // Auth
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        // Profile
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::put('/profile', [ProfileController::class, 'update']);
        Route::put('/profile/password', [ProfileController::class, 'updatePassword']);
        Route::delete('/profile', [ProfileController::class, 'destroy']);

        // Chat
        Route::post('/chat/send', [ChatController::class, 'send']);
        Route::post('/chat/estimate', [TokenController::class, 'estimate']);
        Route::get('/chat', [ChatController::class, 'index']);
        Route::get('/chat/{id}', [ChatController::class, 'show']);
        Route::put('/chat/{id}', [ChatController::class, 'update']);
        Route::delete('/chat/{id}', [ChatController::class, 'destroy']);

        // Milestones
        Route::get('/milestones/{chatId}', [MilestoneController::class, 'index']);

        // Assets
        Route::get('/assets/{chatId}', [AssetController::class, 'index']);
        Route::delete('/assets/{id}', [AssetController::class, 'destroy']);

        // Pages — full CRUD
        Route::get('/pages', [PageController::class, 'index']);
        Route::post('/pages', [PageController::class, 'store']);
        // Template-driven routes (declared before /pages/{id} to avoid the numeric
        // route matcher swallowing the literal "preview"/"from-template" segments).
        Route::post('/pages/preview', [PageController::class, 'preview']);
        Route::post('/pages/from-template', [PageController::class, 'createFromTemplate']);
        Route::get('/pages/{id}', [PageController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/pages/{id}', [PageController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/pages/{id}', [PageController::class, 'destroy'])->where('id', '[0-9]+');
        Route::post('/pages/{id}/publish', [PageController::class, 'publish'])->where('id', '[0-9]+');
        Route::post('/pages/{id}/export', [PageController::class, 'export'])->where('id', '[0-9]+');
        Route::get('/pages/{id}/download', [PageController::class, 'download'])->where('id', '[0-9]+');

        // Tokens
        Route::get('/tokens/balance', [TokenController::class, 'balance']);
        Route::get('/tokens/transactions', [TokenController::class, 'transactions']);

        // Payment
        Route::post('/tokens/purchase', [PaymentController::class, 'createCheckout']);

        // Contacts
        Route::get('/contacts', [ContactController::class, 'index']);
        Route::post('/contacts', [ContactController::class, 'store']);
        Route::delete('/contacts/{id}', [ContactController::class, 'destroy']);
        Route::post('/contacts/import/preview', [ContactController::class, 'importPreview']);
        Route::post('/contacts/import', [ContactController::class, 'import']);

        // Import mapping templates
        Route::get('/contacts/import/templates', [ContactController::class, 'listMappingTemplates']);
        Route::post('/contacts/import/templates', [ContactController::class, 'storeMappingTemplate']);
        Route::delete('/contacts/import/templates/{id}', [ContactController::class, 'destroyMappingTemplate']);

        // Contact lists
        Route::get('/lists', [ContactListController::class, 'index']);
        Route::post('/lists', [ContactListController::class, 'store']);
        Route::get('/lists/{id}', [ContactListController::class, 'show']);
        Route::put('/lists/{id}', [ContactListController::class, 'update']);
        Route::delete('/lists/{id}', [ContactListController::class, 'destroy']);
        Route::post('/lists/{id}/contacts', [ContactListController::class, 'attachContacts']);
        Route::delete('/lists/{id}/contacts/{contactId}', [ContactListController::class, 'detachContact']);

        // Analytics
        Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);
        Route::get('/analytics/campaign/{id}', [AnalyticsController::class, 'campaign']);

        // Copy suggestions (AI-powered)
        Route::post('/copy-suggestions/generate', [CopySuggestionController::class, 'generate']);
        Route::get('/copy-suggestions', [CopySuggestionController::class, 'index']);
        Route::get('/copy-suggestions/{id}', [CopySuggestionController::class, 'show']);
        Route::post('/copy-suggestions/{id}/apply', [CopySuggestionController::class, 'apply']);
        Route::post('/copy-suggestions/{id}/dismiss', [CopySuggestionController::class, 'dismiss']);

        // Campaigns
        Route::get('/campaigns', [CampaignController::class, 'index']);
        Route::post('/campaigns', [CampaignController::class, 'store']);
        Route::get('/campaigns/{id}', [CampaignController::class, 'show']);
        Route::put('/campaigns/{id}', [CampaignController::class, 'update']);
        Route::delete('/campaigns/{id}', [CampaignController::class, 'destroy']);
        Route::post('/campaigns/{id}/send', [CampaignController::class, 'send']);
        Route::get('/campaigns/{id}/logs', [CampaignController::class, 'logs']);
    });
});
