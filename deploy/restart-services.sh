#!/bin/bash
set -e

echo "=== Restarting all Ximples services ==="

echo ">> Restarting PHP-FPM..."
systemctl restart php8.3-fpm

echo ">> Restarting Nginx..."
nginx -t && systemctl restart nginx

echo ">> Restarting queue worker..."
systemctl restart ximples-worker

echo ">> Restarting PM2 frontend..."
pm2 restart ximples-app

echo ">> Status check..."
systemctl status php8.3-fpm --no-pager -l | head -5
systemctl status nginx --no-pager -l | head -5
systemctl status ximples-worker --no-pager -l | head -5
pm2 status

echo "=== All services restarted ==="
