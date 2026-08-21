'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { selectClub } from '@/app/actions/clubs';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

function ClubCard({ club }) {
  const [pending, startTransition] = useTransition();

  // Al entrar a un club lo dejamos marcado como activo (cookie), para que
  // Comentarios y Preferencias — que todavía se basan en "el club activo" —
  // apunten al que se acaba de abrir.
  function handleClick() {
    const formData = new FormData();
    formData.set('clubId', club.id);
    startTransition(() => selectClub(formData));
  }

  return (
    <Link
      href={`/club/${club.id}`}
      onClick={handleClick}
      style={{
        display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 14,
        boxShadow: 'var(--shadow-sm)', opacity: pending ? 0.7 : 1,
      }}
    >
      <div
        style={{
          width: 46, height: 66, borderRadius: 'var(--radius-sm)', flexShrink: 0,
          background: club.book?.cover_url ? `center/cover no-repeat url(${club.book.cover_url})` : 'var(--accent-500)',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {club.name}
        </div>
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 1 }}>
          {club.memberCount} {club.memberCount === 1 ? 'miembro' : 'miembros'}
          {club.book ? ` · leyendo ${club.book.title}` : ' · sin libro activo'}
        </div>
        {club.activity ? (
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 'var(--lh-snug)' }}>
            {club.activity.text} · {formatRelativeTime(club.activity.time)}
          </div>
        ) : (
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
            Sin novedades todavía
          </div>
        )}
      </div>
      <Icon name="chevron-right" size={18} color="var(--text-tertiary)" />
    </Link>
  );
}

export function MisClubesScreen({ clubs, publicClubsPreview }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '20px 18px 24px' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Mis clubes de lectura
        </div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
          Los clubes en los que participas, los hayas creado o no.
        </div>
      </div>

      {clubs.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '12px 0' }}>
          Todavía no estás en ningún club.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clubs.map((club) => <ClubCard key={club.id} club={club} />)}
        </div>
      )}

      <Link href="/club/nuevo">
        <Button variant="secondary" size="md">
          <Icon name="plus" size={16} />
          Crear o unirme con un link
        </Button>
      </Link>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Descubrir otros clubes
          </div>
          <Link href="/club/otros" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-link)', fontWeight: 600 }}>
            Ver todos
          </Link>
        </div>

        {publicClubsPreview.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>
            Todavía no hay clubes públicos para mostrar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {publicClubsPreview.map((club) => (
              <div key={club.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 10 }}>
                <Avatar name={club.name} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>{club.name}</div>
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>
                    {club.member_count} {Number(club.member_count) === 1 ? 'miembro' : 'miembros'}
                    {club.book_title ? ` · ${club.book_title}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
