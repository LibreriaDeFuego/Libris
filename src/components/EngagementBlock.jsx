'use client';

import { useRef, useState, useTransition } from 'react';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { LikeButton } from '@/components/LikeButton';
import { ShareButton } from '@/components/ShareButton';
import { postReply, toggleCommentLike } from '@/app/actions/clubs';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

// Agrupa las respuestas por a quién le contestan (reply_to_id, migración
// 034), sin volver a anidar más de un nivel: cada respuesta "raíz" (sin
// reply_to_id, o respondiendo directo al original) mantiene su lugar en
// orden cronológico; las que le contestan A ELLA (o a otra respuesta que a
// su vez le contesta a ella — se resuelve la cadena entera) se agrupan
// justo debajo, todas al mismo nivel extra de sangría, en su propio orden
// cronológico. Así "Comentario A" con dos respuestas a A se ven como un
// conjunto, en vez de perderse sueltas en la lista.
function groupReplies(replies) {
  const byId = new Map(replies.map((r) => [r.id, r]));

  function resolveRootId(id, depth = 0) {
    const r = byId.get(id);
    if (!r || !r.reply_to_id || depth > 5) return id;
    return resolveRootId(r.reply_to_id, depth + 1);
  }

  const roots = [];
  const childrenByRoot = new Map();
  for (const r of replies) {
    if (!r.reply_to_id || !byId.has(r.reply_to_id)) {
      roots.push(r);
      continue;
    }
    const rootId = resolveRootId(r.reply_to_id);
    const list = childrenByRoot.get(rootId) ?? [];
    list.push(r);
    childrenByRoot.set(rootId, list);
  }

  return roots.map((root) => ({ root, children: childrenByRoot.get(root.id) ?? [] }));
}

// Una respuesta puesta: avatar, nombre, texto, y su fila de "me gusta" +
// "Responder" chicos. "indented" la corre un poco más a la derecha, para
// las que a su vez le contestan a esta.
function ReplyRow({ reply, indented, onReply }) {
  const name = reply.profiles?.display_name ?? 'Alguien';
  return (
    <div style={{ display: 'flex', gap: 8, marginLeft: indented ? 28 : 0 }}>
      <Avatar name={name} size={indented ? 20 : 24} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {formatRelativeTime(reply.created_at)}</span>
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
          {reply.body}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <LikeButton liked={reply.liked_by_me} count={reply.like_count} onToggle={() => toggleCommentLike(reply.id)} size={14} />
          <button
            type="button"
            onClick={() => onReply(name, reply.id)}
            style={{
              padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text-tertiary)',
            }}
          >
            Responder
          </button>
        </div>
      </div>
    </div>
  );
}

// Me gusta + Comentar (+ Compartir, opcional) para una reseña, cita,
// comentario o nota de voz puntual — y, debajo, su hilo de respuestas: las
// que ya hay (agrupadas por a quién le contestan, con su propio "me gusta"
// chico) y el campo para escribir una nueva si se tocó "Comentar". El
// botón principal dice "Comentar", no "Responder" — es la acción de dejar
// un comentario, aunque por dentro quede guardado como una respuesta
// (parent_comment_id) al original. Todo en un solo componente porque el
// botón que abre el campo y el campo en sí comparten el mismo estado (si
// no, habría que subirlo a quien use esto).
//
// Cada respuesta ya puesta tiene, además, su propio "Responder" — como en
// Instagram: no crea un segundo nivel de hilo de verdad (parent_comment_id
// sigue apuntando siempre al original, un solo nivel de anidamiento, a
// propósito), pero sí agrupa visualmente (reply_to_id + groupReplies) y
// precarga el campo compartido con "@Nombre " para que quede claro a quién
// le está contestando. El "@Nombre" queda como texto plano en el
// comentario — no es un link ni una mención de verdad, igual que hace
// Instagram por dentro.
export function EngagementBlock({ commentId, liked, likeCount, replies, share }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [body, setBody] = useState('');
  const [replyingToName, setReplyingToName] = useState(null);
  const [replyToId, setReplyToId] = useState(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef(null);

  function openReply(name, targetId) {
    setReplyOpen(true);
    setReplyToId(targetId ?? null);
    if (name) {
      setReplyingToName(name);
      setBody(`@${name} `);
    }
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function closeReply() {
    setReplyOpen(false);
    setReplyingToName(null);
    setReplyToId(null);
    setBody('');
  }

  function handleSubmitReply() {
    const text = body.trim();
    if (!text) return;
    const formData = new FormData();
    formData.set('parentCommentId', commentId);
    formData.set('body', text);
    if (replyToId) formData.set('replyToId', replyToId);
    startTransition(async () => {
      await postReply(formData);
      closeReply();
    });
  }

  const groups = groupReplies(replies);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <LikeButton liked={liked} count={likeCount} onToggle={() => toggleCommentLike(commentId)} />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (replyOpen) closeReply(); else openReply(null, null); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', border: 'none',
            borderRadius: 'var(--radius-pill)', background: replyOpen ? 'var(--surface-sunken)' : 'none',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          <Icon name="message-circle" size={18} color="var(--text-tertiary)" />
          <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Comentar</span>
        </button>
        {share && <ShareButton shared={share.shared} onToggle={share.onToggle} />}
      </div>

      {(replies.length > 0 || replyOpen) && (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 38 }}>
          {groups.map(({ root, children }) => (
            <div key={root.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ReplyRow reply={root} indented={false} onReply={openReply} />
              {children.map((child) => (
                <ReplyRow key={child.id} reply={child} indented onReply={openReply} />
              ))}
            </div>
          ))}

          {replyOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {replyingToName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>
                  Respondiendo a @{replyingToName}
                  <button
                    type="button"
                    onClick={() => { setReplyingToName(null); setReplyToId(null); }}
                    aria-label="Quitar destinatario"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, display: 'flex' }}
                  >
                    <Icon name="x" size={12} color="var(--text-tertiary)" />
                  </button>
                </div>
              )}
              <Textarea ref={textareaRef} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe un comentario…" rows={2} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="secondary" size="sm" type="button" onClick={closeReply} disabled={pending}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="button" onClick={handleSubmitReply} disabled={pending || !body.trim()}>
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
