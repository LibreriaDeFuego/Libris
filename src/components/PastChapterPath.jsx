'use client';

import Link from 'next/link';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { orderChapters } from '@/lib/orderChapters';

// Mismo degradé que ChapterPath (src/components/ChapterPath.jsx) —
// duplicado a propósito, no importado de ahí: ese archivo asume que
// siempre hay progreso para actualizar (tap, "+", preguntas, compañeros),
// nada de eso aplica acá.
const PATH_START = '#3B4B66';
const PATH_END = '#FF4F32';
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function pathColor(originalIndex, currentIndex) {
  return lerpColor(PATH_START, PATH_END, currentIndex <= 0 ? 1 : originalIndex / currentIndex);
}

const VOLUME_PALETTE = ['#5B4B8A', '#C98A2E', '#2B7A78', '#9C5261', '#5C8A46', '#3B5B7A'];

// El camino de un libro que el club YA DEJÓ ATRÁS (migración 056, "Empezar
// un libro nuevo") — se llega desde "Libros anteriores" en Tu camino
// (PastBooksList, deslizando a la izquierda; migración 058). Mismo trato
// visual que ChapterPath (degradé, nodos, títulos de volumen), pero de
// SOLO LECTURA: ningún nodo se puede tocar para cambiar progreso, no hay
// broche "+" para agregar nada nuevo, y la pastilla de comentarios de cada
// capítulo es siempre un link directo — sin aviso de spoiler, el libro ya
// terminó para el club. Tu propia reseña (si la escribiste) se sigue
// pudiendo editar, pero no desde acá — el link de abajo de todo lleva a
// Comentarios de este libro puntual, donde vive ese formulario.
export function PastChapterPath({ clubId, clubBookId, book, chapters, volumes = [], myProgress, commentCounts = {} }) {
  const orderedChapters = orderChapters(chapters ?? [], volumes ?? []);

  if (orderedChapters.length === 0) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>
        Este libro no llegó a tener capítulos cargados.
      </div>
    );
  }

  const currentChapterId = myProgress?.chapter_id ?? null;
  const currentIndex = orderedChapters.findIndex((c) => c.id === currentChapterId);

  const sortedVolumes = [...volumes].sort((a, b) => a.position - b.position);
  function volumeKeyOf(chapter) {
    return chapter.volume_id && sortedVolumes.some((v) => v.id === chapter.volume_id) ? chapter.volume_id : null;
  }
  function volumeColorOf(key) {
    if (key == null) return 'var(--neutral-400)';
    const idx = sortedVolumes.findIndex((v) => v.id === key);
    return idx === -1 ? 'var(--neutral-400)' : VOLUME_PALETTE[idx % VOLUME_PALETTE.length];
  }
  function volumeLabelOf(key) {
    return key == null ? 'Sin volumen' : (sortedVolumes.find((v) => v.id === key)?.name ?? 'Sin volumen');
  }
  const showVolumeHeaders = new Set(orderedChapters.map((c) => volumeKeyOf(c))).size > 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
        {book?.author}
        {book?.author && ' · '}
        {currentIndex === -1 ? 'No llegaste a registrar progreso en este libro.' : 'Así quedó tu camino cuando el club pasó a otro libro.'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {orderedChapters.map((chapter, i) => {
          const isCurrent = chapter.id === currentChapterId;
          const isDone = currentIndex !== -1 && i < currentIndex;
          const nodeColor = isDone || isCurrent ? pathColor(i, currentIndex) : null;
          const commentInfo = commentCounts[chapter.id];
          const volumeKey = volumeKeyOf(chapter);
          const isFirstOfVolume = showVolumeHeaders && (i === 0 || volumeKeyOf(orderedChapters[i - 1]) !== volumeKey);
          const nextChapter = orderedChapters[i + 1];
          const showSegmentAfter = Boolean(nextChapter);
          const segmentColored = showSegmentAfter && currentIndex !== -1 && i + 1 <= currentIndex;

          return (
            <div key={chapter.id}>
              {isFirstOfVolume && (
                <div
                  style={{
                    textAlign: 'center', fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                    color: volumeColorOf(volumeKey), margin: i === 0 ? '0 0 10px' : '14px 0 10px',
                  }}
                >
                  {volumeLabelOf(volumeKey)}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  {commentInfo?.total > 0 && (
                    <Link
                      href={`/club/${clubId}/comentarios?capitulo=${chapter.id}&libro=${clubBookId}`}
                      style={{ fontSize: 12, color: 'var(--text-link)', fontWeight: 700, textDecoration: 'none' }}
                    >
                      {commentInfo.total} {commentInfo.total === 1 ? 'comentario' : 'comentarios'}
                    </Link>
                  )}
                </div>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: '50%', justifySelf: 'center',
                    border: isDone || isCurrent ? 'none' : '2px solid var(--neutral-200)',
                    background: nodeColor ?? 'var(--surface-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12,
                    color: isDone || isCurrent ? 'var(--text-on-accent)' : 'var(--text-tertiary)',
                  }}
                >
                  {isDone ? <Icon name="check" size={14} color="var(--text-on-accent)" strokeWidth={3} /> : chapter.number}
                </div>
                <div style={{ textAlign: 'left', fontSize: 12.5, color: isDone || isCurrent ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
                  Cap. {chapter.number}
                  {chapter.title && <><br />{chapter.title}</>}
                  {isCurrent && (
                    <div style={{ fontSize: 10.5, color: 'var(--accent-500)', fontWeight: 700, marginTop: 1 }}>TE QUEDASTE ACÁ</div>
                  )}
                </div>
              </div>

              {showSegmentAfter && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', height: 22 }}>
                  <div />
                  <div
                    style={{
                      width: 3, borderRadius: 2, justifySelf: 'center',
                      background: segmentColored ? (nodeColor ?? PATH_START) : 'var(--neutral-200)',
                    }}
                  />
                  <div />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Link
        href={`/club/${clubId}/comentarios?libro=${clubBookId}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4,
          fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-link)', textDecoration: 'none',
        }}
      >
        Ver comentarios y tu reseña de este libro
        <Icon name="arrow-right" size={12} color="var(--text-link)" />
      </Link>
    </div>
  );
}
