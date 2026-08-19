'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/design-system/components/core/Icon.jsx';

const TABS = [
  { href: '/', match: (path) => path === '/' || path.startsWith('/club'), icon: 'book-open', label: 'Club' },
  { href: '/novedades', match: (path) => path.startsWith('/novedades'), icon: 'bell', label: 'Novedades' },
  { href: '/descubrir', match: (path) => path.startsWith('/descubrir'), icon: 'compass', label: 'Descubrir' },
];

export function AppShell({ children }) {
  const pathname = usePathname();
  const isFullScreenClubRoute = pathname === '/club/nuevo' || pathname === '/club/otros' || pathname.endsWith('/preferencias');
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
        <main style={{ flex: 1 }}>{children}</main>

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
                <Icon name={tab.icon} size={20} color={color} />
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
