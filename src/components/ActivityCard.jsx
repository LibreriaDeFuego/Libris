'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { DownloadQuoteImageButton } from '@/components/DownloadQuoteImageButton';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

// Recorte largo hacia una esquina — misma matemática en todos lados: capas
// de sombra que crecen en distancia y difuminado, todas del mismo lado, para
// que se lea como una sombra proyectada en diagonal (no un blur parejo).
const PHOTO_SHADOW = [
  '-1px 3px 0 rgba(20,16,4,0.36)',
  '-5px 10px 4px rgba(20,16,4,0.33)',
  '-14px 22px 11px rgba(20,16,4,0.29)',
  '-27px 41px 20px rgba(20,16,4,0.24)',
  '-47px 66px 33px rgba(20,16,4,0.19)',
  '-71px 96px 47px rgba(20,16,4,0.14)',
].join(', ');

// Capa de luz sobre la propia foto (mismo mecanismo que un mockup de
// portada de libro: brillo arriba-derecha, se apaga hacia abajo-izquierda,
// del mismo lado de donde cae la sombra proyectada) — hace que se vea
// iluminada en vez de una estampita plana pegada encima del color.
const PHOTO_LIGHT = 'linear-gradient(210deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.06) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)';

// Una tarjeta de actividad. Las fotos (kind = 'photo') tienen identidad
// propia: título arriba en un panel de color, texto debajo del título, y la
// foto —ya cuadrada de por sí, se recorta 1:1 al subirla— chica y con
// sombra propia dentro de un marco también cuadrado. El resto de los tipos
// (cita, comentario) sigue el orden de un posteo de Instagram: la imagen
// sola y limpia, el texto abajo. Tocar el bloque de abajo despliega el
// texto completo.
//
// La usan tanto el Perfil (donde ya se sabe de quién es la actividad, no
// hace falta repetirlo) como el Inicio (donde "author" identifica quién
// publicó cada tarjeta del feed, con su nombre y foto en una fila propia,
// afuera de la tarjeta — ni el nombre ni la fecha se dibujan encima de la
// foto ni adentro del panel de color).
export function ActivityCard({ activity, canOpenClub, personName, author }) {
  const [expanded, setExpanded] = useState(false);
  const isPhoto = activity.kind === 'photo';
  const isQuote = activity.kind === 'quote';
  // Si la cita se publicó con la tarjeta ya armada (migración 021), esa
  // imagen ES el contenido — no hace falta repetir la cita como texto abajo
  // (ya está dibujada adentro). Las citas de antes de esa migración (o
  // donde falló la subida en su momento) siguen con el tratamiento
  // genérico: portada del libro de fondo + la cita como texto abajo.
  const hasQuoteImage = isQuote && Boolean(activity.quote_image_url);
  const text = activity.kind === 'voice'
    ? (activity.voice_transcript ?? 'Publicó una nota de voz.')
    : activity.body;
  const backgroundUrl = hasQuoteImage ? activity.quote_image_url : activity.book_cover_url;

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

  const metaText = hasQuoteImage
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

  if (isPhoto) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {authorRow}

        <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: 'var(--gold-500)', padding: '28px 20px 20px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-2xl)', lineHeight: 1.18, color: 'var(--neutral-900)' }}>
              {activity.title}
            </div>
            {activity.body && (
              <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.55, color: 'rgba(27,27,31,0.82)', marginTop: 12, whiteSpace: 'pre-wrap' }}>
                {activity.body}
              </div>
            )}
          </div>

          {/* El marco es cuadrado; la foto (ya recortada 1:1 al subirla) flota
              chica adentro, con su propia sombra proyectada — el mismo
              tratamiento aprobado en el mockup de identidad de publicaciones. */}
          <div style={{ width: '100%', aspectRatio: '1 / 1', marginTop: -20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'var(--gold-500)' }} />
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '4%' }}>
              <div style={{ width: '58%', position: 'relative', lineHeight: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- foto de contenido subida por la persona, no un asset estático. */}
                <img
                  src={activity.photo_url}
                  alt=""
                  style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 4, boxShadow: PHOTO_SHADOW }}
                />
                <div style={{ position: 'absolute', inset: 0, borderRadius: 4, mixBlendMode: 'soft-light', pointerEvents: 'none', background: PHOTO_LIGHT }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {authorRow}

      {/* La imagen va sola, sin nada escrito encima — igual que un posteo. */}
      <div
        style={{
          aspectRatio: '3 / 4', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)', flexShrink: 0, background,
        }}
      />

      <div onClick={() => setExpanded((e) => !e)} style={{ cursor: 'pointer', padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 6 }}>
          {hasQuoteImage && <Icon name="quote" size={12} color="var(--text-tertiary)" />}
          {metaText}
        </div>
        {!hasQuoteImage && (
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
              fontSize: 'var(--fs-sm)', marginTop: 8, lineHeight: 'var(--lh-snug)',
              color: isQuote ? 'var(--gold-700)' : 'var(--text-secondary)',
              fontStyle: isQuote ? 'italic' : 'normal',
              whiteSpace: 'pre-wrap',
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 2,
              WebkitBoxOrient: 'vertical',
              overflow: expanded ? 'visible' : 'hidden',
            }}
          >
            {`“${text}”`}
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
        {expanded && canOpenClub && (
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
    </div>
  );
}
