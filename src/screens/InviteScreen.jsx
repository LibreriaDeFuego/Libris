'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { joinClubFromInvite } from '@/app/actions/clubs';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';

const initialState = { error: null };

export function InviteScreen({ clubId, club }) {
  const [state, action, pending] = useActionState(joinClubFromInvite, initialState);

  if (!club) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Invitación no válida
        </div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
          Este link no corresponde a ningún club. Pedile a quien te invitó que te lo mande de nuevo.
        </div>
        <Link href="/"><Button variant="secondary" size="md">Ir a mi club</Button></Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '48px 24px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon name="users" size={26} color="var(--accent-500)" />
        </div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Te invitaron a</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-2xl)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 'var(--lh-tight)', marginTop: 4 }}>
          {club.name}
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginTop: 8 }}>
          {club.member_count} {Number(club.member_count) === 1 ? 'miembro' : 'miembros'}
          {club.book_title ? ` · leyendo ${club.book_title}` : ''}
        </div>
      </div>

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="hidden" name="clubId" value={clubId} />
        {state?.error && (
          <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
            {state.error}
          </div>
        )}
        <Button variant="primary" size="lg" type="submit" disabled={pending}>
          {pending ? 'Uniéndote...' : 'Unirme al club'}
        </Button>
      </form>
    </div>
  );
}
