'use client';

import { useRef, useState, useTransition } from 'react';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { LikeButton } from '@/components/LikeButton';
import { RepostButton } from '@/components/RepostButton';
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

// Un comentario raíz + sus respuestas — puestas detrás de su propio "Ver N
// respuestas" (colapsadas por default, cada hilo con su propio estado, no
// uno solo para toda la lista). Solo la usa el modal de comentarios
// (compact); fuera de ahí (ComentariosScreen) el hilo entero se muestra
// siempre, sin este colapso.
function ThreadGroup({ root, replies: childReplies, onReply }) {
  const [childrenShown, setChildrenShown] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ReplyRow reply={root} indented={false} onReply={onReply} />
      {childReplies.length > 0 && (
        childrenShown ? (
          childReplies.map((child) => <ReplyRow key={child.id} reply={child} indented onReply={onReply} />)
        ) : (
          <button
            type="button"
            onClick={() => setChildrenShown(true)}
            style={{ marginLeft: 32, alignSelf: 'flex-start', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-tertiary)' }}
          >
            Ver {childReplies.length} {childReplies.length === 1 ? 'respuesta' : 'respuestas'}
          </button>
        )
      )}
    </div>
  );
}

const PREVIEW_COUNT = 2;

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
//
// `compact` es la versión del feed estilo timeline (ver ActivityCard,
// LikeButton) — y no es solo un cambio de look: en vez de desplegar el
// hilo ahí mismo, adentro de la tarjeta, muestra como mucho 2 comentarios
// de vista previa (solo texto, sin acciones) y un "Ver los N comentarios"
// que abre una hoja aparte (Modal) con el hilo completo — cada comentario
// con su propio "Ver N respuestas" colapsado (ThreadGroup) — y el campo
// para escribir, siempre visible ahí abajo. Mismo patrón que Instagram:
// la tarjeta nunca crece con el largo de la conversación. Fuera de
// Inicio/Perfil (ComentariosScreen, sin `compact`) el hilo se sigue
// desplegando en el lugar de siempre, sin hoja aparte.
//
// `repostId` (opcional, migración 040) — solo lo pasa ActivityCard cuando
// la tarjeta es un repost: cualquier respuesta que se escriba ahí queda
// scopeada a ESE repost puntual, no al contenido original (ver
// postReply). ComentariosScreen nunca lo pasa — ahí no hay reposts.
export function EngagementBlock({ commentId, liked, likeCount, replies, share, repost, repostId, compact = false }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [body, setBody] = useState('');
  const [replyingToName, setReplyingToName] = useState(null);
  const [replyToId, setReplyToId] = useState(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef(null);

  function openReply(name, targetId) {
    setReplyOpen(true);
    setModalOpen(true);
    setReplyToId(targetId ?? null);
    if (name) {
      setReplyingToName(name);
      setBody(`@${name} `);
    }
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function clearReplyTarget() {
    setReplyingToName(null);
    setReplyToId(null);
  }

  function closeReply() {
    setReplyOpen(false);
    clearReplyTarget();
    setBody('');
  }

  function handleSubmitReply() {
    const text = body.trim();
    if (!text) return;
    const formData = new FormData();
    formData.set('parentCommentId', commentId);
    formData.set('body', text);
    if (replyToId) formData.set('replyToId', replyToId);
    if (repostId) formData.set('repostId', repostId);
    startTransition(async () => {
      await postReply(formData);
      setBody('');
      clearReplyTarget();
    });
  }

  const groups = groupReplies(replies);

  if (compact) {
    const preview = groups.slice(0, PREVIEW_COUNT);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <LikeButton liked={liked} count={likeCount} onToggle={() => toggleCommentLike(commentId)} compact />
          {repost && <RepostButton kind={repost.kind} id={repost.id} reposted={repost.reposted} count={repost.count} />}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            <Icon name="message-circle" size={17} color="var(--text-tertiary)" />
            {replies.length > 0 && (
              <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text-tertiary)' }}>{replies.length}</span>
            )}
          </button>
          {share && <ShareButton shared={share.shared} onToggle={share.onToggle} />}
        </div>

        {replies.length > 0 && (
          <div onClick={(e) => { e.stopPropagation(); setModalOpen(true); }} style={{ display: 'flex', flexDirection: 'column', gap: 3, cursor: 'pointer' }}>
            {preview.map(({ root }) => (
              <div key={root.id} style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{root.profiles?.display_name ?? 'Alguien'}</span> {root.body}
              </div>
            ))}
            <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-tertiary)' }}>
              Ver los {replies.length} comentario{replies.length === 1 ? '' : 's'}
            </div>
          </div>
        )}

        {modalOpen && (
          <Modal title="Comentarios" onClose={() => setModalOpen(false)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {groups.length === 0 ? (
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>
                  Todavía no hay comentarios.
                </div>
              ) : (
                groups.map(({ root, children }) => (
                  <ThreadGroup key={root.id} root={root} replies={children} onReply={openReply} />
                ))
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                {replyingToName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>
                    Respondiendo a @{replyingToName}
                    <button
                      type="button"
                      onClick={clearReplyTarget}
                      aria-label="Quitar destinatario"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, display: 'flex' }}
                    >
                      <Icon name="x" size={12} color="var(--text-tertiary)" />
                    </button>
                  </div>
                )}
                <Textarea ref={textareaRef} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe un comentario…" rows={2} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" size="sm" type="button" onClick={handleSubmitReply} disabled={pending || !body.trim()}>
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
                    onClick={clearReplyTarget}
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
