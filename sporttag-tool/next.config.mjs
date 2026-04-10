/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    experimental: {
        turbo: {
            enabled: true
        }
    },
    images: {
        domains: ['qcxsrkpddxkljwaiqyux.supabase.co'],
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