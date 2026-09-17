'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Chip } from '@/design-system/components/core/Chip.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { SpoilerBlock } from '@/design-system/components/content/SpoilerBlock.jsx';
import { VoiceNotePlayer } from '@/design-system/components/content/VoiceNotePlayer.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { NewCommentForm } from '@/components/NewCommentForm';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { ChapterComposerTabs } from '@/components/ChapterComposerTabs';
import { PhotoCarousel } from '@/components/PhotoCarousel';
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

// Mismo tope que ActivityCard.jsx (Inicio/Perfil) para el texto de un
// comentario o una cita — "igual que se ve cuando lo compartimos al feed".
const TEXT_LINE_CLAMP = 5;

// Una fila de esta lista — cita, comentario o nota de voz — calcada de
// ActivityCard (Inicio/Perfil): mismo tamaño de avatar (30, no 36), mismo
// borde entre una fila y la siguiente (no el "aire" de un gap parejo),
// mismo tratamiento tipográfico del nombre + fecha, la cita como texto
// itálico dorado en vez de la caja de Blockquote (con fondo propio, que
// acá se sacó), y el mismo recorte a `TEXT_LINE_CLAMP` líneas con un "más"
// para desplegar si el texto (comentario o cita) es largo — antes esta
// pantalla mostraba TODO el texto siempre, sin cortar nada; ahora, tocar
// el bloque lo despliega completo, igual que en el feed.
//
// Moderación (migración 055) — un administrador del club ve el mismo menú
// de 3 puntos en el comentario/cita/nota de voz de CUALQUIERA, no solo en
// el propio (`canModerate = isAdmin && !isOwn`), pero solo con "Eliminar"
// — nunca "Editar" contenido ajeno, eso sigue siendo únicamente de quien
// lo escribió. `onDeleteX` ya sirve para los dos casos: `deleteComment`/
// `deleteQuote`/`deleteVoiceComment` (clubs.js/media.js) chequean del lado
// del servidor si sos el dueño o admin del club antes de borrar.
function CommentRow({ comment, book, clubName, isOwn, isAdmin, onEditQuote, onDeleteQuote, onEditComment, onDeleteComment, onEditVoice, onDeleteVoice, replies, canShare, readOnly }) {
  const canModerate = isAdmin && !isOwn && !readOnly;
  const canEditOwn = isOwn && !readOnly;
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef(null);
  const name = comment.profiles?.display_name ?? 'Alguien';
  const isQuote = comment.kind === 'quote';
  const isVoice = comment.kind === 'voice';
  // Voz no se recorta (el reproductor ya es compacto de por sí); foto/cita/
  // comentario de texto sí, igual que en el feed.
  const isClampable = !isVoice;

  useEffect(() => {
    if (!isClampable || !textRef.current) return;
    setIsTruncated(textRef.current.scrollHeight > textRef.current.clientHeight + 1);
  }, [isClampable, comment.body]);

  const body = isVoice ? (
    <VoiceNotePlayer
      src={comment.audio_url ?? undefined}
      duration={formatDuration(comment.voice_duration_seconds)}
      transcript={comment.voice_transcript ?? undefined}
    />
  ) : (
    <div>
      <div
        ref={textRef}
        onClick={() => setExpanded((e) => !e)}
        style={{
          fontSize: 'var(--fs-sm)', lineHeight: 'var(--lh-snug)', whiteSpace: 'pre-wrap', cursor: 'pointer',
          color: isQuote ? 'var(--gold-700)' : 'var(--text-secondary)',
          fontStyle: isQuote ? 'italic' : 'normal',
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 'unset' : TEXT_LINE_CLAMP,
          WebkitBoxOrient: 'vertical',
          overflow: expanded ? 'visible' : 'hidden',
        }}
      >
        {isQuote ? `"${comment.body}"` : comment.body}
        {!expanded && isTruncated && <span style={{ fontWeight: 700, color: 'var(--text-tertiary)' }}> más</span>}
      </div>
      {isQuote && comment.quote_style && (
        <div style={{ marginTop: 8 }}>
          <DownloadQuoteImageButton
            style={comment.quote_style}
            quoteText={comment.body}
            book={book}
            clubName={clubName}
            personName={name}
            imageUrl={comment.quote_image_url}
          />
        </div>
      )}
      {comment.image_urls?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <PhotoCarousel urls={comment.image_urls} aspectRatio="4 / 3" maxWidth={320} />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 10 }}>
      <Avatar name={name} src={comment.profiles?.avatar_url} size={30} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)' }}>
            <span style={{ fontWeight: 700 }}>{name}</span>{' '}
            <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {formatRelativeTime(comment.created_at)}</span>
          </span>
          {(canEditOwn || canModerate) && isQuote && (
            <PostMenu editLabel="Editar cita" onEdit={canEditOwn ? onEditQuote : undefined} deleteLabel="Eliminar cita" onDelete={onDeleteQuote} />
          )}
          {(canEditOwn || canModerate) && comment.kind === 'text' && (
            <PostMenu editLabel="Editar comentario" onEdit={canEditOwn ? onEditComment : undefined} deleteLabel="Eliminar comentario" onDelete={onDeleteComment} />
          )}
          {(canEditOwn || canModerate) && isVoice && (
            <PostMenu editLabel="Editar nota de voz" onEdit={canEditOwn ? onEditVoice : undefined} deleteLabel="Eliminar nota de voz" onDelete={onDeleteVoice} />
          )}
        </div>
        {comment.is_spoiler ? <SpoilerBlock>{body}</SpoilerBlock> : body}
        <EngagementBlock
          commentId={comment.id}
          liked={comment.liked_by_me}
          likeCount={comment.like_count}
          replies={replies}
          share={canShare && !readOnly ? { shared: comment.shared_to_feed, onToggle: () => toggleShareToFeed(comment.id) } : undefined}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

// La reseña final de alguien que terminó el libro: el título y el texto
// (hasta 5 líneas) dentro del mismo panel de color que la portada
// (BookReviewCard, mismo bloque que usa ActivityCard en Inicio y Perfil) —
// tocar la tarjeta despliega el resto. En la propia reseña, el menú de 3
// puntos junto al nombre ofrece editarla (abre FinalReviewModal, precargada)
// o borrarla. Debajo, Me gusta + Comentar y el hilo de respuestas — igual
// que en cualquier otro comentario (EngagementBlock).
//
// A propósito, ESTE menú no se apaga con `readOnly` (migración 058, libro
// anterior del club) — la propia reseña sigue pudiéndose editar/borrar
// aunque el resto de la pantalla quede de solo lectura; solo su hilo de
// respuestas (EngagementBlock) se congela, igual que el del resto de los
// comentarios.
function ReviewCard({ review, book, isOwn, onEdit, onDelete, replies, readOnly }) {
  const [expanded, setExpanded] = useState(false);
  const name = review.profiles?.display_name ?? 'Alguien';

  const card = (
    <div onClick={() => setExpanded((e) => !e)} style={{ cursor: 'pointer' }}>
      <BookReviewCard title={review.title} body={review.body} coverUrl={book?.cover_url} expanded={expanded} />
    </div>
  );
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 10 }}>
      <Avatar name={name} src={review.profiles?.avatar_url} size={30} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)' }}>
            <span style={{ fontWeight: 700 }}>{name}</span>{' '}
            <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· terminó el libro · {formatRelativeTime(review.created_at)}</span>
          </span>
          {isOwn && (
            <PostMenu
              editLabel="Editar reseña"
              onEdit={() => onEdit(review)}
              deleteLabel="Eliminar reseña"
              onDelete={onDelete}
            />
          )}
        </div>
        {review.is_spoiler ? <SpoilerBlock>{card}</SpoilerBlock> : card}
        <EngagementBlock commentId={review.id} liked={review.liked_by_me} likeCount={review.like_count} replies={replies} readOnly={readOnly} />
      </div>
    </div>
  );
}

// La barra para agregar algo, entrando desde un capítulo puntual (Tu
// camino) — antes acá vivía un `NewCommentForm` + `VoiceRecorder` siempre
// desplegados, los dos a la vez, al final de la pantalla. Ahora es la
// misma dinámica que "Compartir" en Perfil (`PostComposer`): una pastilla
// angosta ("Avatar + placeholder"), que al tocarla abre el mismo `Modal`
// con las cuatro pestañas de siempre — Comentario/Cita/Foto·GIF/Voz
// (`ChapterComposerTabs`, compartido con el broche "+" de Tu camino) — en
// vez de mostrar los formularios sueltos, sin pestañas, adentro de la
// propia pantalla.
function ChapterComposerBar({ clubBookId, chapterId, book, myProfile }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Comentar, citar, agregar una foto o GIF, o grabar una nota de voz en este capítulo"
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '8px 10px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
          background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)',
          textAlign: 'left', fontFamily: 'var(--font-body)',
        }}
      >
        <Avatar name={myProfile?.display_name} src={myProfile?.avatar_url} size={28} />
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
          ¿Qué te pareció este capítulo?
        </span>
      </button>

      {open && (
        <Modal title="Agregar" onClose={() => setOpen(false)}>
          <ChapterComposerTabs clubBookId={clubBookId} chapterId={chapterId} book={book} onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
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
// `readOnly` (migración 058) — solo lo manda la página cuando se pidió un
// libro puntual (?libro=) que el club ya dejó atrás: se puede seguir
// viendo todo lo que ya se dijo (y tu propia reseña, si la escribiste,
// se puede seguir editando/borrando — ReviewCard, arriba), pero desaparece
// toda forma de agregar algo nuevo (la barra/formulario de siempre) y de
// editar o borrar cualquier otra cosa (cita, comentario, nota de voz,
// aunque sea tuya) o de responder en su hilo (EngagementBlock). Entrando
// sin ese parámetro (el libro activo de siempre) esta pantalla se comporta
// exactamente igual que antes.
export function ComentariosScreen({ clubBookId, comments, chapters, volumes, book, clubName, myProfileId, myProfile, isAdmin = false, initialChapterId, readOnly = false }) {
  const router = useRouter();
  const orderedChapters = useMemo(() => orderChapters(chapters ?? [], volumes ?? []), [chapters, volumes]);
  // Antes de esto, borrar acá dependía por completo de que revalidatePath
  // (clubs.js/media.js) alcanzara a refrescar los props de esta pantalla —
  // pasaba, pero no al toque: mientras tanto, el comentario/cita/nota de
  // voz recién borrada se seguía viendo, como si no hubiera pasado nada,
  // hasta actualizar la página a mano. `deletedIds` la saca de la vista al
  // toque, del lado del cliente, sin esperar ningún round-trip extra — y
  // el `toast` (mismo pill oscuro que ya usa ChapterPath para "Listo, vas
  // por el Cap. N") confirma que de verdad se borró.
  const [deletedIds, setDeletedIds] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // Las respuestas (parent_comment_id no nulo) no son "un comentario más" en
  // ninguna de estas listas — se agrupan aparte y se anidan bajo su original.
  const reviews = useMemo(
    () => comments.filter((c) => c.kind === 'review' && !c.parent_comment_id && !deletedIds.has(c.id)),
    [comments, deletedIds],
  );
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
  const [editingReview, setEditingReview] = useState(null);
  const [editingQuote, setEditingQuote] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editingVoice, setEditingVoice] = useState(null);
  const [, startDeleteTransition] = useTransition();

  const visibleComments = chapterId
    ? comments.filter((c) => c.chapter_id === chapterId && !c.parent_comment_id && !deletedIds.has(c.id))
    : [];

  // Entrando desde un capítulo puntual (pastilla de Tu camino), el objetivo
  // es leer lo que ya se dijo de ESE capítulo y comentar si querés — nada
  // de elegir otro capítulo (no hace falta ni el selector ni el link para
  // desplegarlo), y para agregar algo hay una barra fija al pie
  // (`ChapterComposerBar`, más abajo), no un formulario suelto en medio de
  // la pantalla. Entrando por el ícono de "Comentarios del club" (sin
  // capítulo puntual — hoy no hay ningún link que lo dispare) se sigue
  // viendo todo como antes: selector completo arriba, el formulario de
  // siempre (`composeBlock`) antes que la lista.
  const composeBlock = (
    <>
      <NewCommentForm clubBookId={clubBookId} chapterId={chapterId} book={book} />
      <VoiceRecorder extraFields={{ clubBookId, chapterId }} />
    </>
  );

  // Sacarlo de la vista (deletedIds) y el toast de confirmación son los
  // mismos para los tres tipos — solo cambia qué Server Action se llama y
  // qué dice el toast.
  function afterDelete(commentId, result, successMessage) {
    if (result?.error) {
      setDeleteError(result.error);
      return;
    }
    setDeleteError(null);
    setDeletedIds((prev) => new Set(prev).add(commentId));
    setToast(successMessage);
  }

  function handleDeleteQuote(commentId) {
    if (!window.confirm('¿Eliminar esta cita? No se puede deshacer.')) return;
    startDeleteTransition(async () => {
      afterDelete(commentId, await deleteQuote(commentId), 'Cita eliminada');
    });
  }

  function handleDeleteComment(commentId) {
    if (!window.confirm('¿Eliminar este comentario? No se puede deshacer.')) return;
    startDeleteTransition(async () => {
      afterDelete(commentId, await deleteComment(commentId), 'Comentario eliminado');
    });
  }

  function handleDeleteVoice(commentId) {
    if (!window.confirm('¿Eliminar esta nota de voz? No se puede deshacer.')) return;
    startDeleteTransition(async () => {
      afterDelete(commentId, await deleteVoiceComment(commentId), 'Nota de voz eliminada');
    });
  }

  function handleDeleteReview(reviewId) {
    if (!window.confirm('¿Eliminar esta reseña? No se puede deshacer.')) return;
    startDeleteTransition(async () => {
      afterDelete(reviewId, await deleteBookReview(reviewId), 'Reseña eliminada');
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => router.back()}><Icon name="arrow-left" size={18} /></IconButton>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>Comentarios</div>
      </div>

      {toast && (
        <div
          style={{
            alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--neutral-900)', color: 'var(--hero-cream)', fontSize: 'var(--fs-xs)', fontWeight: 600,
            padding: '7px 12px', borderRadius: 'var(--radius-pill)', boxShadow: 'var(--shadow-md)',
          }}
        >
          <Icon name="check" size={12} color="var(--success)" />
          {toast}
        </div>
      )}

      {deleteError && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)' }}>{deleteError}</div>
      )}

      {!cameFromChapterLink && reviews.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-subtle)' }}>
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              book={book}
              isOwn={review.profile_id === myProfileId}
              onEdit={setEditingReview}
              onDelete={() => handleDeleteReview(review.id)}
              replies={repliesByParent.get(review.id) ?? []}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {orderedChapters.length > 0 ? (
        <>
          {cameFromChapterLink ? (
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {chapterDisplayLabel(orderedChapters.find((c) => c.id === chapterId))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', overflowX: 'auto' }}>
              {orderedChapters.map((c) => (
                <Chip key={c.id} selected={chapterId === c.id} onClick={() => setChapterId(c.id)}>{chapterDisplayLabel(c)}</Chip>
              ))}
            </div>
          )}

          {!cameFromChapterLink && !readOnly && composeBlock}

          {visibleComments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-subtle)' }}>
              {visibleComments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  book={book}
                  clubName={clubName}
                  isOwn={comment.profile_id === myProfileId}
                  isAdmin={isAdmin}
                  onEditQuote={() => setEditingQuote(comment)}
                  onDeleteQuote={() => handleDeleteQuote(comment.id)}
                  onEditComment={() => setEditingComment(comment)}
                  onDeleteComment={() => handleDeleteComment(comment.id)}
                  onEditVoice={() => setEditingVoice(comment)}
                  onDeleteVoice={() => handleDeleteVoice(comment.id)}
                  replies={repliesByParent.get(comment.id) ?? []}
                  canShare={comment.profile_id === myProfileId && (comment.kind === 'text' || comment.kind === 'voice')}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}

          {visibleComments.length === 0 && (
            <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '20px 0', textAlign: 'center' }}>
              Sé el primero en comentar este capítulo.
            </div>
          )}

          {cameFromChapterLink && !readOnly && (
            <div
              style={{
                position: 'sticky', bottom: 'calc(70px + env(safe-area-inset-bottom, 8px))',
                background: 'var(--surface-page)', borderTop: '1px solid var(--border-subtle)',
                padding: '10px 0 4px', marginTop: 4,
              }}
            >
              <ChapterComposerBar clubBookId={clubBookId} chapterId={chapterId} book={book} myProfile={myProfile} />
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
