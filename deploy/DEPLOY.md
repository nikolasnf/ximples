# Ximples - Guia Completo de Deploy em Produção

## Estrutura do Projeto

```
/srv/projects/ximples/
├── app/              # Frontend Next.js
├── backend/          # Backend Laravel API
├── deploy/           # Scripts e configs de deploy
├── logs/             # Logs centralizados
└── backups/          # Backups do banco (criado automaticamente)
```

## Domínios

- Frontend: https://app.ximples.com.br
- Backend/API: https://backend.ximples.com.br

---

## 1. Setup do Servidor (Ubuntu)

```bash
# Executar como root
sudo bash /srv/projects/ximples/deploy/setup-server.sh
```

Ou manualmente:

```bash
# Pacotes base
apt update && apt upgrade -y
apt install -y curl wget git unzip software-properties-common

# PHP 8.3
add-apt-repository -y ppa:ondrej/php
apt update
apt install -y php8.3-fpm php8.3-cli php8.3-pgsql php8.3-mbstring \
  php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-intl \
  php8.3-redis php8.3-gd

# Composer
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# PM2
npm install -g pm2

# PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl enable postgresql && systemctl start postgresql

# Redis
apt install -y redis-server
systemctl enable redis-server && systemctl start redis-server

# Nginx
apt install -y nginx
systemctl enable nginx

# Certbot
apt install -y certbot python3-certbot-nginx
```

---

## 2. PostgreSQL

```bash
sudo -u postgres psql

CREATE USER ximples_user WITH PASSWORD 'SUA_SENHA_FORTE_AQUI';
CREATE DATABASE ximples_db OWNER ximples_user;
GRANT ALL PRIVILEGES ON DATABASE ximples_db TO ximples_user;
\q
```

Testar conexão:

```bash
psql -h 127.0.0.1 -U ximples_user -d ximples_db
```

---

## 3. Redis

Verificar:

```bash
redis-cli ping
# Deve retornar: PONG
```

---

## 4. Backend Laravel

```bash
cd /srv/projects/ximples/backend

# Dependências
composer install --no-dev --optimize-autoloader

# Configurar .env (veja .env.example)
cp .env.example .env
php artisan key:generate

# Editar .env com credenciais reais:
# DB_DATABASE=ximples_db
# DB_USERNAME=ximples_user
# DB_PASSWORD=SUA_SENHA_FORTE_AQUI
# APP_URL=https://backend.ximples.com.br
# FRONTEND_URL=https://app.ximples.com.br
# QUEUE_CONNECTION=redis
# CACHE_STORE=redis

# Migrations e seed
php artisan migrate --force
php artisan db:seed

# Cache de produção
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Permissões
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

---

## 5. Frontend Next.js

```bash
cd /srv/projects/ximples/app

# Configurar .env.local
echo 'NEXT_PUBLIC_API_URL=https://backend.ximples.com.br' > .env.local

# Dependências e build
npm ci
npx next build

# Iniciar com PM2
pm2 start /srv/projects/ximples/deploy/ecosystem.config.js
pm2 save
pm2 startup  # seguir instruções para auto-start no boot
```

---

## 6. Nginx

```bash
# Copiar configs
cp /srv/projects/ximples/deploy/nginx-app.conf /etc/nginx/sites-available/app.ximples.com.br
cp /srv/projects/ximples/deploy/nginx-backend.conf /etc/nginx/sites-available/backend.ximples.com.br

# Habilitar
ln -sf /etc/nginx/sites-available/app.ximples.com.br /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/backend.ximples.com.br /etc/nginx/sites-enabled/

# Remover default (opcional)
rm -f /etc/nginx/sites-enabled/default

# Testar e reiniciar
nginx -t
systemctl restart nginx
```

---

## 7. SSL com Certbot

```bash
# Emitir certificados (Nginx deve estar rodando)
certbot --nginx -d app.ximples.com.br
certbot --nginx -d backend.ximples.com.br

# Renovação automática (já configurada pelo certbot)
certbot renew --dry-run
```

---

## 8. Queue Worker (systemd)

```bash
cp /srv/projects/ximples/deploy/ximples-worker.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ximples-worker
systemctl start ximples-worker

# Verificar
systemctl status ximples-worker
```

---

## 9. Checklist de Validação

### Backend
- [ ] `curl https://backend.ximples.com.br/up` retorna 200
- [ ] POST `/api/v1/auth/signup` cria usuário
- [ ] POST `/api/v1/auth/login` retorna token
- [ ] GET `/api/v1/auth/me` retorna usuário (com token)
- [ ] POST `/api/v1/chat/send` cria chat e mensagens
- [ ] GET `/api/v1/chat` lista chats
- [ ] GET `/api/v1/milestones/{id}` retorna milestones
- [ ] GET `/api/v1/assets/{id}` retorna assets
- [ ] Queue worker processa tasks (verificar logs)

### Frontend
- [ ] https://app.ximples.com.br/login abre
- [ ] https://app.ximples.com.br/signup abre
- [ ] Login redireciona para dashboard
- [ ] Rota `/` protegida (redireciona para login)
- [ ] Sidebar carrega chats reais
- [ ] Enviar mensagem funciona
- [ ] Milestones atualizam
- [ ] Assets atualizam
- [ ] Logout funciona

### Infraestrutura
- [ ] SSL ativo nos dois domínios
- [ ] Nginx respondendo
- [ ] PM2 rodando (`pm2 status`)
- [ ] Worker ativo (`systemctl status ximples-worker`)
- [ ] PostgreSQL conectado
- [ ] Redis conectado (`redis-cli ping`)

---

## 10. Backup

```bash
# Backup manual
bash /srv/projects/ximples/deploy/backup-db.sh

# Agendar backup diário (crontab -e)
0 3 * * * /srv/projects/ximples/deploy/backup-db.sh >> /srv/projects/ximples/logs/backup.log 2>&1
```

---

## 11. Segurança

- `.env` nunca versionado (está no `.gitignore`)
- Nginx bloqueia acesso a `.env`, `.log`, `.md`
- Nginx bloqueia acesso direto ao `storage/`
- Headers de segurança (X-Frame-Options, X-Content-Type-Options, etc.)
- Permissões: `www-data` no storage/cache
- Backup do `.env`: `cp .env /srv/projects/ximples/backups/.env.backup`

---

## 12. Comandos Úteis

```bash
# Reiniciar tudo
bash /srv/projects/ximples/deploy/restart-services.sh

# Deploy backend
bash /srv/projects/ximples/deploy/deploy-backend.sh

# Deploy frontend
bash /srv/projects/ximples/deploy/deploy-frontend.sh

# Logs
tail -f /srv/projects/ximples/logs/worker.log
tail -f /srv/projects/ximples/logs/app-access.log
tail -f /srv/projects/ximples/logs/backend-error.log
pm2 logs ximples-app

# Laravel
cd /srv/projects/ximples/backend
php artisan queue:restart
php artisan cache:clear
php artisan config:clear
```
