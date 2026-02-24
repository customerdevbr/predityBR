#!/bin/bash
echo "Installing NVM and Node 20..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20
echo "Reinstalling PM2..."
npm install -g pm2
cd /var/www/preditybr
echo "Restarting application..."
pm2 delete predity-web || true
pm2 start npm --name "predity-web" -- run start -- -p 3000
pm2 save
env PATH=$PATH:/root/.nvm/versions/node/v20*/bin /root/.nvm/versions/node/v20*/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root || true
echo "DONE"
