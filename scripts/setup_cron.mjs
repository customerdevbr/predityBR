import 'dotenv/config';
import { Client } from 'ssh2';
import { getSSHConfig } from './ssh-config.mjs';

const SSH_CONFIG = getSSHConfig();
const conn = new Client();
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
    console.error('[Cron] CRON_SECRET não definido. Defina no .env.local ou exporte no terminal.');
    process.exit(1);
}

const CLOSE_CMD = `* * * * * curl -s -H "Authorization: Bearer ${SECRET}" http://localhost:3000/api/cron/close-markets >> /var/log/preditybr-cron.log 2>&1`;
const AUTO_CMD  = `* * * * * curl -s -H "Authorization: Bearer ${SECRET}" http://localhost:3000/api/cron/auto-markets >> /var/log/preditybr-cron.log 2>&1`;

const script = [
    `crontab -l 2>/dev/null | grep -v 'api/cron/' | crontab -`,
    `(crontab -l 2>/dev/null; echo '${CLOSE_CMD}') | crontab -`,
    `(crontab -l 2>/dev/null; echo '${AUTO_CMD}') | crontab -`,
    `echo '--- crontab final ---'`,
    `crontab -l`,
].join(' && ');

conn.on('ready', () => {
    conn.exec(script, (err, stream) => {
        if (err) { console.error(err); conn.end(); return; }
        stream
            .on('close', (code) => { console.log('\nExit:', code); conn.end(); })
            .on('data', (d) => process.stdout.write(d))
            .stderr.on('data', (d) => process.stderr.write(d));
    });
}).connect(SSH_CONFIG);
