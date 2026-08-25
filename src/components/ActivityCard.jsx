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
// publicó cada tarjeta del feed, con su nombre y foto arriba a la izquierda).
export function ActivityCard({ activity, canOpenClub, personName, author }) {
  const [expanded, setExpanded] = useState(false);
  const isPhoto = activity.kind === 'photo';
  const isQuote = activity.kind === 'quote';
  const text = isPhoto
    ? activity.body
    : activity.kind === 'voice'
      ? (activity.voice_transcript ?? 'Publicó una nota de voz.')
      : activity.body;
  const backgroundUrl = isPhoto ? activity.photo_url : activity.book_cover_url;

  return (
    <div
      onClick={() => setExpanded((e) => !e)}
      style={{
        position: 'relative', height: 440, borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)', cursor: 'pointer', flexShrink: 0,
        background: backgroundUrl ? `center/cover no-repeat url(${backgroundUrl})` : 'var(--accent-500)',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.02) 42%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.9) 100%)',
        }}
      />
      {author && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90, background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)' }} />
          <Link
            href={`/perfil/${author.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <Avatar name={author.display_name} src={author.avatar_url} size={28} />
            <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: '#fff' }}>{author.display_name}</span>
          </Link>
        </>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 16px 20px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--fs-2xs)', color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 8 }}>
          {isPhoto && <Icon name="camera" size={12} color="rgba(255,255,255,0.75)" />}
          {isPhoto ? `Compartió una foto · ${formatRelativeTime(activity.created_at)}` : `${activity.club_name} · ${formatRelativeTime(activity.created_at)}`}
        </div>
        {!isPhoto && (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-lg)' }}>
              {activity.book_title}
            </div>
            <div style={{ fontSize: 'var(--fs-2xs)', color: 'rgba(255,255,255,0.68)', marginTop: 3 }}>
              {activity.book_author}
            </div>
          </>
        )}
        {text && (
          <div
            style={{
              fontSize: 'var(--fs-sm)', marginTop: isPhoto ? 4 : 12, lineHeight: 'var(--lh-snug)',
              color: isQuote ? 'var(--gold-300)' : 'rgba(255,255,255,0.95)',
              fontStyle: isQuote ? 'italic' : 'normal',
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
  );
}
