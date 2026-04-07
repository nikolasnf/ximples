#!/bin/bash
set -e

echo "=== Deploying Ximples Frontend ==="

cd /srv/projects/ximples/app

echo ">> Installing dependencies..."
npm ci --production=false

echo ">> Building..."
npx next build

echo ">> Restarting PM2..."
pm2 startOrRestart /srv/projects/ximples/deploy/ecosystem.config.js
pm2 save

echo "=== Frontend deploy complete ==="
