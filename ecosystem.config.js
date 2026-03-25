module.exports = {
    apps: [
        {
            name: 'predity-web',
            script: './node_modules/next/dist/bin/next',
            args: 'start -p 3000',
            interpreter: '/root/.nvm/versions/node/v20.20.0/bin/node',
            cwd: '/var/www/preditybr',
            max_memory_restart: '512M',  // restart automático se memória > 512MB
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
