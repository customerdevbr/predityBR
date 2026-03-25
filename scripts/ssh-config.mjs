/**
 * Configuração SSH compartilhada — lê credenciais de variáveis de ambiente.
 *
 * Variáveis necessárias:
 *   VPS_HOST     — IP ou hostname da VPS (ex: 187.77.54.203)
 *   VPS_PORT     — Porta SSH (default: 22)
 *   VPS_USER     — Usuário SSH (default: root)
 *   VPS_PASSWORD  — Senha SSH
 *
 * Pode ser definido em .env.local ou exportado antes de rodar o script.
 */

export function getSSHConfig() {
    const host     = process.env.VPS_HOST;
    const port     = parseInt(process.env.VPS_PORT || '22', 10);
    const username = process.env.VPS_USER || 'root';
    const password = process.env.VPS_PASSWORD;

    if (!host || !password) {
        console.error(
            '[SSH] Variáveis de ambiente faltando.\n' +
            'Defina VPS_HOST e VPS_PASSWORD no .env.local ou exporte no terminal:\n' +
            '  export VPS_HOST=seu.ip.aqui\n' +
            '  export VPS_PASSWORD=sua_senha\n'
        );
        process.exit(1);
    }

    return { host, port, username, password };
}

export const NVM_INIT = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"';
