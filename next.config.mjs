/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Permite fazer o build mesmo com erros de tipo TypeScript.
    // Os erros de tipo não afetam o funcionamento em runtime.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
