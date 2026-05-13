/** @type {import('next').NextConfig} */
const nextConfig = {
  // Servimos la app bajo behelpyou.com/behelpyou-gallery
  basePath: '/behelpyou-gallery',
  // Para que assets carguen bajo el basePath en dev y prod
  assetPrefix: '/behelpyou-gallery',
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '60mb'
    }
  }
};

module.exports = nextConfig;
