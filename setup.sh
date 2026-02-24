#!/bin/bash
echo "Extracting project files..."
apt-get install -y unzip
mkdir -p /var/www/preditybr
unzip -q -o /root/predity.zip -d /var/www/preditybr || true
cd /var/www/preditybr
echo "Installing NPM dependencies..."
npm install
echo "Building NextJS..."
npm run build
echo "Starting PM2..."
pm2 delete predity-web || true
pm2 start npm --name "predity-web" -- run start -- -p 3000
pm2 save
pm2 startup
echo "Configuring Nginx..."
ln -sf /etc/nginx/sites-available/preditybr /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx
echo "DEPLOYMENT_DONE"
