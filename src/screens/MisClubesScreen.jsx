'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { AddClubSheet } from '@/components/AddClubSheet';
import { ClubMembersModal } from '@/components/ClubMembersModal';

const CREAM = 'var(--hero-cream)';
const STACK_LIMIT = 3;

function firstName(name) {
  return name.split(' ')[0];
}

// "Fulano" (1 integrante) o "Fulano y N más" (2+) — mismo patrón de texto
// que ya usa el resto de la app para agrupar personas (comentarios,
// compañeros de capítulo).
function peopleLabel(members) {
  return members.length === 1
    ? firstName(members[0].displayName)
    : `${firstName(members[0].displayName)} y ${members.length - 1} más`;
}

// La misma solución visual y los mismos datos que mostraba el héroe grande
// (portada sin recortar, título/autor, capítulos, % y barra de progreso) —
// pero como tarjeta chica dentro de la lista: sin el chrome de arriba
// (volver, selector de club, íconos de acciones), porque acá cada tarjeta
// YA es un club distinto, no hace falta elegir entre ellos adentro de una.
// Tocar la tarjeta entra directo a "Progreso y Actividad" de ese club
// (/club/[clubId], que ya no muestra un héroe grande — ver README).
//
// Se probó también una versión con la portada ocupando toda la franja
// izquierda de la tarjeta (de punta a punta) — no era lo que hacía
// falta. Después se pidió agrandarla un poco más, hasta la barra de
// progreso: la portada crece (84×130) y la barra pasa a vivir adentro
// de esa misma columna, alineada abajo — ya no es una franja aparte
// que cruza toda la tarjeta, arranca donde termina la portada.
const COVER_W = 84;
const COVER_H = 130;
const CARD_SHADOW = [
  '-1px 2px 0 rgba(20,16,4,0.32)',
  '-3px 5px 2px rgba(20,16,4,0.26)',
  '-7px 11px 5px rgba(20,16,4,0.18)',
].join(', ');

const CARD_LIGHT = 'linear-gradient(210deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.06) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)';

function ClubHeroCard({ club, currentUserId }) {
  const book = club.book;
  const [membersOpen, setMembersOpen] = useState(false);
  const members = club.members ?? [];
  const shown = members.slice(0, STACK_LIMIT);
  const extra = members.length - shown.length;

  // La tarjeta entera es un link al club — esto abre la lista de
  // integrantes en su lugar, así que no puede dejar que el toque le
  // llegue al link de abajo.
  function openMembers(e) {
    e.preventDefault();
    e.stopPropagation();
    setMembersOpen(true);
  }

  return (
    <>
      <Link href={`/club/${club.id}`} style={{ display: 'block', background: 'var(--accent-500)', borderRadius: 18, padding: '14px 16px', textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: CREAM, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {club.name}
        </div>
        <Icon name="chevron-right" size={14} color={CREAM} />
      </div>

      {book ? (
        <div style={{ marginTop: 12, display: 'flex', gap: 12, height: COVER_H }}>
          {book.cover_url ? (
            <div style={{ position: 'relative', width: COVER_W, flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- llena la portada a medida (alto de la fila), no un tamaño fijo conocido de antemano. */}
              <img
                src={book.cover_url}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0 3px 3px 0', boxShadow: CARD_SHADOW }}
              />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '0 3px 3px 0', mixBlendMode: 'soft-light', pointerEvents: 'none', background: CARD_LIGHT }} />
            </div>
          ) : (
            <div style={{ width: COVER_W, borderRadius: '0 3px 3px 0', background: CREAM, opacity: 0.35, flexShrink: 0 }} />
          )}

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0 }}>
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
              {book.author && (
                <div style={{ fontSize: 10.5, color: CREAM, opacity: 0.72, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {book.author}
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,248,236,.22)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${club.percent}%`, borderRadius: 2, background: CREAM }} />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '-.02em', color: CREAM, flexShrink: 0 }}>
                  {club.percent}%
                </div>
              </div>
              {club.progressMeta && (
                <div style={{ fontSize: 9.5, color: CREAM, opacity: 0.7, textAlign: 'right', marginTop: 4 }}>{club.progressMeta}</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: 12, color: CREAM, opacity: 0.75 }}>
          Todavía no tiene un libro activo.
        </div>
      )}

      {members.length > 0 && (
        <button
          type="button"
          onClick={openMembers}
          style={{ marginTop: 11, display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex' }}>
            {shown.map((m, i) => (
              <div
                key={m.profileId}
                style={{ marginLeft: i === 0 ? 0 : -7, border: '2px solid var(--accent-500)', borderRadius: 'var(--radius-round)', lineHeight: 0 }}
              >
                <Avatar name={m.displayName} src={m.avatarUrl} size={22} />
              </div>
            ))}
            {extra > 0 && (
              <div
                style={{
                  marginLeft: -7, width: 22, height: 22, borderRadius: 'var(--radius-round)', border: '2px solid var(--accent-500)',
                  background: 'rgba(255,248,236,.24)', color: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 800,
                }}
              >
                +{extra}
              </div>
            )}
          </div>
          <div style={{ marginLeft: 8, fontSize: 10.5, color: CREAM, opacity: 0.75 }}>{peopleLabel(members)}</div>
        </button>
      )}
      </Link>

      {membersOpen && (
        <ClubMembersModal
          clubName={club.name}
          members={members}
          currentUserId={currentUserId}
          onClose={() => setMembersOpen(false)}
        />
      )}
    </>
  );
}

export function MisClubesScreen({ clubs, currentUserId }) {
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
            {clubs.map((club) => <ClubHeroCard key={club.id} club={club} currentUserId={currentUserId} />)}
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
