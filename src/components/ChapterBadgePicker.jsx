'use client';

import { useState, useTransition } from 'react';
import { toggleChapterBadge } from '@/app/actions/clubs';
import { CHAPTER_BADGE_TYPES } from '@/lib/chapterBadges';

// El selector de insignia de un capítulo (migración 067) — compartido
// entre la barra de Comentarios (botón "Tu insignia", junto al nombre
// del capítulo) y la pestaña "Insignia" del panel de Agregar: mismo
// componente, dos lugares desde donde llegar a él. Optimista: el toque
// cambia el estado local al toque, antes de que vuelva el servidor —
// si falla, vuelve a lo que había.
export function ChapterBadgePicker({ chapterId, clubBookId, myProfileId, badges = [] }) {
  const myEntry = badges.find((b) => b.profileId === myProfileId);
  const [myKind, setMyKind] = useState(myEntry?.kind ?? null);
  const [pending, startTransition] = useTransition();
  const others = badges.filter((b) => b.profileId !== myProfileId);

  function handlePick(kind) {
    if (pending) return;
    const next = myKind === kind ? null : kind;
    setMyKind(next);

    const formData = new FormData();
    formData.set('chapterId', chapterId);
    formData.set('clubBookId', clubBookId);
    formData.set('kind', kind);
    startTransition(async () => {
      const result = await toggleChapterBadge(formData);
      if (result?.error) setMyKind(myKind); // vuelve a lo que había si falló
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>¿Cómo te dejó este capítulo?</div>
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
          Una sola, se ve para todo el club. Toca la misma para sacarla.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CHAPTER_BADGE_TYPES.map((b) => {
          const selected = myKind === b.kind;
          return (
            <button
              key={b.kind}
              type="button"
              aria-label={`${b.label}${selected ? ' — elegida' : ''}`}
              aria-pressed={selected}
              onClick={() => handlePick(b.kind)}
              disabled={pending}
              style={{
                width: 44, height: 44, borderRadius: '50%', fontSize: 18,
                background: selected ? b.bg : 'var(--surface-sunken)',
                border: selected ? `2px solid ${b.text}` : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', opacity: pending ? 0.7 : 1,
              }}
            >
              {b.emoji}
            </button>
          );
        })}
      </div>

      {others.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
            También en este capítulo
          </div>
          {others.map((o) => (
            <div key={o.profileId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-xs)', color: 'var(--text-primary)' }}>
              <span style={{ fontSize: 15 }}>{CHAPTER_BADGE_TYPES.find((b) => b.kind === o.kind)?.emoji}</span>
              <span>{o.displayName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
