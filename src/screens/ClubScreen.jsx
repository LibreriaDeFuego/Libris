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
import { formatMeetingDate, googleMapsUrl } from '@/lib/meetingFormat';

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

  // Opcional — solo se arma si un administrador cargó fecha en
  // Preferencias (ver README). El destino del botón depende de la
  // modalidad: el link tal cual si es por videollamada, o un link de
  // Google Maps armado con el texto del lugar si es presencial (sin API
  // key ni mapa embebido, solo la búsqueda pública de Maps).
  const meetingInfo = club.meeting_at && (
    <div style={{ margin: '0 18px 16px', padding: 14, borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-round)', background: 'var(--accent-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name="calendar" size={17} color="var(--accent-600)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {formatMeetingDate(club.meeting_at)}
        </div>
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {club.meeting_mode === 'lugar' ? club.meeting_place : 'Por videollamada'}
        </div>
      </div>
      <a
        href={club.meeting_mode === 'lugar' ? googleMapsUrl(club.meeting_place) : club.meeting_link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '8px 12px',
          borderRadius: 'var(--radius-pill)', background: 'var(--accent-500)', color: 'var(--text-on-accent)',
          fontSize: 'var(--fs-2xs)', fontWeight: 700, textDecoration: 'none',
        }}
      >
        {club.meeting_mode === 'lugar' ? 'Cómo llegar' : 'Unirse'}
        <Icon name="external-link" size={12} color="var(--text-on-accent)" />
      </a>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {header}
      {meetingInfo}

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
              volumes={volumes ?? []}
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
