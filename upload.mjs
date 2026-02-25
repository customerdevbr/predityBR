import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();
const files = [
    'app/api/xgate-webhook/route.ts'
];

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        let pending = files.length;
        files.forEach(file => {
            sftp.fastPut(file, '/var/www/preditybr/' + file, err => {
                if (err) throw err;
                console.log('Uploaded ' + file);
                if (--pending === 0) {
                    console.log('Running build and restart...');
                    conn.exec('export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && cd /var/www/preditybr && npm run build && pm2 restart predity-web', (err, stream) => {
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
                }
            });
        });
    });
}).connect({
    host: '187.77.54.203',
    port: 22,
    username: 'root',
    password: 'Kauedev@2025'
});
