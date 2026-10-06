import Link from 'next/link';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';

// Ícono de Preferencias con el punto de solicitudes pendientes — lo usa el
// header de /club/[clubId]. `clubBookId` es el libro que se esté mirando
// ahí (principal o en paralelo, migración 060): sin pasarlo, Preferencias
// siempre resolvía el principal del club, sin importar desde qué libro se
// hubiera abierto.
export function PreferenciasIconButton({ clubId, clubBookId, pendingRequestCount, tone }) {
  const href = clubBookId ? `/club/${clubId}/preferencias?libro=${clubBookId}` : `/club/${clubId}/preferencias`;
  return (
    <Link href={href} style={{ position: 'relative' }}>
      <IconButton aria-label="Preferencias del club" tone={tone} size={36}><Icon name="settings" size={16} /></IconButton>
      {pendingRequestCount > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 999,
            background: 'var(--accent-500)', color: '#fff', fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            border: `2px solid ${tone === 'glass' ? 'var(--hero-bg)' : 'var(--surface-page)'}`,
          }}
        >
          {pendingRequestCount}
        </span>
      )}
    </Link>
  );
}
