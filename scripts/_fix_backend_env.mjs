/**
 * Fixes the backend .env on VPS by reading correct credentials from /var/www/preditybr/.env
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { Client } from 'ssh2';
import { getSSHConfig, NVM_INIT } from './ssh-config.mjs';

const conn = new Client();

function execCmd(cmd) {
    return new Promise((resolve, reject) => {
        conn.exec(cmd, (err, stream) => {
            if (err) return reject(err);
            let out = '';
            stream.on('data', d => { process.stdout.write(d); out += d.toString(); });
            stream.stderr.on('data', d => process.stderr.write(d));
            stream.on('close', () => resolve(out));
        });
    });
}

conn.on('ready', async () => {
    try {
        // Read correct vars from preditybr .env
        const supabaseUrl = (await execCmd(
            "grep '^NEXT_PUBLIC_SUPABASE_URL=' /var/www/preditybr/.env | cut -d= -f2- | tr -d '\"'"
        )).trim();

        const serviceKey = (await execCmd(
            "grep '^SUPABASE_SERVICE_ROLE_KEY=' /var/www/preditybr/.env | cut -d= -f2- | tr -d '\"'"
        )).trim();

        console.log('\nSUPABASE_URL:', supabaseUrl);
        console.log('SERVICE_KEY (first 30):', serviceKey.slice(0, 30) + '...\n');

        if (!supabaseUrl || !serviceKey) {
            throw new Error('Could not read credentials from preditybr .env');
        }

        const webhookSecret = 'predity_webhook_secret_2026';
        const envContent = [
            `SUPABASE_URL=${supabaseUrl}`,
            `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
            `PREDITY_API_URL=http://localhost:3000`,
            `PREDITY_WEBHOOK_SECRET=${webhookSecret}`,
            `BROADCAST_HMAC_SECRET=${webhookSecret}`,
        ].join('\n');

        // Write env file
        const dest = '/var/www/contador-de-veiculos/backend/.env';
        await execCmd(`cat > ${dest} << 'HEREDOC'\n${envContent}\nHEREDOC`);
        console.log('[OK] .env escrito\n');

        // Restart
        await execCmd(`${NVM_INIT} && pm2 restart contador-veiculos`);
        await new Promise(r => setTimeout(r, 6000));

        // Status
        await execCmd(`${NVM_INIT} && pm2 list`);
        console.log('\n--- stderr (last 5) ---');
        await execCmd('tail -5 /root/.pm2/logs/contador-veiculos-error.log');
        console.log('\n--- stdout (last 10) ---');
        await execCmd('tail -10 /root/.pm2/logs/contador-veiculos-out.log');
        console.log('\n--- health ---');
        await execCmd('curl -s http://localhost:3001');

    } catch (e) {
        console.error('[ERRO]', e.message);
    } finally {
        conn.end();
    }
});

conn.connect(getSSHConfig());
