#!/bin/bash
set -e

echo "============================================"
echo "  Ximples - Server Setup Script"
echo "============================================"

# 1. System packages
echo ""
echo ">> Step 1: Installing system packages..."
apt update && apt upgrade -y
apt install -y curl wget git unzip software-properties-common

# 2. PHP 8.3
echo ""
echo ">> Step 2: Installing PHP 8.3..."
add-apt-repository -y ppa:ondrej/php
apt update
apt install -y php8.3-fpm php8.3-cli php8.3-pgsql php8.3-mbstring \
  php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-intl \
  php8.3-redis php8.3-gd

# 3. Composer
echo ""
echo ">> Step 3: Installing Composer..."
if ! command -v composer &> /dev/null; then
  curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
fi

# 4. Node.js LTS
echo ""
echo ">> Step 4: Installing Node.js LTS..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
fi

# 5. PM2
echo ""
echo ">> Step 5: Installing PM2..."
npm install -g pm2

# 6. PostgreSQL
echo ""
echo ">> Step 6: Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# 7. Redis
echo ""
echo ">> Step 7: Installing Redis..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# 8. Nginx
echo ""
echo ">> Step 8: Installing Nginx..."
apt install -y nginx
systemctl enable nginx

# 9. Certbot
echo ""
echo ">> Step 9: Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# 10. Create directories
echo ""
echo ">> Step 10: Creating project directories..."
mkdir -p /srv/projects/ximples/logs

# 11. Database setup
echo ""
echo ">> Step 11: Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE USER ximples_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ximples_db OWNER ximples_user;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ximples_db TO ximples_user;" 2>/dev/null || true

echo ""
echo "============================================"
echo "  Server setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Update DB password in PostgreSQL and .env"
echo "  2. Run: bash /srv/projects/ximples/deploy/deploy-backend.sh"
echo "  3. Run: bash /srv/projects/ximples/deploy/deploy-frontend.sh"
echo "  4. Install Nginx configs:"
echo "     cp deploy/nginx-app.conf /etc/nginx/sites-available/app.ximples.com.br"
echo "     cp deploy/nginx-backend.conf /etc/nginx/sites-available/backend.ximples.com.br"
echo "     ln -s /etc/nginx/sites-available/app.ximples.com.br /etc/nginx/sites-enabled/"
echo "     ln -s /etc/nginx/sites-available/backend.ximples.com.br /etc/nginx/sites-enabled/"
echo "  5. Get SSL certificates:"
echo "     certbot --nginx -d app.ximples.com.br"
echo "     certbot --nginx -d backend.ximples.com.br"
echo "  6. Install worker service:"
echo "     cp deploy/ximples-worker.service /etc/systemd/system/"
echo "     systemctl daemon-reload"
echo "     systemctl enable ximples-worker"
echo "     systemctl start ximples-worker"
echo "  7. Start PM2:"
echo "     pm2 start deploy/ecosystem.config.js"
echo "     pm2 save"
echo "     pm2 startup"
echo "============================================"
