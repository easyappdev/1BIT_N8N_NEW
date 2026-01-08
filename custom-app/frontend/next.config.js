/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // Allow external images if needed
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://chat-backend-wachat:3001/api/:path*', // Proxy to Backend Container
            },
        ];
    },
}

module.exports = nextConfig
