/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://adwidereach-3.onrender.com'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
