'use client';

import { useState, useTransition } from 'react';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { LikeButton } from '@/components/LikeButton';
import { ShareButton } from '@/components/ShareButton';
import { postReply, toggleCommentLike } from '@/app/actions/clubs';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

// Me gusta + Responder (+ Compartir, opcional) para una reseña, cita,
// comentario o nota de voz puntual — y, debajo, su hilo de respuestas: las
// que ya hay (anidadas, con su propio "me gusta" chico) y el campo para
// escribir una nueva si se tocó "Responder". Todo en un solo componente
// porque el botón que abre el campo y el campo en sí comparten el mismo
// estado (si no, habría que subirlo a quien use esto).
export function EngagementBlock({ commentId, liked, likeCount, replies, share }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();

  function handleSubmitReply() {
    const text = body.trim();
    if (!text) return;
    const formData = new FormData();
    formData.set('parentCommentId', commentId);
    formData.set('body', text);
    startTransition(async () => {
      await postReply(formData);
      setBody('');
      setReplyOpen(false);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <LikeButton liked={liked} count={likeCount} onToggle={() => toggleCommentLike(commentId)} />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setReplyOpen((o) => !o); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', border: 'none',
            borderRadius: 'var(--radius-pill)', background: replyOpen ? 'var(--surface-sunken)' : 'none',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          <Icon name="message-circle" size={18} color="var(--text-tertiary)" />
          <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Responder</span>
        </button>
        {share && <ShareButton shared={share.shared} onToggle={share.onToggle} />}
      </div>

      {(replies.length > 0 || replyOpen) && (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 38 }}>
          {replies.map((reply) => {
            const name = reply.profiles?.display_name ?? 'Alguien';
            return (
              <div key={reply.id} style={{ display: 'flex', gap: 8 }}>
                <Avatar name={name} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {formatRelativeTime(reply.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                    {reply.body}
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <LikeButton liked={reply.liked_by_me} count={reply.like_count} onToggle={() => toggleCommentLike(reply.id)} size={14} />
                  </div>
                </div>
              </div>
            );
          })}

          {replyOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe una respuesta…" rows={2} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="secondary" size="sm" type="button" onClick={() => setReplyOpen(false)} disabled={pending}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="button" onClick={handleSubmitReply} disabled={pending || !body.trim()}>
                  {pending ? 'Enviando…' : 'Responder'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
