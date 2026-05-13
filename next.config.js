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
  },
  // Si alguien entra a la raiz del dominio Vercel sin el subpath,
  // lo mandamos a /behelpyou-gallery para evitar el 404.
  // basePath: false hace que la regla actue sobre la raiz absoluta.
  async redirects() {
    return [
      {
        source: '/',
        destination: '/behelpyou-gallery',
        basePath: false,
        permanent: false
      }
    ];
  }
};

module.exports = nextConfig;
