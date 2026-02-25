import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('[SSH] Connected to VPS. Searching Nginx logs for XGate webhooks...');
    // We will search both standard access log and error log
    conn.exec('grep "xgate" /var/log/nginx/access.log | tail -n 20', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err.message);
}).connect({
    host: '89.153.178.90', // From upload.mjs
    port: 22,
    username: 'root',
    password: 'Kauedev@2025' // From credentials
});
