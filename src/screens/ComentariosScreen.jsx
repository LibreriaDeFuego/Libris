'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Chip } from '@/design-system/components/core/Chip.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Blockquote } from '@/design-system/components/content/Blockquote.jsx';
import { SpoilerBlock } from '@/design-system/components/content/SpoilerBlock.jsx';
import { VoiceNotePlayer } from '@/design-system/components/content/VoiceNotePlayer.jsx';
import { NewCommentForm } from '@/components/NewCommentForm';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { DownloadQuoteImageButton } from '@/components/DownloadQuoteImageButton';
import { BookReviewCard } from '@/components/BookReviewCard';
import { PostMenu } from '@/components/PostMenu';
import { EngagementBlock } from '@/components/EngagementBlock';
import { FinalReviewModal } from './FinalReviewModal.jsx';
import { EditQuoteModal } from '@/components/EditQuoteModal';
import { EditCommentModal } from '@/components/EditCommentModal';
import { EditVoiceModal } from '@/components/EditVoiceModal';
import { deleteBookReview, deleteQuote, deleteComment, toggleShareToFeed } from '@/app/actions/clubs';
import { deleteVoiceComment } from '@/app/actions/media';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { orderChapters, chapterDisplayLabel } from '@/lib/orderChapters';

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function CommentBody({ comment, book, clubName }) {
  if (comment.kind === 'voice') {
    return (
      <VoiceNotePlayer
        src={comment.audio_url ?? undefined}
        duration={formatDuration(comment.voice_duration_seconds)}
        transcript={comment.voice_transcript ?? undefined}
      />
    );
  }
  if (comment.kind === 'quote') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Blockquote>{comment.body}</Blockquote>
        {comment.quote_style && (
          <DownloadQuoteImageButton
            style={comment.quote_style}
            quoteText={comment.body}
            book={book}
            clubName={clubName}
            personName={comment.profiles?.display_name}
            imageUrl={comment.quote_image_url}
          />
        )}
      </div>
    );
  }
  return (
    <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)', lineHeight: 'var(--lh-normal)', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
      {comment.body}
    </p>
  );
}

// La reseña final de alguien que terminó el libro: el título y el texto
// (hasta 5 líneas) dentro del mismo panel de color que la portada
// (BookReviewCard, mismo bloque que usa ActivityCard en Inicio y Perfil) —
// tocar la tarjeta despliega el resto. En la propia reseña, el menú de 3
// puntos junto al nombre ofrece editarla (abre FinalReviewModal, precargada)
// o borrarla. Debajo, Me gusta + Comentar y el hilo de respuestas — igual
// que en cualquier otro comentario (EngagementBlock).
function ReviewCard({ review, book, isOwn, onEdit, replies }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const name = review.profiles?.display_name ?? 'Alguien';

  function handleDelete() {
    if (!window.confirm('¿Eliminar esta reseña? No se puede deshacer.')) return;
    startTransition(async () => {
      await deleteBookReview(review.id);
    });
  }

  const card = (
    <div onClick={() => setExpanded((e) => !e)} style={{ cursor: 'pointer', opacity: pending ? 0.6 : 1 }}>
      <BookReviewCard title={review.title} body={review.body} coverUrl={book?.cover_url} expanded={expanded} />
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar name={name} size={30} />
          <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· terminó el libro · {formatRelativeTime(review.created_at)}</span>
          </div>
        </div>
        {isOwn && (
          <PostMenu
            editLabel="Editar reseña"
            onEdit={() => onEdit(review)}
            deleteLabel="Eliminar reseña"
            onDelete={handleDelete}
          />
        )}
      </div>
      {review.is_spoiler ? <SpoilerBlock>{card}</SpoilerBlock> : card}
      <EngagementBlock commentId={review.id} liked={review.liked_by_me} likeCount={review.like_count} replies={replies} />
    </div>
  );
}

// Comentarios de un libro, siempre por capítulo — no hay una sección
// "general del libro" (se sacó a propósito, para reforzar comentar
// capítulo a capítulo). Arriba de todo, aparte, la reseña final de quienes
// ya terminaron el libro (kind = 'review'), si hay alguna.
//
// Igual que la reseña, la propia cita/comentario/nota de voz tiene el mismo
// menú de 3 puntos junto al nombre — "Editar" abre el modal que corresponde
// (EditQuoteModal, EditCommentModal o EditVoiceModal) y "Eliminar" borra,
// con confirmación.
//
// Debajo de cada uno (reseña, cita, comentario, nota de voz), EngagementBlock
// pone Me gusta + Comentar y el hilo de respuestas — cualquier miembro del
// club los ve. "Compartir" es aparte: solo aparece en tus propios
// comentarios de capítulo y notas de voz (reseñas/citas ya aparecen
// siempre en Inicio, no necesitan esto) y solo tú lo ves.
export function ComentariosScreen({ clubBookId, comments, chapters, volumes, book, clubName, myDisplayName, myProfileId, initialChapterId }) {
  const router = useRouter();
  const orderedChapters = useMemo(() => orderChapters(chapters ?? [], volumes ?? []), [chapters, volumes]);
  // Las respuestas (parent_comment_id no nulo) no son "un comentario más" en
  // ninguna de estas listas — se agrupan aparte y se anidan bajo su original.
  const reviews = useMemo(() => comments.filter((c) => c.kind === 'review' && !c.parent_comment_id), [comments]);
  const repliesByParent = useMemo(() => {
    const map = new Map();
    for (const c of comments) {
      if (!c.parent_comment_id) continue;
      const list = map.get(c.parent_comment_id) ?? [];
      list.push(c);
      map.set(c.parent_comment_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return map;
  }, [comments]);
  // Si se llega con ?capitulo=... (por ejemplo, desde la pastilla de
  // comentarios de Tu camino) arranca en ese capítulo; si no existe entre
  // los del libro, cae al de siempre (el primero).
  const cameFromChapterLink = Boolean(initialChapterId && orderedChapters.some((c) => c.id === initialChapterId));
  const [chapterId, setChapterId] = useState(() => (cameFromChapterLink ? initialChapterId : orderedChapters[0]?.id ?? null));
  // Entrando desde un capítulo puntual, el objetivo es leer y comentar ESE
  // capítulo — no hace falta abrir de entrada ni las reseñas finales (son
  // del libro entero, casi siempre con spoilers del final) ni el selector
  // con todos los demás capítulos. Entrando por el ícono de "Comentarios
  // del club" (sin capítulo puntual) se sigue viendo todo, como siempre.
  const [showChapterPicker, setShowChapterPicker] = useState(!cameFromChapterLink);
  const [editingReview, setEditingReview] = useState(null);
  const [editingQuote, setEditingQuote] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editingVoice, setEditingVoice] = useState(null);
  const [, startDeleteTransition] = useTransition();

  const visibleComments = chapterId ? comments.filter((c) => c.chapter_id === chapterId && !c.parent_comment_id) : [];

  function handleDeleteQuote(commentId) {
    if (!window.confirm('¿Eliminar esta cita? No se puede deshacer.')) return;
    startDeleteTransition(async () => {
      await deleteQuote(commentId);
    });
  }

  function handleDeleteComment(commentId) {
    if (!window.confirm('¿Eliminar este comentario? No se puede deshacer.')) return;
    startDeleteTransition(async () => {
      await deleteComment(commentId);
    });
  }

  function handleDeleteVoice(commentId) {
    if (!window.confirm('¿Eliminar esta nota de voz? No se puede deshacer.')) return;
    startDeleteTransition(async () => {
      await deleteVoiceComment(commentId);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => router.back()}><Icon name="arrow-left" size={18} /></IconButton>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>Comentarios</div>
      </div>

      {!cameFromChapterLink && reviews.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              book={book}
              isOwn={review.profile_id === myProfileId}
              onEdit={setEditingReview}
              replies={repliesByParent.get(review.id) ?? []}
            />
          ))}
        </div>
      )}

      {orderedChapters.length > 0 ? (
        <>
          {showChapterPicker ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', overflowX: 'auto' }}>
              {orderedChapters.map((c) => (
                <Chip key={c.id} selected={chapterId === c.id} onClick={() => setChapterId(c.id)}>{chapterDisplayLabel(c)}</Chip>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                {chapterDisplayLabel(orderedChapters.find((c) => c.id === chapterId))}
              </div>
              <button
                type="button"
                onClick={() => setShowChapterPicker(true)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-link)' }}
              >
                Ver otro capítulo
              </button>
            </div>
          )}

          <NewCommentForm clubBookId={clubBookId} chapterId={chapterId} book={book} clubName={clubName} personName={myDisplayName} />
          <VoiceRecorder clubBookId={clubBookId} chapterId={chapterId} />

          {visibleComments.map((comment) => {
            const name = comment.profiles?.display_name ?? 'Alguien';
            const isOwn = comment.profile_id === myProfileId;
            return (
              <div key={comment.id} style={{ display: 'flex', gap: 10 }}>
                <Avatar name={name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {formatRelativeTime(comment.created_at)}</span>
                    </div>
                    {isOwn && comment.kind === 'quote' && (
                      <PostMenu
                        editLabel="Editar cita"
                        onEdit={() => setEditingQuote(comment)}
                        deleteLabel="Eliminar cita"
                        onDelete={() => handleDeleteQuote(comment.id)}
                      />
                    )}
                    {isOwn && comment.kind === 'text' && (
                      <PostMenu
                        editLabel="Editar comentario"
                        onEdit={() => setEditingComment(comment)}
                        deleteLabel="Eliminar comentario"
                        onDelete={() => handleDeleteComment(comment.id)}
                      />
                    )}
                    {isOwn && comment.kind === 'voice' && (
                      <PostMenu
                        editLabel="Editar nota de voz"
                        onEdit={() => setEditingVoice(comment)}
                        deleteLabel="Eliminar nota de voz"
                        onDelete={() => handleDeleteVoice(comment.id)}
                      />
                    )}
                  </div>
                  <div style={{ marginTop: comment.kind === 'text' ? 0 : 6 }}>
                    {comment.is_spoiler ? (
                      <SpoilerBlock><CommentBody comment={comment} book={book} clubName={clubName} /></SpoilerBlock>
                    ) : (
                      <CommentBody comment={comment} book={book} clubName={clubName} />
                    )}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <EngagementBlock
                      commentId={comment.id}
                      liked={comment.liked_by_me}
                      likeCount={comment.like_count}
                      replies={repliesByParent.get(comment.id) ?? []}
                      share={
                        isOwn && (comment.kind === 'text' || comment.kind === 'voice')
                          ? { shared: comment.shared_to_feed, onToggle: () => toggleShareToFeed(comment.id) }
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {visibleComments.length === 0 && (
            <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '20px 0', textAlign: 'center' }}>
              Sé el primero en comentar este capítulo.
            </div>
          )}
        </>
      ) : (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '20px 0', textAlign: 'center' }}>
          Este club todavía no tiene capítulos — un administrador puede agregarlos desde &ldquo;Gestionar capítulos&rdquo;.
        </div>
      )}

      {editingReview && (
        <FinalReviewModal
          clubBookId={clubBookId}
          book={book}
          myReview={editingReview}
          onClose={() => setEditingReview(null)}
        />
      )}

      {editingQuote && (
        <EditQuoteModal
          quote={editingQuote}
          book={book}
          clubName={clubName}
          personName={myDisplayName}
          onClose={() => setEditingQuote(null)}
        />
      )}

      {editingComment && (
        <EditCommentModal
          comment={editingComment}
          onClose={() => setEditingComment(null)}
        />
      )}

      {editingVoice && (
        <EditVoiceModal
          comment={editingVoice}
          onClose={() => setEditingVoice(null)}
        />
      )}
    </div>
  );
}
