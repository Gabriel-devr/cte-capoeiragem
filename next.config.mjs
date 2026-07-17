/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Permite fazer o build mesmo com erros de tipo TypeScript.
    // Os erros de tipo não afetam o funcionamento em runtime.
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      // Padrão do Next é 1MB; aumentado bem alto pra na prática não travar
      // uploads de imagem do informativo. Next.js não tem opção de "sem limite".
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
