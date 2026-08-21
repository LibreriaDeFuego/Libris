'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { SignOutButton } from '@/components/SignOutButton';
import { InviteButton } from '@/components/InviteButton';
import { CoverHero } from '@/components/CoverHero';
import { UpdateProgressModal } from './UpdateProgressModal.jsx';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { orderChapters } from '@/lib/orderChapters';
import { computeHeroProgress } from '@/lib/heroProgress';

export function ClubScreen({ club, clubs, book, clubBookId, chapters, volumes, myProgress, previews, otherClubsCount, isAdmin }) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const orderedChapters = orderChapters(chapters, volumes ?? []);
  const percent = myProgress?.percent ?? 0;
  const { progressMeta, unit, pips } = computeHeroProgress({ chapters, volumes, myProgress, percent });

  const headerRight = (
    <>
      <InviteButton clubId={club.id} tone="glass" />
      {isAdmin && (
        <Link href={`/club/${club.id}/capitulos`}>
          <IconButton aria-label="Gestionar capítulos" tone="glass" size={36}><Icon name="list" size={16} /></IconButton>
        </Link>
      )}
      <Link href={`/club/${club.id}/preferencias`}>
        <IconButton aria-label="Preferencias del club" tone="glass" size={36}><Icon name="settings" size={16} /></IconButton>
      </Link>
      <SignOutButton tone="glass" />
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {book ? (
        <>
          <CoverHero
            book={book}
            crop={book.cover_crop}
            hasTitle={book.cover_has_title ?? true}
            clubs={clubs}
            activeClub={club}
            hasActivity={previews.length > 0}
            onBack={() => router.push('/')}
            headerRight={headerRight}
            progressMeta={progressMeta}
            unit={unit}
            percent={percent}
            pips={pips}
            onPrimaryClick={() => setShowModal(true)}
            commentsHref={`/club/${club.id}/comentarios`}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 18px 24px', background: 'var(--surface-page)' }}>
            {otherClubsCount > 0 && (
              <div style={{ background: 'var(--success)', borderRadius: 'var(--radius-lg)', padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                <Icon name="users" size={20} color="#fff" />
                <div style={{ fontSize: 'var(--fs-xs)', color: '#fff', fontWeight: 600, lineHeight: 'var(--lh-snug)' }}>
                  {otherClubsCount} {otherClubsCount === 1 ? 'club más está leyendo' : 'clubes más están leyendo'} {book.title} esta semana
                </div>
              </div>
            )}

            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                Impresiones recientes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {previews.map((p) => {
                  const name = p.profiles?.display_name ?? 'Alguien';
                  return (
                    <div key={p.id} style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: 12, display: 'flex', gap: 10, boxShadow: 'var(--shadow-sm)' }}>
                      <Avatar name={name} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {formatRelativeTime(p.created_at)}</span>
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--fs-sm)',
                            color: p.kind === 'quote' ? 'var(--gold-700)' : 'var(--text-secondary)',
                            fontStyle: p.kind === 'quote' ? 'italic' : 'normal',
                            marginTop: 2,
                          }}
                        >
                          {p.is_spoiler
                            ? 'Comentario con spoiler — ábrelo en Comentarios'
                            : p.kind === 'voice'
                              ? 'Nota de voz — escúchala en Comentarios'
                              : p.body}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {previews.length === 0 && (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '12px 0', textAlign: 'center' }}>
                    Todavía no hay comentarios en este libro.
                  </div>
                )}
              </div>
            </div>
          </div>

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
              <Link href={`/club/${club.id}/preferencias`}>
                <IconButton aria-label="Preferencias del club"><Icon name="settings" size={18} /></IconButton>
              </Link>
              <SignOutButton />
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
