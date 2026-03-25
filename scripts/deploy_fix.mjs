import 'dotenv/config';
import { Client } from 'ssh2';
import { getSSHConfig, NVM_INIT } from './ssh-config.mjs';

const SSH_CONFIG = getSSHConfig();
const conn = new Client();

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec(`${NVM_INIT} && nvm use 20 && cd /var/www/preditybr && rm -f .next/lock && git fetch origin && git reset --hard origin/main && npm run build && pm2 restart predity-web`, (err, stream) => {
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
