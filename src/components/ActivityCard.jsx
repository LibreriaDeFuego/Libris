'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { VoiceNotePlayer } from '@/design-system/components/content/VoiceNotePlayer.jsx';
import { DownloadQuoteImageButton } from '@/components/DownloadQuoteImageButton';
import { BookReviewCard } from '@/components/BookReviewCard';
import { PostMenu } from '@/components/PostMenu';
import { EditPostModal } from '@/components/EditPostModal';
import { EditQuoteModal } from '@/components/EditQuoteModal';
import { LikeButton } from '@/components/LikeButton';
import { RepostButton } from '@/components/RepostButton';
import { EngagementBlock } from '@/components/EngagementBlock';
import { PhotoCommentsBlock } from '@/components/PhotoCommentsBlock';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { QuoteFeedCard } from '@/components/QuoteFeedCard';
import { deleteBookReview, deleteQuote, toggleCommentLike } from '@/app/actions/clubs';
import { deletePost } from '@/app/actions/posts';
import { deleteProfileQuote, toggleQuoteLike } from '@/app/actions/quotes';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

// Una tarjeta de actividad, al estilo timeline de X en vez de Instagram (ver
// README): arriba quién publicó (si corresponde), después el texto (de qué
// se trata, la cita o el comentario, tocable para desplegarlo completo), y
// recién ahí la imagen sola y limpia —nada escrito encima—, sin tarjeta ni
// sombra propia: cada publicación es una fila separada de la siguiente por
// una línea fina (borderBottom), no por una tarjeta con aire alrededor.
// Antes iba la imagen primero y el texto después, como un posteo de
// Instagram — se invirtió el orden al pedir una estética más parecida a X.
//
// Cuando hay foto de perfil (author), va en su propia columna izquierda
// fija (avatarLink) y todo lo demás —nombre, texto, imagen, acciones—
// se alinea a su derecha (misma columna, no solo el nombre), igual que en
// X. Antes el avatar y el nombre eran un único bloque en una fila propia,
// y el resto de la tarjeta arrancaba desde el borde izquierdo sin alinearse
// con el nombre.
//
// Las reseñas finales (kind = 'review', al declarar un libro terminado) son
// la excepción: el título va junto a la portada, en un panel de color
// propio (BookReviewCard) — no una imagen de fondo con texto encima.
//
// La usan tanto el Perfil como el Inicio, y las dos pantallas pasan
// siempre "author" — antes Perfil solo lo pasaba para la reseña final ("ya
// se sabe de quién es el perfil, no hace falta repetirlo"), pero sin
// nombre tampoco había avatar, y la tarjeta de foto/cita/comentario/nota
// de voz quedaba sin nada a la izquierda para alinear el resto — se pidió
// mostrar siempre el nombre (+ foto), en Perfil igual que en Inicio.
//
// El fallback sin "author" (encabezado en flex-end en vez de
// space-between, para que el menú de 3 puntos no quede pegado al borde
// izquierdo con un solo elemento adentro) queda igual por las dudas, pero
// ya no se dispara en ninguna pantalla real de la app.
//
// En la propia reseña (isOwn), el menú de 3 puntos permite borrarla
// directo desde acá; "Editar" lleva a los comentarios del club, donde vive
// el formulario de edición (acá no se cuenta con club_book_id para abrir
// el mismo modal).
// "Editar" abre un modal ahí mismo — en la foto, solo el texto (la foto no
// se reemplaza); en la cita, el texto y el estilo, que regenera la tarjeta
// guardada — y "Eliminar" borra directo, con confirmación. Las dos limpian
// también Storage (deletePost/deleteQuote borran el archivo), porque cada
// una es dueña de un único archivo propio. Las notas de voz quedan
// pendientes a propósito (ver README).
//
// "Me gusta" (LikeButton) va en todo lo que aparece acá — lo ve y lo puede
// tocar cualquiera, no solo isOwn. La reseña y la cita, además, tienen
// "Comentar" con su hilo (EngagementBlock, mismo componente que usa
// Comentarios del club — "replies" ya viene armado desde recent_activity/
// profile_activity). Comentario de capítulo y nota de voz se quedan con
// solo el corazón acá (Comentar para esos dos sigue siendo solo del
// club). Las fotos tienen su propia versión simplificada
// (PhotoCommentsBlock): comentarios en lista plana, sin hilo ni su propio
// "me gusta" — "Compartir" no aplica a ninguno de los tres, es solo para
// comentarios de capítulo/notas de voz, y ese vive solo en el club.
//
// El texto (cita, comentario, foto) se corta a 5 líneas — mismo tope que ya
// usa BookReviewCard para la reseña — con un "más" al final si de verdad se
// cortó (no medido a ojo: un useEffect compara scrollHeight/clientHeight
// después de pintar). Tocar el bloque entero lo despliega igual, "más" es
// solo la pista visible de que hay más para leer.
const TEXT_LINE_CLAMP = 5;

// Igual que en ComentariosScreen.jsx/EditVoiceModal.jsx — sin un util
// compartido, tres líneas no ameritan sacar un archivo aparte.
function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

// Repostear (migración 039) — reenviar la publicación de OTRA persona a tu
// feed, con RepostButton (ícono+número, mismo trato que LikeButton) en la
// fila de acciones. Cuando la tarjeta llega marcada como repost
// (activity.is_repost, calculado en recent_activity/profile_activity), se
// agrega una línea chica arriba de todo ("Fulana compartió esto") — el
// resto de la tarjeta (avatar, nombre, contenido) sigue mostrando siempre
// al autor ORIGINAL, nunca a quien reposteó: "author"/"activity.profile_id"
// ya vienen resueltos así desde la función. "me gusta"/comentar del
// repost apuntan al contenido original (activity.id es siempre el id
// original, reposteado o no) — repostear no crea su propio hilo aparte.
export function ActivityCard({ activity, canOpenClub, personName, author, isOwn, myProfileId }) {
  const [expanded, setExpanded] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [editingQuote, setEditingQuote] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const textRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

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

  // Una cita de club (comments.kind='quote', club_id siempre presente —
  // esa columna es NOT NULL) tiene hilo de respuestas y se puede
  // repostear; una cita del PERFIL (profile_quotes, migración 049,
  // club_id siempre null porque no cuelga de ningún club_book) no tiene
  // ninguna de las dos todavía — se distinguen por si trae club_id.
  function handleDeleteQuote() {
    if (!window.confirm('¿Eliminar esta cita? No se puede deshacer.')) return;
    startTransition(async () => {
      if (activity.club_id) await deleteQuote(activity.id);
      else await deleteProfileQuote(activity.id);
    });
  }

  const isPhoto = activity.kind === 'photo';
  const isQuote = activity.kind === 'quote';
  const isProfileQuote = isQuote && !activity.club_id;
  const isReview = activity.kind === 'review';
  // Una publicación de solo texto (migración 049) es isPhoto con
  // photo_url null — no hay ninguna imagen que mostrar de fondo.
  const hasPhoto = isPhoto && Boolean(activity.photo_url);
  // Una nota de voz de post (migración 052) — a diferencia de una nota de
  // voz de club compartida al feed (kind = 'voice', más abajo, que acá
  // solo muestra la transcripción como texto porque el audio se reproduce
  // en la pantalla de Comentarios), un post no tiene ninguna otra pantalla
  // más que el feed — así que acá SÍ hay un reproductor de verdad.
  const hasVoice = isPhoto && Boolean(activity.voice_url);
  // Si la cita se publicó con la tarjeta ya armada (migración 021), esa
  // imagen ES el contenido — no hace falta repetir la cita como texto abajo
  // (ya está dibujada adentro). Las citas de antes de esa migración (o
  // donde falló la subida en su momento, o una cita del perfil — esas no
  // tienen tarjeta armada todavía) siguen con el tratamiento genérico:
  // portada del libro de fondo + la cita como texto abajo.
  const hasQuoteImage = isQuote && Boolean(activity.quote_image_url);
  // La estética propia de una cita (migración 050) — se usa en vez del
  // tratamiento genérico solo si NO hay una tarjeta-imagen guardada (esa
  // sigue ganando, es lo más fiel a lo que se eligió al publicar) y la
  // cita SÍ tiene un card_style guardado — una cita de antes de esta
  // migración no tiene ninguno, y sigue cayendo en el tratamiento
  // genérico de siempre, sin cambios.
  const hasCardStyle = isQuote && !hasQuoteImage && Boolean(activity.card_style);
  // Un comentario de texto puede llevar, opcional, un carrusel de fotos o
  // GIF propios (migraciones 041/042) — reemplaza a la portada del libro
  // que ocupaba ese lugar por default, con PhotoCarousel en vez del <div>
  // de fondo de siempre (soporta más de una foto, ese no).
  const commentImages = activity.kind === 'text' ? activity.image_urls : null;
  const hasCommentImages = Array.isArray(commentImages) && commentImages.length > 0;
  const showAsImage = hasPhoto || hasQuoteImage;
  const text = isPhoto
    ? activity.body
    : activity.kind === 'voice'
      ? (activity.voice_transcript ?? 'Publicó una nota de voz.')
      : activity.body;

  // "más" solo aparece si el texto realmente se corta a 5 líneas — sin
  // medirlo, cualquier texto cortito quedaría con un "más" que no tiene
  // nada más para mostrar. scrollHeight > clientHeight es lo mismo que ya
  // recorta el line-clamp de CSS, solo que leído después de pintar.
  useEffect(() => {
    if (!textRef.current) return;
    setIsTruncated(textRef.current.scrollHeight > textRef.current.clientHeight + 1);
  }, [text]);
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

  // Igual que en X: la foto de perfil vive en su propia columna izquierda,
  // fija, y todo lo demás (nombre, texto, imagen, acciones) se alinea a su
  // derecha — no solo el nombre. Por eso el avatar y el nombre son dos
  // links separados (avatarLink en la columna izquierda, nameLink arriba
  // de la columna derecha) en vez de un único bloque avatar+nombre como
  // antes, que dejaba el texto de abajo empezando desde el borde izquierdo
  // de la tarjeta, sin alinearse con el nombre.
  const avatarLink = author && (
    <Link href={`/perfil/${author.id}`} style={{ flexShrink: 0, display: 'block' }}>
      <Avatar name={author.display_name} src={author.avatar_url} size={30} />
    </Link>
  );
  const nameLink = author && (
    <Link href={`/perfil/${author.id}`} style={{ textDecoration: 'none' }}>
      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)' }}>
        <span style={{ fontWeight: 700 }}>{author.display_name}</span>{' '}
        <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {formatRelativeTime(activity.created_at)}</span>
      </span>
    </Link>
  );

  // La línea "Fulana compartió esto" — indentada para alinear con el
  // nombre de abajo (30px de avatar + 10px de gap), como en X.
  const repostLine = activity.is_repost && (
    <Link
      href={`/perfil/${activity.reposted_by_id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, marginLeft: avatarLink ? 40 : 0, textDecoration: 'none',
        fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text-tertiary)',
      }}
    >
      <Icon name="repeat-2" size={13} color="var(--text-tertiary)" />
      {activity.reposted_by_id === myProfileId ? 'Tú compartiste esto' : `${activity.reposted_by_name ?? 'Alguien'} compartió esto`}
    </Link>
  );
  const commentRepostProps = { kind: 'comment', id: activity.id, reposted: activity.reposted_by_me, count: activity.repost_count };
  const postRepostProps = { kind: 'post', id: activity.id, reposted: activity.reposted_by_me, count: activity.repost_count };
  // Comentar DESDE un repost queda scopeado a ese repost puntual, no al
  // contenido original (ver postReply/postPhotoComment, migración 040) —
  // por eso EngagementBlock/PhotoCommentsBlock necesitan saber si esta
  // tarjeta es un repost, y cuál.
  const repostId = activity.is_repost ? activity.repost_id : undefined;

  if (isReview) {
    // El nombre va siempre — a diferencia del resto de la tarjeta (donde en
    // Perfil se omite por redundante), acá hace falta el mismo encabezado
    // en Perfil y en Inicio: es lo que hace que los 3 puntos, al quedar del
    // otro lado en un "space-between", terminen siempre a la derecha.
    // Sin author (Perfil, cuando el kind no es 'review' — acá siempre lo
    // es, pero se deja el fallback igual que antes) no hay avatar: el
    // nombre queda solo, sin columna izquierda para alinear.
    const reviewName = author ? nameLink : (
      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)' }}>
        <span style={{ fontWeight: 700 }}>{personName}</span>{' '}
        <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {formatRelativeTime(activity.created_at)}</span>
      </span>
    );
    return (
      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6, opacity: pending ? 0.6 : 1 }}>
        {repostLine}
        <div style={{ display: 'flex', gap: 10 }}>
          {avatarLink}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {reviewName}
              {isOwn && (
                <PostMenu
                  editLabel="Editar reseña"
                  onEdit={() => router.push(`/club/${activity.club_id}/comentarios`)}
                  deleteLabel="Eliminar reseña"
                  onDelete={handleDeleteReview}
                />
              )}
            </div>
            <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>
              {activity.club_name} · terminó {activity.book_title}
            </div>
            <div onClick={() => setExpanded((e) => !e)} style={{ cursor: 'pointer' }}>
              <BookReviewCard title={activity.title} body={activity.body} coverUrl={activity.book_cover_url} expanded={expanded} />
            </div>
            <EngagementBlock
              commentId={activity.id}
              liked={activity.liked_by_me}
              likeCount={activity.like_count}
              replies={activity.replies ?? []}
              repost={commentRepostProps}
              repostId={repostId}
              compact
            />
            {expanded && canOpenClub && (
              <Link
                href={`/club/${activity.club_id}/comentarios`}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-link)' }}
              >
                Ver el resto de los comentarios en el club
                <Icon name="arrow-right" size={12} color="var(--text-link)" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6, opacity: pending ? 0.6 : 1 }}>
      {repostLine}
      <div style={{ display: 'flex', gap: 10 }}>
        {avatarLink}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
          {(nameLink || ((isPhoto || isQuote) && isOwn)) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: nameLink ? 'space-between' : 'flex-end' }}>
              {nameLink}
              {isPhoto && isOwn && (
                <PostMenu
                  editLabel={hasPhoto ? 'Editar foto' : hasVoice ? 'Editar nota de voz' : 'Editar texto'}
                  onEdit={() => setEditingPhoto(true)}
                  deleteLabel={hasPhoto ? 'Eliminar foto' : hasVoice ? 'Eliminar nota de voz' : 'Eliminar publicación'}
                  onDelete={handleDeletePhoto}
                />
              )}
              {isQuote && isOwn && (
                <PostMenu
                  editLabel="Editar cita"
                  // Sin edición todavía para una cita del perfil (ver
                  // README) — PostMenu ya sabe no mostrar la opción de
                  // Editar cuando onEdit es undefined.
                  onEdit={isProfileQuote ? undefined : () => setEditingQuote(true)}
                  deleteLabel="Eliminar cita"
                  onDelete={handleDeleteQuote}
                />
              )}
            </div>
          )}

          {/* Con estética propia (migración 050), la tarjeta reemplaza a la
              vez el bloque de texto Y el de imagen de abajo — ya trae
              adentro la cita, la portada (o su respaldo) y el
              título/autor, todo junto. Sin línea de "más": el recorte a
              TEXT_LINE_CLAMP es para comentarios largos, una cita
              destacada suele ser corta de por sí. */}
          {hasCardStyle ? (
            <div onClick={() => setExpanded((e) => !e)} style={{ cursor: 'pointer' }}>
              <QuoteFeedCard
                style={activity.card_style}
                color={activity.card_color}
                quoteText={text}
                book={{ title: activity.book_title, author: activity.book_author, cover_url: activity.book_cover_url }}
              />
            </div>
          ) : (
            <>
              {/* El texto va antes que la imagen — como un posteo de X, no de
                  Instagram (donde la foto sola encabeza la tarjeta). */}
              <div onClick={() => setExpanded((e) => !e)} style={{ cursor: 'pointer' }}>
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
                    ref={textRef}
                    style={{
                      fontSize: 'var(--fs-sm)', marginTop: isPhoto ? 4 : 8, lineHeight: 'var(--lh-snug)',
                      color: isQuote ? 'var(--gold-700)' : 'var(--text-secondary)',
                      fontStyle: isQuote ? 'italic' : 'normal',
                      whiteSpace: 'pre-wrap',
                      display: '-webkit-box',
                      WebkitLineClamp: expanded ? 'unset' : TEXT_LINE_CLAMP,
                      WebkitBoxOrient: 'vertical',
                      overflow: expanded ? 'visible' : 'hidden',
                    }}
                  >
                    {isPhoto ? text : `“${text}”`}
                    {!expanded && isTruncated && (
                      <span style={{ fontWeight: 700, color: 'var(--text-tertiary)' }}> más</span>
                    )}
                  </div>
                )}
              </div>

              {/* La imagen va sola, sin nada escrito encima — igual que un
                  posteo. Un comentario con más de una foto es un carrusel
                  (PhotoCarousel, con sus puntitos); el resto sigue siendo el
                  <div> de fondo de siempre, una sola imagen fija. Una nota
                  de voz de post (migración 052) ocupa ese mismo lugar con
                  un reproductor de verdad — a diferencia de una nota de
                  voz de club, acá no hay otra pantalla donde escucharla.
                  Una publicación de solo texto (isPhoto sin photo_url ni
                  voice_url, migración 049) no tiene nada que mostrar acá —
                  el texto ya se ve arriba. */}
              {hasCommentImages ? (
                <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }}>
                  <PhotoCarousel urls={commentImages} />
                </div>
              ) : hasVoice ? (
                <VoiceNotePlayer
                  src={activity.voice_url}
                  duration={formatDuration(activity.voice_duration_seconds)}
                  transcript={activity.voice_transcript}
                />
              ) : !(isPhoto && !hasPhoto) ? (
                <div
                  style={{
                    aspectRatio: '3 / 4', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)', flexShrink: 0, background,
                  }}
                />
              ) : null}
            </>
          )}

          {isPhoto ? (
            <PhotoCommentsBlock
              postId={activity.id}
              liked={activity.liked_by_me}
              likeCount={activity.like_count}
              comments={activity.replies ?? []}
              repost={postRepostProps}
              repostId={repostId}
              compact
            />
          ) : isProfileQuote ? (
            // Sin hilo de respuestas ni repost todavía (ver README) — solo
            // "me gusta", sobre profile_quote_likes.
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              <LikeButton liked={activity.liked_by_me} count={activity.like_count} onToggle={() => toggleQuoteLike(activity.id)} compact />
            </div>
          ) : isQuote ? (
            <EngagementBlock
              commentId={activity.id}
              liked={activity.liked_by_me}
              likeCount={activity.like_count}
              replies={activity.replies ?? []}
              repost={commentRepostProps}
              repostId={repostId}
              compact
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              <LikeButton liked={activity.liked_by_me} count={activity.like_count} onToggle={() => toggleCommentLike(activity.id)} compact />
              <RepostButton {...commentRepostProps} />
            </div>
          )}

          {expanded && isQuote && activity.quote_style && (
            <DownloadQuoteImageButton
              style={activity.quote_style}
              quoteText={activity.body}
              book={{ title: activity.book_title, author: activity.book_author, cover_url: activity.book_cover_url }}
              clubName={activity.club_name}
              personName={personName}
              imageUrl={activity.quote_image_url}
            />
          )}
          {expanded && canOpenClub && !isPhoto && (
            <Link
              href={activity.chapter_id ? `/club/${activity.club_id}/comentarios?capitulo=${activity.chapter_id}` : `/club/${activity.club_id}/comentarios`}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-link)' }}
            >
              Ver el resto de los comentarios en el club
              <Icon name="arrow-right" size={12} color="var(--text-link)" />
            </Link>
          )}

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
              quote={{ id: activity.id, body: activity.body, card_style: activity.card_style, card_color: activity.card_color }}
              book={{ title: activity.book_title, author: activity.book_author, cover_url: activity.book_cover_url }}
              onClose={() => setEditingQuote(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
