<?php

use App\Http\Controllers\Api\V1\PageController;
use App\Http\Controllers\Api\V1\TrackingController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Public short-link redirect (tracked).
// Throttled per IP to mitigate abuse; the redirect itself is light-weight.
Route::get('/t/{code}', [TrackingController::class, 'redirect'])
    ->middleware('throttle:120,1')
    ->where('code', '[A-Za-z0-9_-]{4,32}');

// Fallback public route for exported landing pages.
// Primary delivery is the static /storage/exports/pages/* path served by Nginx;
// this route is a safety net that streams the same file through Laravel.
// Accepts .zip (current bundle format) and .html (legacy exports).
Route::get('/exports/pages/{filename}', [PageController::class, 'serveExport'])
    ->where('filename', '[A-Za-z0-9._-]+\.(?:zip|html)');
