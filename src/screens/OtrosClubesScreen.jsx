'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { joinClubFromInvite } from '@/app/actions/clubs';
import { Button } from '@/design-system/components/core/Button.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';

function JoinButton({ clubId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleJoin() {
    const formData = new FormData();
    formData.set('clubId', clubId);
    startTransition(async () => {
      const result = await joinClubFromInvite(null, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={handleJoin} disabled={pending} type="button">
        {pending ? 'Uniéndote…' : 'Unirme'}
      </Button>
      {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

export function OtrosClubesScreen({ clubs }) {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => router.push('/')}><Icon name="arrow-left" size={18} /></IconButton>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Descubrir clubes
        </div>
      </div>
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: -12 }}>
        Clubes que eligieron ser públicos. Los privados no aparecen acá.
      </div>

      {clubs.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
          Todavía no hay clubes públicos para unirse.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clubs.map((club) => (
            <div
              key={club.id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 12, boxShadow: 'var(--shadow-sm)' }}
            >
              <Avatar name={club.name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{club.name}</div>
                <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>
                  {club.member_count} {Number(club.member_count) === 1 ? 'miembro' : 'miembros'}
                  {club.book_title ? ` · leyendo ${club.book_title}` : ''}
                </div>
              </div>
              <JoinButton clubId={club.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
