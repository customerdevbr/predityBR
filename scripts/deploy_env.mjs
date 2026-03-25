import 'dotenv/config';
import { Client } from 'ssh2';
import { getSSHConfig, NVM_INIT } from './ssh-config.mjs';

const SSH_CONFIG = getSSHConfig();
const conn = new Client();
const NEXT_PUBLIC_TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAACqNcSpI8oXGbj_B';

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec(`grep -q "NEXT_PUBLIC_TURNSTILE_SITE_KEY" /var/www/preditybr/.env || echo 'NEXT_PUBLIC_TURNSTILE_SITE_KEY="${NEXT_PUBLIC_TURNSTILE_SITE_KEY}"' >> /var/www/preditybr/.env && cd /var/www/preditybr && ${NVM_INIT} && npm run build && pm2 restart predity-web`, (err, stream) => {
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
}).connect(SSH_CONFIG);
