/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Configure assetPrefix for Replit
  assetPrefix: process.env.NODE_ENV === 'production' ? '.' : undefined,
  // Make sure Next.js listens on 0.0.0.0 to be accessible outside the container
  env: {
    HOST: '0.0.0.0',
  },
  // Increase webpack timeout and configure chunk loading
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      poll: 1000,
      aggregateTimeout: 300,
    };

    // Increase chunk loading timeout
    config.output.chunkLoadTimeout = 60000; // 60 seconds

    return config;
  },
};

module.exports = nextConfig;