#!/bin/bash
set -e

echo "=== Deploying Ximples Backend ==="

cd /srv/projects/ximples/backend

echo ">> Installing dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

echo ">> Running migrations..."
php artisan migrate --force

echo ">> Clearing caches..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo ">> Setting permissions..."
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

echo ">> Restarting queue worker..."
systemctl restart ximples-worker

echo "=== Backend deploy complete ==="
