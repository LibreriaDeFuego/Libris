'use client';

import { useTransition } from 'react';
import { Icon } from '@/design-system/components/core/Icon.jsx';

// Compartir en Inicio: solo lo ve el dueño del comentario (lo decide quien
// usa este componente, mostrándolo o no) — a diferencia de Me gusta y
// Comentar, que ve cualquier miembro del club. Por ahora solo tiene
// sentido en comentarios de capítulo y notas de voz: reseñas, citas y
// fotos ya aparecen siempre en Inicio.
export function ShareButton({ shared, onToggle }) {
  const [pending, startTransition] = useTransition();

  function handleClick(e) {
    e.stopPropagation();
    if (pending) return;
    startTransition(async () => {
      await onToggle();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', border: 'none',
        borderRadius: 'var(--radius-pill)', background: shared ? 'var(--success-bg)' : 'none',
        cursor: 'pointer', opacity: pending ? 0.6 : 1, fontFamily: 'var(--font-body)', marginLeft: 'auto',
      }}
    >
      <Icon name={shared ? 'check' : 'share-2'} size={16} color={shared ? 'var(--success)' : 'var(--text-tertiary)'} />
      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: shared ? 'var(--success)' : 'var(--text-secondary)' }}>
        {shared ? 'Compartido en Inicio' : 'Compartir'}
      </span>
    </button>
  );
}
