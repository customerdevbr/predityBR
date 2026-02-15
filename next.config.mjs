/** @type {import('next').NextConfig} */
const nextConfig = {
    // Ensure we are not exporting static if using image optimization default
    // output: 'export', // Do NOT use this if using default loader
    reactStrictMode: true,
};

export default nextConfig;
