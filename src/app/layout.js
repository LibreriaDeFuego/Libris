import '@/design-system/styles.css';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

export const metadata = {
  title: 'Libris',
  description: 'Clubes de lectura: progreso compartido, comentarios, novedades y descubrimiento editorial.',
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  themeColor: '#FF4F32',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <ServiceWorkerRegistration />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
