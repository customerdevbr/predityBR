/** @type {import('next').NextConfig} */
const nextConfig = {
    // Ensure we are not exporting static if using image optimization default
    // output: 'export', // Do NOT use this if using default loader
    reactStrictMode: true,
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
};

export default nextConfig;
