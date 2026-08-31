'use client';

import Link from 'next/link';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { FollowButton } from '@/components/FollowButton';

// La lista completa de integrantes de un club, abierta desde la pila de
// avatares en "Mis clubes de lectura". Cada fila lleva al perfil de esa
// persona (mismo patrón que ya usa ActivityCard) y, si no sos vos, el botón
// para seguirla — mismo componente que ya usa Perfil.
export function ClubMembersModal({ clubName, members, currentUserId, onClose }) {
  return (
    <Modal title={clubName} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginBottom: 10 }}>
          {members.length} {members.length === 1 ? 'integrante' : 'integrantes'}
        </div>

        {members.map((m) => {
          const isSelf = m.profileId === currentUserId;
          return (
            <div key={m.profileId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0' }}>
              <Link href={`/perfil/${m.profileId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textDecoration: 'none' }}>
                <Avatar name={m.displayName} src={m.avatarUrl} size={40} />
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.displayName} {isSelf && <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(tú)</span>}
                </div>
              </Link>
              {!isSelf && <FollowButton profileId={m.profileId} initialFollowing={m.isFollowing} />}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
