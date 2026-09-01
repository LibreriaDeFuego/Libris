'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { InviteButton } from '@/components/InviteButton';
import { ChapterPath } from '@/components/ChapterPath';
import { ClubActivityFeed } from '@/components/ClubActivityFeed';
import { SwipeableSections } from '@/components/SwipeableSections';
import { PreferenciasIconButton } from '@/components/PreferenciasIconButton';
import { UpdateProgressModal } from './UpdateProgressModal.jsx';
import { FinalReviewModal } from './FinalReviewModal.jsx';
import { orderChapters } from '@/lib/orderChapters';

// El héroe grande ya no vive acá — se ve como tarjeta chica en "Mis clubes
// de lectura", y tocarla entra directo a esta pantalla en "Tu camino"
// (ver README). Lo que queda acá es un encabezado liviano (volver + nombre
// del club + las mismas acciones de siempre) y, debajo, el camino y la
// actividad del club — el contenido real de "Progreso y Actividad".
export function ClubScreen({ club, clubs, book, clubBookId, chapters, volumes, myProgress, myReview, activity, commentCounts, otherClubsCount, isAdmin, pendingRequestCount = 0 }) {
  const [showModal, setShowModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const router = useRouter();

  const orderedChapters = orderChapters(chapters, volumes ?? []);

  const headerRight = (
    <>
      <InviteButton clubId={club.id} />
      <PreferenciasIconButton clubId={club.id} pendingRequestCount={isAdmin ? pendingRequestCount : 0} />
    </>
  );

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 14px', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <IconButton aria-label="Volver a mis clubes" onClick={() => router.push('/')} size={34}>
          <Icon name="arrow-left" size={15} />
        </IconButton>
        <div
          style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)',
            minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {club.name}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{headerRight}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {header}

      {book ? (
        <>
          <SwipeableSections
            sections={[
              {
                key: 'camino',
                node: (
                  <ChapterPath
                    clubId={club.id}
                    clubBookId={clubBookId}
                    chapters={orderedChapters}
                    volumes={volumes ?? []}
                    currentChapterId={myProgress?.chapter_id ?? null}
                    streakCount={myProgress?.streak_count ?? 0}
                    commentCounts={commentCounts ?? {}}
                    onOpenFull={() => setShowModal(true)}
                    onFinishBook={() => setShowReviewModal(true)}
                  />
                ),
              },
              { key: 'actividad', node: <ClubActivityFeed clubId={club.id} activity={activity} /> },
            ]}
          />

          {otherClubsCount > 0 && (
            <div style={{ padding: '20px 18px 24px', background: 'var(--surface-page)' }}>
              <div style={{ background: 'var(--success)', borderRadius: 'var(--radius-lg)', padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                <Icon name="users" size={20} color="#fff" />
                <div style={{ fontSize: 'var(--fs-xs)', color: '#fff', fontWeight: 600, lineHeight: 'var(--lh-snug)' }}>
                  {otherClubsCount} {otherClubsCount === 1 ? 'club más está leyendo' : 'clubes más están leyendo'} {book.title} esta semana
                </div>
              </div>
            </div>
          )}

          {showModal && (
            <UpdateProgressModal
              clubBookId={clubBookId}
              chapters={orderedChapters}
              initialCurrentPage={myProgress?.current_page ?? null}
              initialTotalPages={myProgress?.total_pages ?? null}
              initialChapterId={myProgress?.chapter_id ?? null}
              onClose={() => setShowModal(false)}
            />
          )}

          {showReviewModal && (
            <FinalReviewModal
              clubBookId={clubBookId}
              book={book}
              myReview={myReview}
              onClose={() => setShowReviewModal(false)}
            />
          )}
        </>
      ) : (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 18px', textAlign: 'center' }}>
          Este club todavía no tiene un libro activo.
        </div>
      )}
    </div>
  );
}
