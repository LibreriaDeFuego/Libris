'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookCard } from '@/design-system/components/content/BookCard.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { SignOutButton } from '@/components/SignOutButton';
import { InviteButton } from '@/components/InviteButton';
import { UpdateProgressModal } from './UpdateProgressModal.jsx';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

export function ClubScreen({ club, book, clubBookId, chapters, myProgress, previews, otherClubsCount }) {
  const [showModal, setShowModal] = useState(false);

  const totalChapters = chapters.length;
  const currentChapter = chapters.find((c) => c.id === myProgress?.chapter_id) ?? chapters[0] ?? null;
  const currentChapterNumber = currentChapter?.number ?? 0;
  const percent = myProgress?.percent ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {club.name}
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
            {club.is_private ? 'Club privado' : 'Club público'} · {club.memberCount} {club.memberCount === 1 ? 'miembro' : 'miembros'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <InviteButton clubId={club.id} />
          <SignOutButton />
        </div>
      </div>

      {book ? (
        <>
          <BookCard
            title={book.title}
            club={book.author}
            chapterLabel={totalChapters > 0 ? `Cap. ${currentChapterNumber} de ${totalChapters}` : 'Sin capítulos todavía'}
            progress={percent}
          />

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Button variant="primary" size="md" onClick={() => setShowModal(true)} disabled={totalChapters === 0}>
                <Icon name="book-open" size={16} />
                Actualizar progreso
              </Button>
            </div>
            <Link href="/club/comentarios">
              <Button variant="secondary" size="md">Comentarios</Button>
            </Link>
          </div>

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
                        {p.is_spoiler ? 'Comentario con spoiler — abrilo en Comentarios' : p.body}
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

          {showModal && (
            <UpdateProgressModal
              clubBookId={clubBookId}
              chapters={chapters}
              initialChapterId={currentChapter?.id}
              initialPercent={percent}
              initialReaction={myProgress?.reaction ?? null}
              onClose={() => setShowModal(false)}
            />
          )}
        </>
      ) : (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
          Este club todavía no tiene un libro activo.
        </div>
      )}
    </div>
  );
}
