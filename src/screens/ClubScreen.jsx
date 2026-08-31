'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { InviteButton } from '@/components/InviteButton';
import { CoverHero } from '@/components/CoverHero';
import { MemberProgressStrip } from '@/components/MemberProgressStrip';
import { ChapterPath } from '@/components/ChapterPath';
import { ClubActivityFeed } from '@/components/ClubActivityFeed';
import { SwipeableSections } from '@/components/SwipeableSections';
import { UpdateProgressModal } from './UpdateProgressModal.jsx';
import { FinalReviewModal } from './FinalReviewModal.jsx';
import { orderChapters } from '@/lib/orderChapters';
import { computeHeroProgress } from '@/lib/heroProgress';

function PreferenciasIconButton({ clubId, pendingRequestCount, tone }) {
  return (
    <Link href={`/club/${clubId}/preferencias`} style={{ position: 'relative' }}>
      <IconButton aria-label="Preferencias del club" tone={tone} size={36}><Icon name="settings" size={16} /></IconButton>
      {pendingRequestCount > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 999,
            background: 'var(--accent-500)', color: '#fff', fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            border: `2px solid ${tone === 'glass' ? 'var(--hero-bg)' : 'var(--surface-page)'}`,
          }}
        >
          {pendingRequestCount}
        </span>
      )}
    </Link>
  );
}

export function ClubScreen({ club, clubs, book, clubBookId, chapters, volumes, myProgress, myReview, members, activity, currentUserId, hasActivity, otherClubsCount, isAdmin, pendingRequestCount = 0 }) {
  const [showModal, setShowModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const router = useRouter();

  const orderedChapters = orderChapters(chapters, volumes ?? []);
  const percent = myProgress?.percent ?? 0;
  const { progressMeta, unit, pips } = computeHeroProgress({ chapters, volumes, myProgress, percent });

  const headerRight = (
    <>
      <Link href={`/club/${club.id}/comentarios`}>
        <IconButton aria-label="Comentarios del club" tone="glass" size={36}><Icon name="message-circle" size={16} /></IconButton>
      </Link>
      <InviteButton clubId={club.id} tone="glass" />
      {isAdmin && (
        <Link href={`/club/${club.id}/capitulos`}>
          <IconButton aria-label="Gestionar capítulos" tone="glass" size={36}><Icon name="list" size={16} /></IconButton>
        </Link>
      )}
      <PreferenciasIconButton clubId={club.id} pendingRequestCount={isAdmin ? pendingRequestCount : 0} tone="glass" />
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {book ? (
        <>
          <CoverHero
            book={book}
            clubs={clubs}
            activeClub={club}
            hasActivity={hasActivity}
            onBack={() => router.push('/')}
            headerRight={headerRight}
            progressMeta={progressMeta}
            unit={unit}
            percent={percent}
            pips={pips}
            onPrimaryClick={() => setShowModal(true)}
          />

          <MemberProgressStrip
            members={members ?? []}
            currentUserId={currentUserId}
            myChapterId={myProgress?.chapter_id ?? null}
          />

          <SwipeableSections
            sections={[
              {
                key: 'camino',
                node: (
                  <ChapterPath
                    clubBookId={clubBookId}
                    chapters={orderedChapters}
                    currentChapterId={myProgress?.chapter_id ?? null}
                    streakCount={myProgress?.streak_count ?? 0}
                    onOpenFull={() => setShowModal(true)}
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
              isAdmin={isAdmin}
              initialChapterId={myProgress?.chapter_id ?? null}
              initialCurrentPage={myProgress?.current_page ?? null}
              initialTotalPages={myProgress?.total_pages ?? null}
              initialReaction={myProgress?.reaction ?? null}
              onClose={() => setShowModal(false)}
              onFinished={() => {
                setShowModal(false);
                setShowReviewModal(true);
              }}
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
        <div style={{ padding: '20px 18px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <IconButton aria-label="Volver a mis clubes" onClick={() => router.push('/')}>
              <Icon name="arrow-left" size={16} />
            </IconButton>
            <div style={{ display: 'flex', gap: 8 }}>
              <InviteButton clubId={club.id} />
              <PreferenciasIconButton clubId={club.id} pendingRequestCount={isAdmin ? pendingRequestCount : 0} tone="light" />
            </div>
          </div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
            Este club todavía no tiene un libro activo.
          </div>
        </div>
      )}
    </div>
  );
}
