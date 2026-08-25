'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { selectClub } from '@/app/actions/clubs';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { AddClubSheet } from '@/components/AddClubSheet';
import { ClubRow } from '@/screens/OtrosClubesScreen.jsx';
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

export function MisClubesScreen({ clubs, discoverClubs = [] }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- logo estático de /public, no una foto de contenido */}
          <img src="/logo-libris.png" alt="Libris" style={{ height: 26, width: 'auto', display: 'block', marginBottom: 14 }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Mis clubes de lectura
          </div>
        </div>
        <IconButton aria-label="Sumar un club" size={36} onClick={() => setSheetOpen(true)}>
          <Icon name="plus" size={16} />
        </IconButton>
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

      <div style={{ height: 1, background: 'var(--border-subtle)' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Descubrir más clubes
        </div>

        {/* No es un buscador en vivo: lleva a Descubrir, donde sí se puede
            tipear y buscar clubes y personas. Evita duplicar esa búsqueda acá. */}
        <Link
          href="/descubrir"
          style={{
            display: 'flex', alignItems: 'center', width: '100%', padding: '12px 16px',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
            background: 'var(--surface-card)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)',
            fontSize: 'var(--fs-base)', textDecoration: 'none',
          }}
        >
          Buscar clubes o personas
        </Link>

        {discoverClubs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {discoverClubs.map((club) => <ClubRow key={club.id} club={club} />)}
          </div>
        )}

        <Link
          href="/descubrir"
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-link)', textDecoration: 'none' }}
        >
          Ver todo en Descubrir
          <Icon name="arrow-right" size={12} color="var(--text-link)" />
        </Link>
      </div>

      <div style={{ height: 1, background: 'var(--border-subtle)' }} />

      <div style={{ textAlign: 'center', padding: '2px 0 6px' }}>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}
        >
          ¿No encontraste tu club? Crear uno o unirme con un link
        </button>
      </div>

      {sheetOpen && <AddClubSheet onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
