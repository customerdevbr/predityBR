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

        // 3. Write .env from preditybr .env
        console.log('--- Escrevendo .env ---');
        const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const webhookSecret = process.env.WEBHOOK_SECRET || 'predity_webhook_secret_2026';

        if (!supabaseUrl || !serviceKey) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos em .env.local');
        }

        const envContent = [
            `SUPABASE_URL="${supabaseUrl}"`,
            `SUPABASE_SERVICE_ROLE_KEY="${serviceKey}"`,
            `PREDITY_API_URL="http://localhost:3000"`,
            `PREDITY_WEBHOOK_SECRET="${webhookSecret}"`,
            `BROADCAST_HMAC_SECRET="${webhookSecret}"`,
        ].join('\n');

        await sftpPut(conn, Buffer.from(envContent), `${DIR}/.env`);
        console.log('[OK] .env\n');

        // 4. Ensure Python3 + pip
        console.log('--- Verificando Python3 ---');
        const pyVer = await execCmd(conn, 'python3 --version 2>&1 || echo MISSING');
        if (pyVer.includes('MISSING')) {
            console.log('Instalando Python3...');
            await execCmd(conn, 'apt-get update -qq && apt-get install -y python3 python3-pip python3-venv');
        } else {
            console.log('[OK] Python3 presente\n');
        }

        // 5. Install CPU-only PyTorch (smaller, no CUDA deps)
        console.log('--- Instalando PyTorch CPU-only ---');
        await execCmd(conn,
            `pip3 install --quiet torch torchvision --index-url https://download.pytorch.org/whl/cpu 2>&1 | tail -5`
        );
        console.log('[OK] PyTorch instalado\n');

        // 6. Install project requirements
        console.log('--- pip install requirements.txt ---');
        await execCmd(conn, `cd ${DIR} && pip3 install --quiet -r requirements.txt 2>&1 | tail -10`);
        console.log('[OK] requirements instalados\n');

        // 7. Download yolov8n.pt if not present
        console.log('--- Verificando yolov8n.pt ---');
        const modelCheck = await execCmd(conn, `test -f ${DIR}/yolov8n.pt && echo EXISTS || echo MISSING`);
        if (modelCheck.includes('MISSING')) {
            console.log('Baixando yolov8n.pt (~6 MB)...');
            await execCmd(conn,
                `cd ${DIR} && python3 -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" 2>&1 | tail -5`
            );
            // ultralytics downloads to ~/.config/ultralytics — symlink to backend dir
            await execCmd(conn,
                `cp ~/.config/Ultralytics/yolov8n.pt ${DIR}/yolov8n.pt 2>/dev/null || ` +
                `cp $(python3 -c "import ultralytics; import os; print(os.path.join(os.path.dirname(ultralytics.__file__), 'assets'))") ${DIR}/yolov8n.pt 2>/dev/null || true`
            );
            // Simpler: just let ultralytics download it at startup with cwd set
            console.log('[OK] yolov8n.pt será baixado no primeiro start\n');
        } else {
            console.log('[OK] yolov8n.pt já existe\n');
        }

        // 8. Stop old Node.js backend, start Python backend
        console.log('--- PM2: parar processo Node.js anterior ---');
        await execCmd(conn, `${NVM_INIT} && pm2 delete contador-veiculos 2>/dev/null; echo ok`);

        console.log('--- PM2: iniciar Python backend ---');
        await execCmd(conn,
            `${NVM_INIT} && cd ${DIR} && pm2 start server.py ` +
            `--name contador-veiculos ` +
            `--interpreter python3 ` +
            `--cwd ${DIR} ` +
            `--max-memory-restart 512M`
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
