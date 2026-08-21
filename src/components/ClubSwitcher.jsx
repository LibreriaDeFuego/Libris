'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { selectClub } from '@/app/actions/clubs';
import { Icon } from '@/design-system/components/core/Icon.jsx';

// Con multi-club el nombre del club pasa a ser un menú: cambia de club, o
// lleva a crear/unirse a otro.
// tone='chip' es el chip de vidrio sobre el héroe de portada (fondo de
// foto): pastilla translúcida con blur y el punto de actividad.
export function ClubSwitcher({ clubs, activeClub, tone = 'plain', hasActivity = false }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // "/" ya no muestra el detalle de un club (es la lista de "Mis clubes"),
  // así que cambiar de club navega a la ruta de ese club, no solo cambia
  // la cookie. La cookie igual se actualiza, para que Comentarios y
  // Preferencias sigan apuntando al club correcto.
  function choose(clubId) {
    setOpen(false);
    if (clubId === activeClub.id) return;
    const formData = new FormData();
    formData.set('clubId', clubId);
    startTransition(async () => {
      await selectClub(formData);
      router.push(`/club/${clubId}`);
    });
  }

  const chipStyle = tone === 'chip' ? {
    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left',
    background: 'rgba(255,248,236,0.14)', backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,248,236,0.2)', borderRadius: 'var(--radius-pill)',
    padding: '7px 13px 7px 10px', color: 'var(--hero-cream)',
    fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
    opacity: pending ? 0.6 : 1,
  } : {
    display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
    padding: 0, cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600,
    opacity: pending ? 0.5 : 1,
  };

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(!open)} disabled={pending} style={chipStyle}>
        {tone === 'chip' && hasActivity && (
          <span
            aria-hidden
            style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 0 3px rgba(27,170,107,.28)', flexShrink: 0 }}
          />
        )}
        {activeClub.name}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={tone === 'chip' ? 13 : 18} />
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
