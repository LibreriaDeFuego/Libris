'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { selectClub } from '@/app/actions/clubs';
import { Icon } from '@/design-system/components/core/Icon.jsx';

// Con multi-club el nombre del club pasa a ser un menú: cambia de club, o
// lleva a crear/unirse a otro.
export function ClubSwitcher({ clubs, activeClub }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function choose(clubId) {
    if (clubId === activeClub.id) { setOpen(false); return; }
    const formData = new FormData();
    formData.set('clubId', clubId);
    startTransition(async () => {
      await selectClub(formData);
      setOpen(false);
    });
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={pending}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          padding: 0, cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600,
          opacity: pending ? 0.5 : 1,
        }}
      >
        {activeClub.name}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} />
      </button>

      {open && (
        <>
          {/* capa invisible para cerrar tocando fuera */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 11, marginTop: 6, minWidth: 240,
              background: 'var(--surface-card)', borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)',
              overflow: 'hidden', fontFamily: 'var(--font-body)',
            }}
          >
            {clubs.map((club) => (
              <button
                key={club.id}
                type="button"
                onClick={() => choose(club.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  background: club.id === activeClub.id ? 'var(--accent-50)' : 'none',
                  border: 'none', padding: '11px 14px', cursor: 'pointer',
                  fontSize: 'var(--fs-sm)', fontWeight: club.id === activeClub.id ? 600 : 400,
                  color: 'var(--text-primary)',
                }}
              >
                <Icon
                  name={club.id === activeClub.id ? 'check' : 'book-open'}
                  size={15}
                  color={club.id === activeClub.id ? 'var(--accent-500)' : 'var(--text-tertiary)'}
                />
                {club.name}
              </button>
            ))}

            <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <Link
                href="/club/nuevo"
                onClick={() => setOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', fontSize: 'var(--fs-sm)', color: 'var(--text-link)', fontWeight: 600 }}
              >
                <Icon name="plus" size={15} />
                Crear o unirme a otro club
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
