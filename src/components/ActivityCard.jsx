'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { DownloadQuoteImageButton } from '@/components/DownloadQuoteImageButton';
import { BookReviewCard } from '@/components/BookReviewCard';
import { PostMenu } from '@/components/PostMenu';
import { EditPostModal } from '@/components/EditPostModal';
import { EditQuoteModal } from '@/components/EditQuoteModal';
import { LikeButton } from '@/components/LikeButton';
import { deleteBookReview, deleteQuote, toggleCommentLike } from '@/app/actions/clubs';
import { deletePost, togglePostLike } from '@/app/actions/posts';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

// Una tarjeta de actividad, con el mismo orden que un posteo de Instagram:
// arriba quién publicó (si corresponde), después la imagen sola y limpia
// —nada escrito encima—, y abajo el texto (de qué se trata, la cita o el
// comentario). Tocar el bloque de abajo despliega el texto completo.
//
// Las reseñas finales (kind = 'review', al declarar un libro terminado) son
// la excepción: el título va junto a la portada, en un panel de color
// propio (BookReviewCard) — no una imagen de fondo con texto encima.
//
// La usan tanto el Perfil (donde ya se sabe de quién es la actividad, no
// hace falta repetirlo) como el Inicio (donde "author" identifica quién
// publicó cada tarjeta del feed, con su nombre y foto en una fila propia).
//
// La reseña final es la excepción a "no hace falta repetirlo": ahí el
// nombre (+ fecha) va siempre, en Perfil igual que en Inicio, para que el
// menú de 3 puntos, del otro lado de la fila, quede siempre a la derecha —
// sin nombre a la izquierda quedaba pegado al borde izquierdo. En la propia
// reseña (isOwn), ese menú permite borrarla directo desde acá; "Editar"
// lleva a los comentarios del club, donde vive el formulario de edición
// (acá no se cuenta con club_book_id para abrir el mismo modal).
//
// Las fotos y las citas propias (isPhoto/isQuote && isOwn) tienen el mismo
// menú de 3 puntos, siempre a la derecha (si no hay "author" a la
// izquierda —Perfil—, el encabezado usa flex-end en vez de space-between,
// para que no se pegue a la izquierda con un solo elemento adentro).
// "Editar" abre un modal ahí mismo — en la foto, solo el texto (la foto no
// se reemplaza); en la cita, el texto y el estilo, que regenera la tarjeta
// guardada — y "Eliminar" borra directo, con confirmación. Las dos limpian
// también Storage (deletePost/deleteQuote borran el archivo), porque cada
// una es dueña de un único archivo propio. Las notas de voz quedan
// pendientes a propósito (ver README).
//
// "Me gusta" (LikeButton) va en todo lo que aparece acá — lo ve y lo puede
// tocar cualquiera, no solo isOwn. "Responder" y "Compartir" no viven acá
// todavía: solo en Comentarios del club (ver README).
export function ActivityCard({ activity, canOpenClub, personName, author, isOwn }) {
  const [expanded, setExpanded] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [editingQuote, setEditingQuote] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDeleteReview() {
    if (!window.confirm('¿Eliminar esta reseña? No se puede deshacer.')) return;
    startTransition(async () => {
      await deleteBookReview(activity.id);
    });
  }

  function handleDeletePhoto() {
    if (!window.confirm('¿Eliminar esta foto? No se puede deshacer.')) return;
    startTransition(async () => {
      await deletePost(activity.id);
    });
  }

  function handleDeleteQuote() {
    if (!window.confirm('¿Eliminar esta cita? No se puede deshacer.')) return;
    startTransition(async () => {
      await deleteQuote(activity.id);
    });
  }
  const isPhoto = activity.kind === 'photo';
  const isQuote = activity.kind === 'quote';
  const isReview = activity.kind === 'review';
  // Si la cita se publicó con la tarjeta ya armada (migración 021), esa
  // imagen ES el contenido — no hace falta repetir la cita como texto abajo
  // (ya está dibujada adentro). Las citas de antes de esa migración (o
  // donde falló la subida en su momento) siguen con el tratamiento
  // genérico: portada del libro de fondo + la cita como texto abajo.
  const hasQuoteImage = isQuote && Boolean(activity.quote_image_url);
  const showAsImage = isPhoto || hasQuoteImage;
  const text = isPhoto
    ? activity.body
    : activity.kind === 'voice'
      ? (activity.voice_transcript ?? 'Publicó una nota de voz.')
      : activity.body;
  const backgroundUrl = isPhoto ? activity.photo_url : hasQuoteImage ? activity.quote_image_url : activity.book_cover_url;

  // Las citas con imagen guardada de antes de que los tres estilos se
  // unificaran a 3:4 quedaron con su proporción vieja (Portada/Editorial en
  // 4:5, Oscuro cuadrado) — un "cover" las agranda y les corta los costados,
  // cortando el texto de la propia tarjeta. Con "contain" se ve completa
  // siempre, sea cual sea su proporción; las citas nuevas (ya 3:4) llenan el
  // marco igual, porque coinciden exacto con el contenedor.
  const background = !backgroundUrl
    ? 'var(--accent-500)'
    : hasQuoteImage
      ? `url(${backgroundUrl}) center / contain no-repeat, var(--hero-bg)`
      : `center/cover no-repeat url(${backgroundUrl})`;

  const metaText = isPhoto
    ? `Compartió una foto · ${formatRelativeTime(activity.created_at)}`
    : hasQuoteImage
      ? `Publicó una cita · ${formatRelativeTime(activity.created_at)}`
      : `${activity.club_name} · ${formatRelativeTime(activity.created_at)}`;

  const authorRow = author && (
    <Link
      href={`/perfil/${author.id}`}
      style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
    >
      <Avatar name={author.display_name} src={author.avatar_url} size={30} />
      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{author.display_name}</span>
    </Link>
  );

  if (isReview) {
    // El nombre va siempre — a diferencia del resto de la tarjeta (donde en
    // Perfil se omite por redundante), acá hace falta el mismo encabezado
    // en Perfil y en Inicio: es lo que hace que los 3 puntos, al quedar del
    // otro lado en un "space-between", terminen siempre a la derecha.
    const reviewName = author ? (
      <Link href={`/perfil/${author.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <Avatar name={author.display_name} src={author.avatar_url} size={30} />
        <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{author.display_name}</span>
      </Link>
    ) : (
      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{personName}</span>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: pending ? 0.6 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {reviewName}
            <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>{formatRelativeTime(activity.created_at)}</span>
          </div>
          {isOwn && (
            <PostMenu
              editLabel="Editar reseña"
              onEdit={() => router.push(`/club/${activity.club_id}/comentarios`)}
              deleteLabel="Eliminar reseña"
              onDelete={handleDeleteReview}
            />
          )}
        </div>
        <div onClick={() => setExpanded((e) => !e)} style={{ cursor: 'pointer' }}>
          <BookReviewCard title={activity.title} body={activity.body} coverUrl={activity.book_cover_url} expanded={expanded} />
        </div>
        <LikeButton liked={activity.liked_by_me} count={activity.like_count} onToggle={() => toggleCommentLike(activity.id)} />
        <div style={{ padding: '0 2px' }}>
          <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>
            {activity.club_name} · terminó {activity.book_title}
          </div>
          {expanded && canOpenClub && (
            <Link
              href={`/club/${activity.club_id}/comentarios`}
              style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-link)' }}
            >
              Ver el resto de los comentarios en el club
              <Icon name="arrow-right" size={12} color="var(--text-link)" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: pending ? 0.6 : 1 }}>
      {(authorRow || ((isPhoto || isQuote) && isOwn)) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: authorRow ? 'space-between' : 'flex-end' }}>
          {authorRow}
          {isPhoto && isOwn && (
            <PostMenu
              editLabel="Editar foto"
              onEdit={() => setEditingPhoto(true)}
              deleteLabel="Eliminar foto"
              onDelete={handleDeletePhoto}
            />
          )}
          {isQuote && isOwn && (
            <PostMenu
              editLabel="Editar cita"
              onEdit={() => setEditingQuote(true)}
              deleteLabel="Eliminar cita"
              onDelete={handleDeleteQuote}
            />
          )}
        </div>
      )}

      {/* La imagen va sola, sin nada escrito encima — igual que un posteo. */}
      <div
        style={{
          aspectRatio: '3 / 4', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)', flexShrink: 0, background,
        }}
      />

      <LikeButton
        liked={activity.liked_by_me}
        count={activity.like_count}
        onToggle={() => (isPhoto ? togglePostLike(activity.id) : toggleCommentLike(activity.id))}
      />

      <div onClick={() => setExpanded((e) => !e)} style={{ cursor: 'pointer', padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 6 }}>
          {isPhoto && <Icon name="camera" size={12} color="var(--text-tertiary)" />}
          {hasQuoteImage && <Icon name="quote" size={12} color="var(--text-tertiary)" />}
          {metaText}
        </div>
        {!showAsImage && (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-md)', color: 'var(--text-primary)' }}>
              {activity.book_title}
            </div>
            <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
              {activity.book_author}
            </div>
          </>
        )}
        {!hasQuoteImage && text && (
          <div
            style={{
              fontSize: 'var(--fs-sm)', marginTop: isPhoto ? 4 : 8, lineHeight: 'var(--lh-snug)',
              color: isQuote ? 'var(--gold-700)' : 'var(--text-secondary)',
              fontStyle: isQuote ? 'italic' : 'normal',
              whiteSpace: 'pre-wrap',
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 2,
              WebkitBoxOrient: 'vertical',
              overflow: expanded ? 'visible' : 'hidden',
            }}
          >
            {isPhoto ? text : `“${text}”`}
          </div>
        )}
        {expanded && isQuote && activity.quote_style && (
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10 }}>
            <DownloadQuoteImageButton
              style={activity.quote_style}
              quoteText={activity.body}
              book={{ title: activity.book_title, author: activity.book_author, cover_url: activity.book_cover_url }}
              clubName={activity.club_name}
              personName={personName}
              imageUrl={activity.quote_image_url}
            />
          </div>
        )}
        {expanded && canOpenClub && !isPhoto && (
          <Link
            href={`/club/${activity.club_id}/comentarios`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-link)' }}
          >
            Ver el resto de los comentarios en el club
            <Icon name="arrow-right" size={12} color="var(--text-link)" />
          </Link>
        )}
      </div>

      {editingPhoto && (
        <EditPostModal
          postId={activity.id}
          photoUrl={activity.photo_url}
          initialCaption={activity.body}
          onClose={() => setEditingPhoto(false)}
        />
      )}

      {editingQuote && (
        <EditQuoteModal
          quote={{ id: activity.id, body: activity.body, quote_style: activity.quote_style }}
          book={{ title: activity.book_title, author: activity.book_author, cover_url: activity.book_cover_url }}
          clubName={activity.club_name}
          personName={personName}
          onClose={() => setEditingQuote(false)}
        />
      )}
    </div>
  );
}
