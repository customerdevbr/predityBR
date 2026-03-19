/**
 * Instala onnxruntime-node + sharp no backend de veículos
 * e reinicia o PM2 com o servidor atualizado (com detecção IA server-side).
 *
 * Uso: node scripts/deploy_vehicle_detector.mjs
 */

import { Client } from 'ssh2';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PATCH_PATH = path.join(__dirname, 'contador-de-veiculos-backend-patch.js');
const PATCH = readFileSync(PATCH_PATH);

const NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"';
const DIR = '/var/www/contador-de-veiculos/backend';

const SSH_CONFIG = {
    host: '187.77.54.203',
    port: 22,
    username: 'root',
    password: 'Kauedev@2025',
};

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

function sftpPutBuffer(conn, buf, remotePath) {
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

const conn = new Client();

conn.on('ready', async () => {
    console.log('=== Conectado via SSH ===\n');

    try {
        // 1. Upload do novo server.js via SFTP
        console.log('--- Upload de server.js via SFTP ---');
        await sftpPutBuffer(conn, PATCH, `${DIR}/server.js`);
        console.log('[OK] server.js enviado.\n');

        // 2. Atualizar package.json
        console.log('--- Atualizando package.json ---');
        const pkgJson = Buffer.from(JSON.stringify({
            name: 'contador-de-veiculos-backend',
            version: '2.0.0',
            description: 'Backend com detecção IA server-side',
            main: 'server.js',
            scripts: { start: 'node server.js' },
            dependencies: {
                '@supabase/supabase-js': '^2.39.0',
                'dotenv': '^16.3.1',
                'onnxruntime-node': '^1.17.3',
                'sharp': '^0.33.2',
                'ws': '^8.16.0',
            },
        }, null, 2));
        await sftpPutBuffer(conn, pkgJson, `${DIR}/package.json`);
        console.log('[OK] package.json enviado.\n');

        // 3. npm install (onnxruntime-node compila bindings nativos — demora)
        console.log('--- npm install (pode demorar ~2-3 min) ---');
        await execCmd(conn, `${NVM} && cd ${DIR} && npm install --production 2>&1`);

        // 4. Baixar modelo ONNX se não existir
        console.log('\n--- Verificando modelo ONNX ---');
        const modelCheck = await execCmd(conn, `test -f ${DIR}/yolov5nu.onnx && echo "EXISTS" || echo "MISSING"`);
        if (modelCheck.includes('MISSING')) {
            console.log('--- Baixando yolov5nu.onnx (~3.8MB) ---');
            await execCmd(conn,
                `cd ${DIR} && wget -q ` +
                `https://github.com/ultralytics/assets/releases/download/v8.3.0/yolov5nu.onnx ` +
                `-O yolov5nu.onnx && echo "Modelo baixado: $(du -sh yolov5nu.onnx | cut -f1)"`
            );
        } else {
            console.log('[OK] Modelo já existe.\n');
        }

        // 5. Reiniciar PM2 (delete + start para limpar env cache)
        console.log('--- Reiniciando PM2 ---');
        await execCmd(conn, `${NVM} && pm2 delete contador-veiculos 2>/dev/null; echo "ok"`);
        await execCmd(conn, `${NVM} && cd ${DIR} && pm2 start server.js --name contador-veiculos`);
        await execCmd(conn, `${NVM} && pm2 save`);

        console.log('\n--- PM2 status ---');
        await execCmd(conn, `${NVM} && pm2 list`);

        console.log('\n=== Deploy concluído! ===');
        console.log('Logs: pm2 logs contador-veiculos --lines 50');
    } catch (err) {
        console.error('\n[ERRO]', err.message);
    } finally {
        conn.end();
    }
});

conn.connect(SSH_CONFIG);
