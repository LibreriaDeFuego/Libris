'use client';

import { useTransition } from 'react';
import { Icon } from '@/design-system/components/core/Icon.jsx';

// El corazón + contador — mismo botón en reseñas, citas, comentarios, notas
// de voz y fotos. Sin estado optimista propio: al tocar, dispara la acción
// y el conteo real llega con el refresco normal de la página (mismo patrón
// que ya usan los demás botones "pending" de la app, como el de eliminar).
//
// `compact` es la versión sin píldora — ícono + número solo, sin fondo ni
// padding, para el feed estilo timeline de Inicio/Perfil (ver
// ActivityCard). El resto de la app (comentarios del club, respuestas
// dentro de un hilo) sigue con la píldora de siempre por default.
export function LikeButton({ liked, count, onToggle, size = 18, compact = false }) {
  const [pending, startTransition] = useTransition();

  function handleClick(e) {
    e.stopPropagation();
    if (pending) return;
    startTransition(async () => {
      await onToggle();
    });
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'none',
          cursor: 'pointer', opacity: pending ? 0.6 : 1, fontFamily: 'var(--font-body)',
        }}
      >
        <Icon
          name="heart"
          size={size}
          color={liked ? 'var(--accent-500)' : 'var(--text-tertiary)'}
          fill={liked ? 'var(--accent-500)' : undefined}
        />
        {count > 0 && (
          <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, color: liked ? 'var(--accent-600)' : 'var(--text-tertiary)' }}>
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', border: 'none',
        borderRadius: 'var(--radius-pill)', background: liked ? 'var(--accent-50)' : 'none',
        cursor: 'pointer', opacity: pending ? 0.6 : 1, fontFamily: 'var(--font-body)',
      }}
    >
      <Icon
        name="heart"
        size={size}
        color={liked ? 'var(--accent-500)' : 'var(--text-tertiary)'}
        fill={liked ? 'var(--accent-500)' : undefined}
      />
      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: liked ? 'var(--accent-600)' : 'var(--text-secondary)' }}>
        {count > 0 ? count : 'Me gusta'}
      </span>
    </button>
  );
}
