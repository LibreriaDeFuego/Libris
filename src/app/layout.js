import '@/design-system/styles.css';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Libris',
  description: 'Clubes de lectura: progreso compartido, comentarios y contenido editorial.',
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  themeColor: '#FF4F32',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// La pestaña "Perfil" muestra la foto propia en vez de un ícono — se busca
// acá arriba de todo para que esté disponible en cualquier pantalla. Sin
// sesión (p. ej. /login) queda en null y AppShell cae al ícono genérico.
async function getOwnProfileForTab() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle();
  return data;
}

export default async function RootLayout({ children }) {
  const me = await getOwnProfileForTab();

  return (
    <html lang="es">
      <body>
        <ServiceWorkerRegistration />
        <AppShell me={me}>{children}</AppShell>
      </body>
    </html>
  );
}
