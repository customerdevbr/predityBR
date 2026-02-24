module.exports = {
    apps: [
        {
            name: 'predity-web',
            script: './node_modules/next/dist/bin/next',
            args: 'start -p 3000',
            interpreter: '/root/.nvm/versions/node/v20.20.0/bin/node',
            cwd: '/var/www/preditybr',
            env: {
                NODE_ENV: 'production',
            }
        }
    ]
};
