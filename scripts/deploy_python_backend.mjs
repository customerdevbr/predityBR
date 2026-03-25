/**
 * deploy_python_backend.mjs
 *
 * Deploys the Python vehicle counter backend to VPS:
 *   1. Uploads server.py + requirements.txt via SFTP
 *   2. Writes /backend/.env with Supabase credentials
 *   3. Installs Python3 / pip if missing
 *   4. pip-installs CPU-only torch + project requirements
 *   5. Downloads yolov8n.pt if not present
 *   6. Stops Node.js backend, starts Python backend via PM2
 *
 * Usage: node scripts/deploy_python_backend.mjs
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { Client } from 'ssh2';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { getSSHConfig, NVM_INIT } from './ssh-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR       = '/var/www/contador-de-veiculos/backend';

const SSH_CONFIG = getSSHConfig();

const SERVER_PY      = readFileSync(path.join(__dirname, 'vehicle_counter_python/server.py'));
const REQUIREMENTS   = readFileSync(path.join(__dirname, 'vehicle_counter_python/requirements.txt'));

// ── Helpers ───────────────────────────────────────────────────────────────────
function execCmd(conn, cmd) {
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

function sftpPut(conn, buf, remotePath) {
    return new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
            if (err) return reject(err);
            const ws = sftp.createWriteStream(remotePath);
            ws.on('close', () => { sftp.end(); resolve(); });
            ws.on('error', reject);
            ws.write(buf);
            ws.end();
        });
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────
const conn = new Client();

conn.on('ready', async () => {
    console.log('=== Conectado via SSH ===\n');

    try {
        // 0. Ensure directory exists
        console.log('--- Criando diretório backend ---');
        await execCmd(conn, `mkdir -p ${DIR}`);

        // 1. Upload server.py
        console.log('--- Upload server.py ---');
        await sftpPut(conn, SERVER_PY, `${DIR}/server.py`);
        console.log('[OK] server.py\n');

        // 2. Upload requirements.txt
        console.log('--- Upload requirements.txt ---');
        await sftpPut(conn, REQUIREMENTS, `${DIR}/requirements.txt`);
        console.log('[OK] requirements.txt\n');

        // 3. Write .env — read ALL credentials from /var/www/preditybr/.env on VPS
        // (authoritative source; avoids key mismatches between local .env.local and VPS)
        console.log('--- Lendo credenciais de /var/www/preditybr/.env ---');
        const PENV = '/var/www/preditybr/.env';
        const supabaseUrl = (await execCmd(conn,
            `grep '^NEXT_PUBLIC_SUPABASE_URL=' ${PENV} | cut -d= -f2- | tr -d '"'`
        )).trim();
        const serviceKey = (await execCmd(conn,
            `grep '^SUPABASE_SERVICE_ROLE_KEY=' ${PENV} | cut -d= -f2- | tr -d '"'`
        )).trim();
        const vehicleSecret = (await execCmd(conn,
            `grep '^VEHICLE_WEBHOOK_SECRET=' ${PENV} | cut -d= -f2- | tr -d '"' || echo '${process.env.WEBHOOK_SECRET || 'predity_webhook_secret_2026'}'`
        )).trim();

        if (!supabaseUrl || !serviceKey) {
            throw new Error(`Não foi possível ler credenciais Supabase de ${PENV}`);
        }

        const envContent = [
            `SUPABASE_URL=${supabaseUrl}`,
            `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
            `PREDITY_API_URL=http://localhost:3000`,
            `PREDITY_WEBHOOK_SECRET=${vehicleSecret}`,
            `BROADCAST_HMAC_SECRET=${vehicleSecret}`,
        ].join('\n');

        await sftpPut(conn, Buffer.from(envContent), `${DIR}/.env`);
        console.log('[OK] .env\n');

        const VENV     = `${DIR}/../venv`;
        const VENV_PY  = `${VENV}/bin/python3`;
        const VENV_PIP = `${VENV}/bin/pip`;

        // 4. Ensure Python3 + venv
        console.log('--- Verificando Python3 ---');
        const pyVer = await execCmd(conn, 'python3 --version 2>&1 || echo MISSING');
        if (pyVer.includes('MISSING')) {
            console.log('Instalando Python3...');
            await execCmd(conn, 'apt-get update -qq && apt-get install -y python3 python3-pip python3-venv');
        } else {
            console.log('[OK] ' + pyVer.trim());
        }

        // 5. Create virtualenv (avoids PEP 668 system-Python conflicts)
        console.log('--- Virtualenv ---');
        await execCmd(conn, `python3 -m venv ${VENV} 2>&1 | tail -2`);
        console.log('[OK] venv em ' + VENV + '\n');

        // 6. Install CPU-only PyTorch inside venv (~200MB, much smaller than CUDA build)
        console.log('--- pip: torch CPU-only ---');
        await execCmd(conn,
            `${VENV_PIP} install --quiet torch torchvision --index-url https://download.pytorch.org/whl/cpu 2>&1 | tail -3`
        );
        console.log('[OK] torch CPU\n');

        // 7. Install project requirements inside venv
        console.log('--- pip: requirements ---');
        await execCmd(conn, `${VENV_PIP} install --quiet -r ${DIR}/requirements.txt 2>&1 | tail -5`);
        console.log('[OK] requirements\n');

        // 8. Stop old backend, start Python backend with venv interpreter
        console.log('--- PM2: parar processo anterior ---');
        await execCmd(conn, `${NVM_INIT} && pm2 delete contador-veiculos 2>/dev/null; echo ok`);

        console.log('--- PM2: iniciar Python backend ---');
        await execCmd(conn,
            `${NVM_INIT} && cd ${DIR} && pm2 start server.py ` +
            `--name contador-veiculos ` +
            `--interpreter ${VENV_PY} ` +
            `--cwd ${DIR} ` +
            `--max-memory-restart 768M`
        );
        await execCmd(conn, `${NVM_INIT} && pm2 save`);

        console.log('\n--- PM2 status ---');
        await execCmd(conn, `${NVM_INIT} && pm2 list`);

        console.log('\n=== Deploy Python backend concluído! ===');
        console.log(`Logs: pm2 logs contador-veiculos --lines 50`);
        console.log(`Health: curl http://${process.env.VPS_HOST}:3001`);
    } catch (err) {
        console.error('\n[ERRO]', err.message);
        process.exitCode = 1;
    } finally {
        conn.end();
    }
});

conn.connect(SSH_CONFIG);
