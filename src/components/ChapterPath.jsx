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

// Cuántos puntitos de compañeros se apilan antes de pasar a "+N" — así la
// pastilla de un capítulo mide lo mismo con 3 personas que con 20.
const COMPANION_DOTS = 3;

// Mismo criterio de color que Avatar.jsx (core del design system), para que
// el puntito de acá y el avatar de "Quiénes están leyendo" sean la misma
// persona con el mismo color.
const PALETTE = ['var(--accent-500)', 'var(--gold-500)', 'var(--success)', 'var(--neutral-600)'];
function companionColor(name) {
  return PALETTE[name.length % PALETTE.length];
}
function initials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
function firstName(name) {
  return name.split(' ')[0];
}

// El camino de capítulos del club, estilo Duolingo: sube (los que faltan
// quedan arriba, los ya leídos abajo — subir = avanzar) y tocar un nodo
// actualiza el progreso al toque, igual que hacían los chips que
// reemplaza. La racha de lectura (migración 035) vive integrada en el
// nodo actual, no aparte. "Mostrar quién está leyendo" (apagado por
// defecto) suma, junto a cada capítulo, quiénes de tus compañeros van por
// ahí — mismos datos que ya trae "Quiénes están leyendo" arriba, solo que
// puestos en el lugar donde de verdad importan: al lado del capítulo.
export function ChapterPath({ clubBookId, chapters, currentChapterId, streakCount = 0, members = [], currentUserId, onOpenFull }) {
  const [pending, startTransition] = useTransition();
  const [optimisticId, setOptimisticId] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [showCompanions, setShowCompanions] = useState(false);
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

  const companionsByChapter = new Map();
  for (const m of members) {
    if (!m.chapterId || m.profileId === currentUserId) continue;
    if (!companionsByChapter.has(m.chapterId)) companionsByChapter.set(m.chapterId, []);
    companionsByChapter.get(m.chapterId).push(m);
  }
  const hasCompanions = companionsByChapter.size > 0;

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
        {hasCompanions && (
          <button
            type="button"
            onClick={() => setShowCompanions((v) => !v)}
            style={{
              marginTop: 8, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6,
              borderRadius: 'var(--radius-pill)', padding: '6px 12px 6px 10px', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              border: showCompanions ? '1px solid var(--neutral-900)' : '1px solid var(--border-default)',
              background: showCompanions ? 'var(--neutral-900)' : 'var(--surface-card)',
              color: showCompanions ? 'var(--hero-cream)' : 'var(--text-secondary)',
            }}
          >
            <Icon name={showCompanions ? 'eye-off' : 'eye'} size={13} />
            {showCompanions ? 'Ocultar quién está leyendo' : 'Mostrar quién está leyendo'}
          </button>
        )}
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
            const companions = showCompanions ? companionsByChapter.get(chapter.id) : null;

            const nextChapter = path[i + 1];
            const nextOriginalIndex = nextChapter ? chapters.findIndex((c) => c.id === nextChapter.id) : null;
            const showSegmentAfter = i < path.length - 1;
            const segmentColored = showSegmentAfter && currentIndex !== -1 && nextOriginalIndex <= currentIndex;

            return (
              <div key={chapter.id}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    {!alignRight && <NodeLabel chapter={chapter} isCurrent={isCurrent} isDone={isDone} align="right" />}
                    {alignRight && companions?.length > 0 && <CompanionChip companions={companions} />}
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
                    {!alignRight && companions?.length > 0 && <CompanionChip companions={companions} />}
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

// Pastilla de compañeros: puntitos apilados (hasta COMPANION_DOTS, con
// "+N" si sobran) más "Fulano" o "Fulano y N más" — mismo patrón de texto
// que ya usa "Actividad del club" para agrupar comentarios, solo que con
// el primer nombre nomás (la pastilla es angosta).
function CompanionChip({ companions }) {
  const shown = companions.slice(0, COMPANION_DOTS);
  const extra = companions.length - shown.length;
  const label = companions.length === 1
    ? firstName(companions[0].displayName)
    : `${firstName(companions[0].displayName)} y ${companions.length - 1} más`;

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-card)',
        border: '1px solid var(--border-default)', borderRadius: 'var(--radius-pill)', padding: '3px 10px 3px 3px',
      }}
    >
      <span style={{ display: 'flex' }}>
        {shown.map((m, i) => (
          <span
            key={m.profileId}
            style={{
              width: 14, height: 14, borderRadius: '50%', marginLeft: i === 0 ? 0 : -5,
              border: '1.5px solid var(--surface-page)', background: companionColor(m.displayName),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 6.5, fontWeight: 800, flexShrink: 0,
            }}
          >
            {initials(m.displayName)}
          </span>
        ))}
        {extra > 0 && (
          <span
            style={{
              width: 14, height: 14, borderRadius: '50%', marginLeft: -5, border: '1.5px solid var(--surface-page)',
              background: 'var(--neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', fontSize: 6, fontWeight: 800, flexShrink: 0,
            }}
          >
            +{extra}
          </span>
        )}
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{label}</span>
    </span>
  );
}
