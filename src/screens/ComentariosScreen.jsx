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
import { FinalReviewModal } from './FinalReviewModal.jsx';
import { EditQuoteModal } from '@/components/EditQuoteModal';
import { deleteBookReview, deleteQuote } from '@/app/actions/clubs';
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
// o borrarla.
function ReviewCard({ review, book, isOwn, onEdit }) {
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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
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
    </div>
  );
}

// Comentarios de un libro, siempre por capítulo — no hay una sección
// "general del libro" (se sacó a propósito, para reforzar comentar
// capítulo a capítulo). Arriba de todo, aparte, la reseña final de quienes
// ya terminaron el libro (kind = 'review'), si hay alguna.
//
// La propia cita (kind = 'quote') tiene el mismo menú de 3 puntos que la
// reseña — "Editar" abre EditQuoteModal (texto + estilo, regenera la
// tarjeta guardada) y "Eliminar" borra, con confirmación.
export function ComentariosScreen({ clubBookId, comments, chapters, volumes, book, clubName, myDisplayName, myProfileId }) {
  const router = useRouter();
  const orderedChapters = useMemo(() => orderChapters(chapters ?? [], volumes ?? []), [chapters, volumes]);
  const reviews = useMemo(() => comments.filter((c) => c.kind === 'review'), [comments]);
  const [chapterId, setChapterId] = useState(orderedChapters[0]?.id ?? null);
  const [editingReview, setEditingReview] = useState(null);
  const [editingQuote, setEditingQuote] = useState(null);
  const [, startQuoteTransition] = useTransition();

  const visibleComments = chapterId ? comments.filter((c) => c.chapter_id === chapterId) : [];

  function handleDeleteQuote(commentId) {
    if (!window.confirm('¿Eliminar esta cita? No se puede deshacer.')) return;
    startQuoteTransition(async () => {
      await deleteQuote(commentId);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => router.back()}><Icon name="arrow-left" size={18} /></IconButton>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>Comentarios</div>
      </div>

      {reviews.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} book={book} isOwn={review.profile_id === myProfileId} onEdit={setEditingReview} />
          ))}
        </div>
      )}

      {orderedChapters.length > 0 ? (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', overflowX: 'auto' }}>
            {orderedChapters.map((c) => (
              <Chip key={c.id} selected={chapterId === c.id} onClick={() => setChapterId(c.id)}>{chapterDisplayLabel(c)}</Chip>
            ))}
          </div>

          <NewCommentForm clubBookId={clubBookId} chapterId={chapterId} book={book} clubName={clubName} personName={myDisplayName} />
          <VoiceRecorder clubBookId={clubBookId} chapterId={chapterId} />

          {visibleComments.map((comment) => {
            const name = comment.profiles?.display_name ?? 'Alguien';
            const isOwnQuote = comment.kind === 'quote' && comment.profile_id === myProfileId;
            return (
              <div key={comment.id} style={{ display: 'flex', gap: 10 }}>
                <Avatar name={name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {formatRelativeTime(comment.created_at)}</span>
                    </div>
                    {isOwnQuote && (
                      <PostMenu
                        editLabel="Editar cita"
                        onEdit={() => setEditingQuote(comment)}
                        deleteLabel="Eliminar cita"
                        onDelete={() => handleDeleteQuote(comment.id)}
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
    </div>
  );
}
