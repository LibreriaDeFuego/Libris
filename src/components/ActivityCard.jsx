'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { DownloadQuoteImageButton } from '@/components/DownloadQuoteImageButton';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

// Una tarjeta de actividad: un bloque alto que domina la pantalla, con la
// foto de fondo (la del libro, o la que la persona subió si es una foto
// propia) y lo que dijo anclado abajo. Tocarla despliega el texto completo.
//
// La usan tanto el Perfil (donde ya se sabe de quién es la actividad, no
// hace falta repetirlo) como el Inicio (donde "author" identifica quién
// publicó cada tarjeta del feed). El nombre y la foto de quien publicó van
// en una fila propia arriba de la tarjeta, no superpuestos sobre la imagen
// — la persona queda fuera de la foto, no encima.
export function ActivityCard({ activity, canOpenClub, personName, author }) {
  const [expanded, setExpanded] = useState(false);
  const isPhoto = activity.kind === 'photo';
  const isQuote = activity.kind === 'quote';
  // Si la cita se publicó con la tarjeta ya armada (migración 021), esa
  // imagen ES el contenido — se muestra tal cual, sin repetir el texto
  // encima (ya está dibujado adentro). Las citas de antes de esa migración
  // (o donde falló la subida en su momento) siguen con el tratamiento
  // genérico de siempre: portada del libro + texto superpuesto.
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {author && (
        <Link
          href={`/perfil/${author.id}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          <Avatar name={author.display_name} src={author.avatar_url} size={30} />
          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{author.display_name}</span>
        </Link>
      )}
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{
          // 3:4 — misma proporción que ahora usan todas las imágenes que se
          // publican (citas y fotos), para que la tarjeta las muestre sin
          // recortarlas de más ni dejar franjas vacías.
          position: 'relative', aspectRatio: '3 / 4', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)', cursor: 'pointer', flexShrink: 0,
          background,
        }}
      >
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.02) 42%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.9) 100%)',
          }}
        />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 16px 20px', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--fs-2xs)', color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 8 }}>
            {isPhoto && <Icon name="camera" size={12} color="rgba(255,255,255,0.75)" />}
            {hasQuoteImage && <Icon name="quote" size={12} color="rgba(255,255,255,0.75)" />}
            {isPhoto
              ? `Compartió una foto · ${formatRelativeTime(activity.created_at)}`
              : hasQuoteImage
                ? `Publicó una cita · ${formatRelativeTime(activity.created_at)}`
                : `${activity.club_name} · ${formatRelativeTime(activity.created_at)}`}
          </div>
          {!showAsImage && (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-lg)' }}>
                {activity.book_title}
              </div>
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'rgba(255,255,255,0.68)', marginTop: 3 }}>
                {activity.book_author}
              </div>
            </>
          )}
          {!hasQuoteImage && text && (
            <div
              style={{
                fontSize: 'var(--fs-sm)', marginTop: isPhoto ? 4 : 12, lineHeight: 'var(--lh-snug)',
                color: isQuote ? 'var(--gold-300)' : 'rgba(255,255,255,0.95)',
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
            <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12 }}>
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
              style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--gold-300)' }}
            >
              Ver el resto de los comentarios en el club
              <Icon name="arrow-right" size={12} color="var(--gold-300)" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
