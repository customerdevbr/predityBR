import { Client } from 'ssh2';

const conn = new Client();
const NEXT_PUBLIC_TURNSTILE_SITE_KEY = '0x4AAAAAACqNcSpI8oXGbj_B';

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec(`grep -q "NEXT_PUBLIC_TURNSTILE_SITE_KEY" /var/www/preditybr/.env || echo 'NEXT_PUBLIC_TURNSTILE_SITE_KEY="${NEXT_PUBLIC_TURNSTILE_SITE_KEY}"' >> /var/www/preditybr/.env && cd /var/www/preditybr && export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && npm run build && pm2 restart predity-web`, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).connect({
    host: '187.77.54.203',
    port: 22,
    username: 'root',
    password: 'Kauedev@2025'
});
