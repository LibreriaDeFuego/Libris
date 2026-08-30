'use client';

import { useEffect, useState, useTransition } from 'react';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { updateProgress } from '@/app/actions/clubs';
import { chapterShortLabel } from '@/lib/orderChapters';

// Los capítulos del héroe cumplen doble función: navegan Y son la forma
// rápida de decir "voy por acá" — tocar uno actualiza el progreso al toque,
// sin abrir ningún modal (que sigue viviendo detrás del lápiz del héroe,
// para progreso por página, reacciones y "Terminé el libro").
//
// optimisticId manda mientras la Server Action está en vuelo: así el chip
// tocado se ve activo al instante, sin esperar el round-trip. En cuanto
// currentChapterId —que llega por props, tras el revalidatePath— alcanza al
// optimista, ambos coinciden y da lo mismo cuál se use: no hace falta
// limpiarlo a mano en un efecto aparte.
export function ChapterProgressChips({ clubBookId, chapters, currentChapterId }) {
  const [pending, startTransition] = useTransition();
  const [optimisticId, setOptimisticId] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  if (!chapters || chapters.length === 0) return null;

  const activeId = optimisticId != null && optimisticId !== currentChapterId ? optimisticId : currentChapterId;

  function handleTap(chapter) {
    if (chapter.id === activeId || pending) return;
    setError(null);
    setOptimisticId(chapter.id);
    setToast(`Ahora vas por ${chapterShortLabel(chapter)}`);

    const formData = new FormData();
    formData.set('clubBookId', clubBookId);
    formData.set('mode', 'chapter');
    formData.set('chapterId', chapter.id);

    startTransition(async () => {
      const result = await updateProgress(formData);
      if (result?.error) {
        setError(result.error);
        setOptimisticId(null);
        setToast(null);
      }
    });
  }

  return (
    <div style={{ padding: '18px 0 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Tu progreso
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
          Toca un capítulo para marcarlo como el tuyo
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '2px 18px 4px', overflowX: 'auto' }}>
        {chapters.map((chapter) => {
          const active = chapter.id === activeId;
          const isSaving = pending && optimisticId === chapter.id;
          return (
            <button
              key={chapter.id}
              type="button"
              onClick={() => handleTap(chapter)}
              disabled={isSaving}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap',
                fontSize: 'var(--fs-xs)', fontWeight: 500, cursor: isSaving ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)',
                background: active ? 'var(--accent-500)' : 'var(--surface-card)',
                border: `1px solid ${active ? 'transparent' : 'var(--border-default)'}`,
                color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {active && <Icon name="check" size={11} color="var(--text-on-accent)" />}
              {chapterShortLabel(chapter)}{active ? ' · vos' : ''}
            </button>
          );
        })}
      </div>

      {toast && (
        <div
          style={{
            margin: '2px 18px 0', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--neutral-900)', color: 'var(--hero-cream)', fontSize: 'var(--fs-xs)', fontWeight: 600,
            padding: '7px 12px', borderRadius: 'var(--radius-pill)', boxShadow: 'var(--shadow-md)',
          }}
        >
          <Icon name="check" size={12} color="var(--success)" />
          {toast}
        </div>
      )}

      {error && (
        <div style={{ margin: '2px 18px 0', color: 'var(--danger)', fontSize: 'var(--fs-xs)' }}>{error}</div>
      )}
    </div>
  );
}
