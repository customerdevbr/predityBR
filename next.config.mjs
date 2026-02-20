/** @type {import('next').NextConfig} */
const nextConfig = {
    // Ensure we are not exporting static if using image optimization default
    // output: 'export', // Do NOT use this if using default loader
    reactStrictMode: true,
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
    images: {
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
        ],
    },
    async headers() {
        return [
            {
                // matching all API routes
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "*" }, // Ideally restrict to .preditybr.com
                    { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
                    { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
                ]
            },
            {
                // Allow CORS for redirection if needed
                source: "/app/:path*",
                headers: [
                    { key: "Access-Control-Allow-Origin", value: "*" },
                ]
            }
        ]
    },
};

export default nextConfig;
