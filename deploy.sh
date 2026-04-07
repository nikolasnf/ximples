#!/bin/bash
set -e

BASE="/srv/projects/ximples"
LOGS="$BASE/logs"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "============================================"
echo "  Ximples - Deploy Completo"
echo "  $TIMESTAMP"
echo "============================================"
echo ""

# --------------------------------------------------
# BACKEND
# --------------------------------------------------
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  BACKEND"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$BASE/backend"

log "Instalando dependências PHP..."
composer install --no-dev --optimize-autoloader --no-interaction --quiet

log "Rodando migrations..."
php artisan migrate --force 2>&1 | grep -E "DONE|Nothing" || true

log "Limpando e recacheando..."
php artisan config:cache --quiet
php artisan route:cache --quiet
php artisan view:cache --quiet

log "Ajustando permissões..."
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

log "Reiniciando queue worker..."
systemctl restart ximples-worker

log "Backend pronto."
echo ""

# --------------------------------------------------
# FRONTEND
# --------------------------------------------------
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FRONTEND"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$BASE/app"

log "Instalando dependências Node..."
npm ci --silent 2>&1 | tail -1

log "Buildando Next.js..."
npx next build 2>&1 | grep -E "✓|Route|○" || true

log "Reiniciando PM2..."
pm2 restart ximples-app --update-env 2>&1 | grep -E "ximples-app" | head -1
pm2 save --silent

log "Frontend pronto."
echo ""

# --------------------------------------------------
# VALIDAÇÃO
# --------------------------------------------------
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VALIDAÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sleep 2

# Backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://backend.ximples.com.br/up)
if [ "$BACKEND_STATUS" = "200" ]; then
  log "Backend API: OK (HTTPS 200)"
else
  warn "Backend API: HTTP $BACKEND_STATUS"
fi

# Frontend
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://app.ximples.com.br/)
if [ "$APP_STATUS" = "200" ]; then
  log "Frontend App: OK (HTTPS 200)"
else
  warn "Frontend App: HTTP $APP_STATUS"
fi

# Services
for SVC in nginx php8.3-fpm postgresql redis-server ximples-worker; do
  STATUS=$(systemctl is-active "$SVC" 2>/dev/null)
  if [ "$STATUS" = "active" ]; then
    log "$SVC: active"
  else
    warn "$SVC: $STATUS"
  fi
done

PM2_STATUS=$(pm2 show ximples-app 2>/dev/null | grep "status" | head -1 | awk '{print $4}')
if [ "$PM2_STATUS" = "online" ]; then
  log "PM2 ximples-app: online"
else
  warn "PM2 ximples-app: $PM2_STATUS"
fi

echo ""
echo "============================================"
echo "  Deploy finalizado: $(date '+%H:%M:%S')"
echo "============================================"
echo ""
echo "  https://app.ximples.com.br"
echo "  https://backend.ximples.com.br"
echo ""
