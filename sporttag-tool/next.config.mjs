/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    experimental: {
        turbo: {
            enabled: true
        }
    },
    images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'images.weserv.nl',
            pathname: '/**',
          },
        ],
    },
};

export default nextConfig;