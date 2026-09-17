'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { getPastClubBookDetail } from '@/app/actions/clubs';
import { PastChapterPath } from '@/components/PastChapterPath';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatRange(startedAt, finishedAt) {
  if (startedAt && finishedAt) return `${formatDate(startedAt)} – ${formatDate(finishedAt)}`;
  if (finishedAt) return `Terminado ${formatDate(finishedAt)}`;
  if (startedAt) return `Empezado ${formatDate(startedAt)}`;
  return null;
}

// "Libros anteriores" — los libros que este club ya dejó atrás (migración
// 056, "Empezar un libro nuevo"), en la sección que se abre deslizando a
// la izquierda desde "Tu camino" (migración 058: antes no había ninguna
// forma de volver a verlos). Tocar uno pide su detalle bajo demanda
// (getPastClubBookDetail) y lo muestra en un camino de solo lectura
// (PastChapterPath), como una hoja aparte.
export function PastBooksList({ clubId, books }) {
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [, startTransition] = useTransition();

  function openBook(clubBookId) {
    setOpenId(clubBookId);
    setDetail(null);
    startTransition(async () => {
      const data = await getPastClubBookDetail(clubBookId);
      setDetail(data);
    });
  }

  return (
    <div style={{ padding: '18px 18px 24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', color: 'var(--text-primary)' }}>Libros anteriores</div>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginBottom: 10 }}>
        Lo que el club ya leyó antes de este libro.
      </div>

      {books.map((b) => (
        <button
          key={b.clubBookId}
          type="button"
          onClick={() => openBook(b.clubBookId)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)',
            background: 'none', border: 'none', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--border-subtle)',
            cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font-body)',
          }}
        >
          <div
            style={{
              width: 40, height: 56, borderRadius: 'var(--radius-sm)', flexShrink: 0, overflow: 'hidden',
              background: b.coverUrl ? `center/cover no-repeat url(${b.coverUrl})` : 'var(--accent-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 3,
            }}
          >
            {!b.coverUrl && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.15 }}>{b.title}</span>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{b.title}</div>
            <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>{b.author}</div>
            {formatRange(b.startedAt, b.finishedAt) && (
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                {formatRange(b.startedAt, b.finishedAt)}
              </div>
            )}
          </div>
        </button>
      ))}

      {openId && (
        <Modal title={detail?.book?.title ?? 'Cargando…'} onClose={() => setOpenId(null)}>
          {!detail ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>Cargando…</div>
          ) : (
            <PastChapterPath
              clubId={clubId}
              clubBookId={openId}
              book={detail.book}
              chapters={detail.chapters}
              volumes={detail.volumes}
              myProgress={detail.myProgress}
              commentCounts={detail.commentCounts}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
