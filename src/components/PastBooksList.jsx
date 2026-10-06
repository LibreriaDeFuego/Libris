'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
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

// "Otros libros del club" (migración 060) — todo lo que el club tiene
// aparte del que se está mirando ahora: libros en PARALELO (is_active,
// se puede seguir comentando y marcando progreso como siempre — tocar uno
// navega directo a su propio "Tu camino", `?libro=`) y libros ARCHIVADOS
// a mano (de solo lectura — tocar uno abre PastChapterPath en una hoja
// aparte, igual que desde la migración 058). El propio libro principal
// del club también puede aparecer acá (si se está mirando uno en
// paralelo): tocarlo vuelve al club a secas, sin `?libro=`.
//
// `isAdmin` solo se usa para la pastilla de "Gestionar capítulos" de cada
// fila EN PARALELO — un libro archivado no la tiene (no tiene sentido
// agregarle capítulos a algo que ya se cerró), y el principal ya tiene su
// propia entrada en Preferencias, no hace falta duplicarla acá.
export function PastBooksList({ clubId, books, isAdmin }) {
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [, startTransition] = useTransition();

  function openArchived(clubBookId) {
    setOpenId(clubBookId);
    setDetail(null);
    startTransition(async () => {
      const data = await getPastClubBookDetail(clubBookId);
      setDetail(data);
    });
  }

  return (
    <div style={{ padding: '18px 18px 24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', color: 'var(--text-primary)' }}>Otros libros del club</div>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginBottom: 10 }}>
        Los demás libros que este club está leyendo, o ya leyó.
      </div>

      {books.map((b) => {
        const statusLabel = b.isPrincipal ? 'Principal' : b.isActive ? 'En paralelo' : 'Archivado';
        const statusColor = b.isActive ? 'var(--accent-600)' : 'var(--text-tertiary)';
        const href = b.isPrincipal ? `/club/${clubId}` : `/club/${clubId}?libro=${b.clubBookId}`;

        const row = (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)',
              width: '100%',
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
              <div style={{ fontSize: 10.5, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                {statusLabel}
              </div>
              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{b.title}</div>
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>{b.author}</div>
              {formatRange(b.startedAt, b.finishedAt) && (
                <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {formatRange(b.startedAt, b.finishedAt)}
                </div>
              )}
            </div>
            {isAdmin && b.isActive && !b.isPrincipal && (
              <Link
                href={`/club/${clubId}/capitulos?libro=${b.clubBookId}`}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Gestionar capítulos de ${b.title}`}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 'var(--radius-round)', background: 'var(--surface-sunken)',
                }}
              >
                <Icon name="list" size={14} color="var(--text-secondary)" />
              </Link>
            )}
          </div>
        );

        return b.isActive ? (
          <Link key={b.clubBookId} href={href} style={{ textDecoration: 'none', width: '100%' }}>
            {row}
          </Link>
        ) : (
          <button
            key={b.clubBookId}
            type="button"
            onClick={() => openArchived(b.clubBookId)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font-body)' }}
          >
            {row}
          </button>
        );
      })}

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
