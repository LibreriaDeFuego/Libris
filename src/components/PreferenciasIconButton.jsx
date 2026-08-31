import Link from 'next/link';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';

// Ícono de Preferencias con el punto de solicitudes pendientes — lo usa
// tanto /club/[clubId] como el héroe que vive en "Mis clubes de lectura"
// (mismo club activo, mismo header de acciones).
export function PreferenciasIconButton({ clubId, pendingRequestCount, tone }) {
  return (
    <Link href={`/club/${clubId}/preferencias`} style={{ position: 'relative' }}>
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
