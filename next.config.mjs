/** @type {import('next').NextConfig} */
const ALLOWED_ORIGINS = [
    'https://preditybr.com',
    'https://www.preditybr.com',
    'https://app.preditybr.com',
];

const securityHeaders = [
    // Força HTTPS por 1 ano, inclui subdomínios
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
    // Bloqueia sniffing de MIME type
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // Impede clickjacking — só permite embed do próprio site
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    // Desativa XSS Auditor legado (substituído por CSP)
    { key: 'X-XSS-Protection', value: '1; mode=block' },
    // Referrer: envia domínio mas não path em cross-origin
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // Restringe recursos de hardware/browser não usados
    {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    },
    // Content Security Policy — permite Supabase, Turnstile e assets próprios
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://xyniubvihpgoolkpisvy.supabase.co https://placehold.co https://api.dicebear.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com",
            "frame-src https://challenges.cloudflare.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests",
        ].join('; '),
    },
];

const nextConfig = {
    reactStrictMode: true,
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },

    // Compressão automática de respostas
    compress: true,

    // Otimização de imagens com formatos modernos
    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'xyniubvihpgoolkpisvy.supabase.co',
                port: '',
                pathname: '/storage/v1/object/public/**',
            },
            {
                protocol: 'https',
                hostname: 'placehold.co',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'api.dicebear.com',
                port: '',
                pathname: '/**',
            },
        ],
    },

    async headers() {
        return [
            // Segurança global para todas as rotas
            {
                source: '/(.*)',
                headers: securityHeaders,
            },
            // CORS restritivo para rotas de API
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Credentials', value: 'true' },
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: ALLOWED_ORIGINS.join(', '),
                    },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
                    },
                    { key: 'Access-Control-Max-Age', value: '86400' },
                ],
            },
            // Cache de assets estáticos (fontes, imagens)
            {
                source: '/fonts/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
            {
                source: '/:path*.avif',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
        ];
    },
};

export default nextConfig;
