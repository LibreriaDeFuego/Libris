// Next.js serves this as /manifest.webmanifest. It's what lets Chrome on
// Android offer "Agregar a pantalla de inicio" / install the PWA.
// Íconos: el signo "punto + S" del logo real de Libris, blanco sobre coral
// (public/icons/*.png, generados desde el logo — ver README).
export default function manifest() {
  return {
    name: 'Libris — Clubes de lectura',
    short_name: 'Libris',
    description: 'Clubes de lectura: progreso compartido, comentarios y contenido editorial.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFF8EC',
    theme_color: '#FF4F32',
    lang: 'es',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
