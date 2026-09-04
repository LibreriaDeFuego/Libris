'use client';

import { useTransition } from 'react';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { toggleRepost } from '@/app/actions/reposts';

// Reenviar la publicación de otra persona a tu feed — ícono+número, mismo
// tratamiento que la fila de acciones "compact" de ActivityCard (Inicio/
// Perfil, ver LikeButton/EngagementBlock). No tiene versión "píldora": a
// diferencia de "me gusta", esto solo vive ahí — no hay repost en
// Comentarios del club.
export function RepostButton({ kind, id, reposted, count, size = 17 }) {
  const [pending, startTransition] = useTransition();

  function handleClick(e) {
    e.stopPropagation();
    if (pending) return;
    startTransition(async () => {
      await toggleRepost(kind, id);
    });
  }

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
      <Icon name="repeat-2" size={size} color={reposted ? 'var(--success)' : 'var(--text-tertiary)'} />
      {count > 0 && (
        <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, color: reposted ? 'var(--success)' : 'var(--text-tertiary)' }}>
          {count}
        </span>
      )}
    </button>
  );
}
