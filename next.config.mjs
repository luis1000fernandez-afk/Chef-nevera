/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para permitir body grande en App Router
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
