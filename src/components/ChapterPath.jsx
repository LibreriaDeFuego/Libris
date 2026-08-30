'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { updateProgress } from '@/app/actions/clubs';

// Cuántos capítulos se muestran a cada lado del actual — para que el
// camino no se vuelva eterno en libros largos. El resto queda afuera de
// la ventana; "+N capítulos más" en cada punta abre el modal completo
// (todos los capítulos) para saltar más lejos de una sola vez.
const BEFORE = 2;
const AFTER = 3;

// El camino de capítulos del club, estilo Duolingo: sube (los que faltan
// quedan arriba, los ya leídos abajo — subir = avanzar) y tocar un nodo
// actualiza el progreso al toque, igual que hacían los chips que
// reemplaza. La racha de lectura (migración 035) vive integrada en el
// nodo actual, no aparte.
export function ChapterPath({ clubBookId, chapters, currentChapterId, streakCount = 0, onOpenFull }) {
  const [pending, startTransition] = useTransition();
  const [optimisticId, setOptimisticId] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const currentNodeRef = useRef(null);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // Centra el capítulo actual al abrir la pantalla, para no obligar a
  // buscarlo scrolleando en libros largos — solo al montar: si después
  // tocás otro capítulo, no te saca del lugar donde acabás de tocar.
  useEffect(() => {
    currentNodeRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  if (!chapters || chapters.length === 0) return null;

  const activeId = optimisticId != null && optimisticId !== currentChapterId ? optimisticId : currentChapterId;
  const currentIndex = chapters.findIndex((c) => c.id === activeId);

  const start = currentIndex === -1 ? 0 : Math.max(0, currentIndex - BEFORE);
  const end = currentIndex === -1 ? Math.min(chapters.length - 1, BEFORE + AFTER) : Math.min(chapters.length - 1, currentIndex + AFTER);
  const hiddenBelow = start;
  const hiddenAbove = chapters.length - 1 - end;
  // De futuro (arriba) a pasado (abajo) — el orden visual que pediste.
  const path = chapters.slice(start, end + 1).slice().reverse();

  function handleTap(chapter) {
    if (chapter.id === activeId || pending) return;
    setError(null);
    setOptimisticId(chapter.id);
    setToast(`Ahora vas por ${chapter.title ? `Cap. ${chapter.number}` : (chapter.label ?? `Cap. ${chapter.number}`)}`);

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
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', color: 'var(--text-primary)' }}>Tu camino</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Tocá un capítulo para marcarlo como el tuyo</div>
      </div>

      <div style={{ position: 'relative', padding: '10px 24px 4px' }}>
        {hiddenAbove > 0 && (
          <button
            type="button"
            onClick={onOpenFull}
            style={{
              display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', padding: '2px 0 14px', fontFamily: 'var(--font-body)',
            }}
          >
            + {hiddenAbove} {hiddenAbove === 1 ? 'capítulo más adelante' : 'capítulos más adelante'}
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {path.map((chapter, i) => {
            const originalIndex = chapters.findIndex((c) => c.id === chapter.id);
            const isCurrent = chapter.id === activeId;
            const isDone = currentIndex !== -1 && originalIndex < currentIndex;
            const isSaving = pending && optimisticId === chapter.id;
            const alignRight = i % 2 === 1;
            const showFlame = isCurrent && streakCount >= 2;

            const nextChapter = path[i + 1];
            const nextOriginalIndex = nextChapter ? chapters.findIndex((c) => c.id === nextChapter.id) : null;
            const showSegmentAfter = i < path.length - 1;
            const segmentColored = showSegmentAfter && currentIndex !== -1 && nextOriginalIndex <= currentIndex;

            return (
              <div key={chapter.id}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    {!alignRight && <NodeLabel chapter={chapter} isCurrent={isCurrent} isDone={isDone} align="right" />}
                  </div>
                  <button
                    type="button"
                    ref={isCurrent ? currentNodeRef : undefined}
                    onClick={() => handleTap(chapter)}
                    disabled={isCurrent || isSaving}
                    aria-label={`Cap. ${chapter.number}${isCurrent ? ' (tu capítulo actual)' : ''}`}
                    style={{
                      position: 'relative', width: isCurrent ? 48 : 40, height: isCurrent ? 48 : 40, borderRadius: '50%',
                      border: isDone || isCurrent ? 'none' : '2px solid var(--neutral-200)',
                      background: isDone || isCurrent ? 'var(--accent-500)' : 'var(--surface-card)',
                      boxShadow: isCurrent ? '0 0 0 5px rgba(255,79,50,.18)' : 'none',
                      color: isDone || isCurrent ? 'var(--text-on-accent)' : 'var(--text-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: isCurrent ? 15 : 13,
                      cursor: isCurrent || isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.7 : 1,
                      justifySelf: 'center', margin: '0 auto',
                    }}
                  >
                    {isDone ? <Icon name="check" size={16} color="var(--text-on-accent)" strokeWidth={3} /> : chapter.number}
                    {showFlame && (
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute', top: -8, right: -10, width: 24, height: 24, borderRadius: '50%',
                          background: 'var(--gold-500)', border: '2.5px solid var(--surface-page)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Icon name="flame" size={11} color="#7A3E00" />
                      </span>
                    )}
                  </button>
                  <div style={{ textAlign: 'left' }}>
                    {alignRight && <NodeLabel chapter={chapter} isCurrent={isCurrent} isDone={isDone} align="left" />}
                  </div>
                </div>

                {showSegmentAfter && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', height: 26 }}>
                    <div />
                    <div style={{ width: 3, borderRadius: 2, background: segmentColored ? 'var(--accent-500)' : 'var(--neutral-200)', justifySelf: 'center' }} />
                    <div />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hiddenBelow > 0 && (
          <button
            type="button"
            onClick={onOpenFull}
            style={{
              display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', padding: '14px 0 2px', fontFamily: 'var(--font-body)',
            }}
          >
            + {hiddenBelow} {hiddenBelow === 1 ? 'capítulo ya leído' : 'capítulos ya leídos'}
          </button>
        )}
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

function NodeLabel({ chapter, isCurrent, isDone, align }) {
  const style = {
    textAlign: align, lineHeight: 1.35, fontFamily: 'var(--font-body)',
  };
  if (isCurrent) {
    return (
      <div style={style}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Cap. {chapter.number}</div>
        <div style={{ fontSize: 11, color: 'var(--accent-500)', fontWeight: 700, marginTop: 1, letterSpacing: '.02em' }}>TU CAPÍTULO</div>
      </div>
    );
  }
  return (
    <div style={{ ...style, fontSize: 12.5, color: isDone ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
      Cap. {chapter.number}
      {chapter.title && <><br />{chapter.title}</>}
    </div>
  );
}
