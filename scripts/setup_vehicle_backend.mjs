/**
 * Configura o backend do contador-de-veiculos na VPS
 * - Copia o patch para /backend/server.js
 * - Cria o .env com as variáveis corretas
 * - Instala dependências e inicia com PM2
 */
import 'dotenv/config';
import { Client } from 'ssh2';
import { readFileSync } from 'fs';
import { getSSHConfig, NVM_INIT } from './ssh-config.mjs';

const SSH_CONFIG = getSSHConfig();
const conn = new Client();
const PATCH = readFileSync('./contador-de-veiculos-backend-patch.js', 'utf8');

conn.on('ready', () => {
    // 1. Ler as variáveis do preditybr .env
    conn.exec(
        'grep -E "(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|VEHICLE_WEBHOOK_SECRET)" /var/www/preditybr/.env',
        (err, stream) => {
            if (err) throw err;
            let envOut = '';
            stream.on('close', () => {
                const vars = Object.fromEntries(
                    envOut.trim().split('\n').map(l => {
                        const [k, ...v] = l.split('=');
                        return [k.trim(), v.join('=').replace(/^"|"$/g, '').trim()];
                    })
                );

                const supabaseUrl = vars['NEXT_PUBLIC_SUPABASE_URL'];
                const serviceKey = vars['SUPABASE_SERVICE_ROLE_KEY'];
                const webhookSecret = vars['VEHICLE_WEBHOOK_SECRET'];

                const envContent = [
                    `SUPABASE_URL="${supabaseUrl}"`,
                    `SUPABASE_SERVICE_ROLE_KEY="${serviceKey}"`,
                    `PREDITY_API_URL="http://localhost:3000"`,
                    `PREDITY_WEBHOOK_SECRET="${webhookSecret}"`,
                    `BROADCAST_HMAC_SECRET="${webhookSecret}"`,
                ].join('\n');

                // 2. Escrever patch e .env, instalar deps, iniciar PM2
                const setupCmds = [
                    'cp /var/www/contador-de-veiculos/backend/server.js /var/www/contador-de-veiculos/backend/server.js.orig 2>/dev/null || true',
                    `${NVM_INIT} && cd /var/www/contador-de-veiculos/backend && npm install`,
                    `${NVM_INIT} && pm2 delete contador-veiculos 2>/dev/null; pm2 start /var/www/contador-de-veiculos/backend/server.js --name contador-veiculos --cwd /var/www/contador-de-veiculos/backend --node-args="--max-old-space-size=256"`,
                    'pm2 save',
                    'echo "--- PM2 LIST ---"',
                    'pm2 list',
                ].join(' && ');

                const writeFiles = `cat > /var/www/contador-de-veiculos/backend/.env << 'ENVEOF'\n${envContent}\nENVEOF`;

                conn.exec(writeFiles, (e2, s2) => {
                    if (e2) throw e2;
                    s2.on('close', () => {
                        conn.exec(`cat > /var/www/contador-de-veiculos/backend/server.js << 'PATCHEOF'\n${PATCH}\nPATCHEOF`, (e3, s3) => {
                            if (e3) throw e3;
                            s3.on('close', () => {
                                conn.exec(setupCmds, (e4, s4) => {
                                    if (e4) throw e4;
                                    s4.on('close', (code) => {
                                        console.log('\nExit:', code);
                                        conn.end();
                                    }).on('data', d => process.stdout.write(d))
                                      .stderr.on('data', d => process.stderr.write(d));
                                });
                            }).on('data', d => process.stdout.write(d))
                              .stderr.on('data', d => process.stderr.write(d));
                        });
                    }).on('data', d => process.stdout.write(d))
                      .stderr.on('data', d => process.stderr.write(d));
                });
            }).on('data', d => { envOut += d.toString(); });
        }
    );
}).connect(SSH_CONFIG);
