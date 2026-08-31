'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { AddClubSheet } from '@/components/AddClubSheet';

const CREAM = 'var(--hero-cream)';

// La misma solución visual y los mismos datos que mostraba el héroe grande
// (portada sin recortar, título/autor, capítulos, % y barra de progreso) —
// pero como tarjeta chica dentro de la lista: sin el chrome de arriba
// (volver, selector de club, íconos de acciones), porque acá cada tarjeta
// YA es un club distinto, no hace falta elegir entre ellos adentro de una.
// Tocar la tarjeta entra directo a "Progreso y Actividad" de ese club
// (/club/[clubId], que ya no muestra un héroe grande — ver README).
const CARD_SHADOW = [
  '-1px 2px 0 rgba(20,16,4,0.32)',
  '-3px 5px 2px rgba(20,16,4,0.26)',
  '-7px 11px 5px rgba(20,16,4,0.18)',
].join(', ');

const CARD_LIGHT = 'linear-gradient(210deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.06) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)';

function ClubHeroCard({ club }) {
  const book = club.book;

  return (
    <Link href={`/club/${club.id}`} style={{ display: 'block', background: 'var(--accent-500)', borderRadius: 18, padding: '14px 16px', textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: CREAM, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {club.name}
        </div>
        <Icon name="chevron-right" size={14} color={CREAM} />
      </div>

      {book ? (
        <>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            {book.cover_url ? (
              <div style={{ position: 'relative', lineHeight: 0, flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- proporción propia que solo se conoce en el navegador. */}
                <img
                  src={book.cover_url}
                  alt=""
                  style={{ display: 'block', width: 'auto', height: 'auto', maxWidth: 56, maxHeight: 76, borderRadius: '0 3px 3px 0', boxShadow: CARD_SHADOW }}
                />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '0 3px 3px 0', mixBlendMode: 'soft-light', pointerEvents: 'none', background: CARD_LIGHT }} />
              </div>
            ) : (
              <div style={{ width: 56, height: 76, borderRadius: '0 3px 3px 0', background: CREAM, opacity: 0.35, flexShrink: 0 }} />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 8.5, letterSpacing: '.1em', textTransform: 'uppercase', color: CREAM, opacity: 0.7, fontWeight: 800 }}>
                Leyendo ahora
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, lineHeight: 1.2, color: CREAM, marginTop: 3,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {book.title}
              </div>
              <div style={{ fontSize: 10.5, color: CREAM, opacity: 0.72, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {[book.author, club.unit].filter(Boolean).join(' · ')}
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, letterSpacing: '-.02em', color: CREAM }}>
                {club.percent}%
              </div>
              {club.progressMeta && (
                <div style={{ fontSize: 9.5, color: CREAM, opacity: 0.7, marginTop: 1 }}>{club.progressMeta}</div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {club.pips?.type === 'pips' ? (
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: club.pips.total }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: i <= club.pips.nowIndex ? CREAM : 'rgba(255,248,236,.22)',
                      opacity: i === club.pips.nowIndex ? 0.6 : 1,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,248,236,.22)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${club.pips?.percent ?? club.percent}%`, borderRadius: 2, background: CREAM }} />
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ marginTop: 10, fontSize: 12, color: CREAM, opacity: 0.75 }}>
          Todavía no tiene un libro activo.
        </div>
      )}
    </Link>
  );
}

export function MisClubesScreen({ clubs }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático de /public, no una foto de contenido */}
        <img src="/logo-libris.png" alt="Libris" style={{ height: 26, width: 'auto', display: 'block' }} />
        <IconButton aria-label="Sumar un club" size={36} onClick={() => setSheetOpen(true)}>
          <Icon name="plus" size={16} />
        </IconButton>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Mis clubes de lectura
        </div>

        {clubs.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '12px 0' }}>
            Todavía no estás en ningún club.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {clubs.map((club) => <ClubHeroCard key={club.id} club={club} />)}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
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
