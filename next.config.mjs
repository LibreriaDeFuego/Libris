/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next.js limita a 1 MB el body de un Server Action por defecto — muy
    // poco para una foto de portada, de perfil o una nota de voz (hasta
    // 5-10 MB). Sin esto, subir un archivo "de verdad" (no un ícono chico
    // de prueba) tira un error de servidor genérico en vez del mensaje
    // amigable que ya devuelven uploadBookCover/uploadAvatar/postVoiceComment.
    serverActions: { bodySizeLimit: '12mb' },
  },
};

export default nextConfig;
