'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';

// Descubrir ya no tiene pestaña propia — se llega desde el adelanto en
// "Mis clubes de lectura" (la búsqueda y "Ver todo en Descubrir"). La ruta
// /descubrir sigue existiendo tal cual, solo dejó de estar acá abajo.
const TABS = [
  { href: '/inicio', match: (path) => path.startsWith('/inicio'), icon: 'home', label: 'Inicio' },
  { href: '/recursos', match: (path) => path.startsWith('/recursos'), icon: 'compass', label: 'Recursos' },
  { href: '/', match: (path) => path === '/' || path.startsWith('/club'), icon: 'book-open', label: 'Club' },
  { href: '/perfil', match: (path) => path.startsWith('/perfil'), icon: 'user', label: 'Perfil' },
];

export function AppShell({ children, me }) {
  const pathname = usePathname();
  const isFullScreenClubRoute = pathname === '/club/nuevo' || pathname.endsWith('/preferencias') || pathname.endsWith('/capitulos') || pathname.endsWith('/portada');
  const showTabBar = pathname !== '/login' && !pathname.startsWith('/unirse') && !isFullScreenClubRoute;

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        background: 'var(--neutral-100)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          minHeight: '100dvh',
          background: 'var(--surface-page)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* El tab bar es sticky, no fijo aparte del flujo: si el contenido
            mide apenas un poco más que la pantalla (p. ej. un club con
            pocos capítulos), "sticky" no empuja lo de arriba — lo tapa. Este
            padding reserva su alto real para que nunca oculte el último
            tramo del contenido, en cualquier pantalla. */}
        <main style={{ flex: 1, paddingBottom: showTabBar ? 'calc(70px + env(safe-area-inset-bottom, 8px))' : 0 }}>{children}</main>

        {showTabBar && (
        <nav
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            height: 70,
            background: 'var(--surface-card)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingBottom: 'env(safe-area-inset-bottom, 8px)',
          }}
        >
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            const color = active ? 'var(--accent-500)' : 'var(--text-tertiary)';
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  color,
                }}
              >
                {tab.href === '/perfil' && me ? (
                  <div style={{ borderRadius: '50%', border: `1.5px solid ${active ? color : 'transparent'}`, lineHeight: 0 }}>
                    <Avatar name={me.display_name} src={me.avatar_url} size={20} />
                  </div>
                ) : (
                  <Icon name={tab.icon} size={20} color={color} />
                )}
                {tab.label}
              </Link>
            );
          })}
        </nav>
        )}
      </div>
    </div>
  );
}
