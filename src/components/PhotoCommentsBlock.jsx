'use client';

import { useState, useTransition } from 'react';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { LikeButton } from '@/components/LikeButton';
import { RepostButton } from '@/components/RepostButton';
import { postPhotoComment, togglePostLike } from '@/app/actions/posts';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

const PREVIEW_COUNT = 2;

function CommentRow({ comment }) {
  const name = comment.profiles?.display_name ?? 'Alguien';
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Avatar name={name} size={24} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {formatRelativeTime(comment.created_at)}</span>
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
          {comment.body}
        </div>
      </div>
    </div>
  );
}

// Me gusta + comentarios de una foto — migración 033. Más simple que
// EngagementBlock a propósito: acá no hay "responder a un comentario
// puntual" ni un "me gusta" por comentario, solo una lista plana y el
// campo para agregar uno. Mismo patrón visual (fila de acciones + lista
// debajo) para que se sienta parte de la misma familia.
//
// `compact` es la versión del feed estilo timeline (ver ActivityCard,
// LikeButton, EngagementBlock) — como mucho 2 comentarios de vista previa
// (solo texto) y un "Ver los N comentarios" que abre una hoja aparte
// (Modal) con la lista completa y el campo para escribir, siempre visible
// ahí abajo. Fuera de Inicio/Perfil (sin `compact`) la lista se sigue
// desplegando en el lugar de siempre, sin hoja aparte.
//
// `repostId` (opcional, migración 040) — solo lo pasa ActivityCard cuando
// la tarjeta es el repost de una foto: cualquier comentario que se
// escriba ahí queda scopeado a ESE repost, no a la foto original.
export function PhotoCommentsBlock({ postId, liked, likeCount, comments, repost, repostId, compact = false }) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    const text = body.trim();
    if (!text) return;
    const formData = new FormData();
    formData.set('postId', postId);
    formData.set('body', text);
    if (repostId) formData.set('repostId', repostId);
    startTransition(async () => {
      await postPhotoComment(formData);
      setBody('');
      setOpen(false);
    });
  }

  if (compact) {
    const preview = comments.slice(0, PREVIEW_COUNT);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <LikeButton liked={liked} count={likeCount} onToggle={() => togglePostLike(postId)} compact />
          {repost && <RepostButton kind={repost.kind} id={repost.id} reposted={repost.reposted} count={repost.count} />}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            <Icon name="message-circle" size={17} color="var(--text-tertiary)" />
            {comments.length > 0 && (
              <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text-tertiary)' }}>{comments.length}</span>
            )}
          </button>
        </div>

        {comments.length > 0 && (
          <div onClick={(e) => { e.stopPropagation(); setModalOpen(true); }} style={{ display: 'flex', flexDirection: 'column', gap: 3, cursor: 'pointer' }}>
            {preview.map((c) => (
              <div key={c.id} style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.profiles?.display_name ?? 'Alguien'}</span> {c.body}
              </div>
            ))}
            <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-tertiary)' }}>
              Ver los {comments.length} comentario{comments.length === 1 ? '' : 's'}
            </div>
          </div>
        )}

        {modalOpen && (
          <Modal title="Comentarios" onClose={() => setModalOpen(false)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {comments.length === 0 ? (
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>
                  Todavía no hay comentarios.
                </div>
              ) : (
                comments.map((c) => <CommentRow key={c.id} comment={c} />)
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe un comentario…" rows={2} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" size="sm" type="button" onClick={handleSubmit} disabled={pending || !body.trim()}>
                    {pending ? 'Enviando…' : 'Comentar'}
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <LikeButton liked={liked} count={likeCount} onToggle={() => togglePostLike(postId)} />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
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
      </div>

      {(comments.length > 0 || open) && (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 38 }}>
          {comments.map((c) => <CommentRow key={c.id} comment={c} />)}

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
