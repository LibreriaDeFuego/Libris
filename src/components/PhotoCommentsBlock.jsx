'use client';

import { useState, useTransition } from 'react';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { LikeButton } from '@/components/LikeButton';
import { postPhotoComment, togglePostLike } from '@/app/actions/posts';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

// Me gusta + comentarios de una foto — migración 033. Más simple que
// EngagementBlock a propósito: acá no hay "responder a un comentario
// puntual" ni un "me gusta" por comentario, solo una lista plana y el
// campo para agregar uno. Mismo patrón visual (fila de acciones + lista
// debajo) para que se sienta parte de la misma familia.
//
// `compact` es la versión sin píldoras — mismo criterio que EngagementBlock
// y LikeButton, para el feed estilo timeline (ver ActivityCard). También
// hace que los comentarios ya puestos arranquen colapsados detrás de un
// "Ver N comentarios", igual que el hilo de respuestas de EngagementBlock.
export function PhotoCommentsBlock({ postId, liked, likeCount, comments, compact = false }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [commentsShown, setCommentsShown] = useState(!compact);
  const [pending, startTransition] = useTransition();

  function toggleOpen() {
    setOpen((o) => !o);
    setCommentsShown(true);
  }

  function handleSubmit() {
    const text = body.trim();
    if (!text) return;
    const formData = new FormData();
    formData.set('postId', postId);
    formData.set('body', text);
    startTransition(async () => {
      await postPhotoComment(formData);
      setBody('');
      setOpen(false);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 22 : 4 }}>
        <LikeButton liked={liked} count={likeCount} onToggle={() => togglePostLike(postId)} compact={compact} />
        {compact ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleOpen(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            <Icon name="message-circle" size={17} color="var(--text-tertiary)" />
            {comments.length > 0 && (
              <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text-tertiary)' }}>{comments.length}</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleOpen(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', border: 'none',
              borderRadius: 'var(--radius-pill)', background: open ? 'var(--surface-sunken)' : 'none',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            <Icon name="message-circle" size={18} color="var(--text-tertiary)" />
            <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {comments.length > 0 ? `${comments.length} comentario${comments.length === 1 ? '' : 's'}` : 'Comentar'}
            </span>
          </button>
        )}
      </div>

      {(comments.length > 0 || open) && (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 38 }}>
          {comments.length > 0 && !commentsShown ? (
            <button
              type="button"
              onClick={() => setCommentsShown(true)}
              style={{ alignSelf: 'flex-start', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-tertiary)' }}
            >
              Ver {comments.length} comentario{comments.length === 1 ? '' : 's'}
            </button>
          ) : (
            comments.map((c) => {
              const name = c.profiles?.display_name ?? 'Alguien';
              return (
                <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                  <Avatar name={name} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {formatRelativeTime(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                      {c.body}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {open && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe un comentario…" rows={2} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)} disabled={pending}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="button" onClick={handleSubmit} disabled={pending || !body.trim()}>
                  {pending ? 'Enviando…' : 'Comentar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
