'use client';

import { useState, useTransition } from 'react';
import { followProfile, unfollowProfile } from '@/app/actions/profile';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';

// Seguir, con el toggle de verdad (followProfile/unfollowProfile). Dejar de
// seguir no pasa con un solo toque — abre un menú desde abajo a confirmar,
// para que no se le escape a nadie sin querer. Compartido entre el propio
// perfil de alguien y cualquier lista de personas (como los integrantes de
// un club) donde tenga sentido seguir de un toque.
export function FollowButton({ profileId, initialFollowing, size = 'sm' }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function follow() {
    const formData = new FormData();
    formData.set('profileId', profileId);
    setError(null);
    startTransition(async () => {
      const result = await followProfile(formData);
      if (result?.error) setError(result.error);
      else setFollowing(true);
    });
  }

  function confirmUnfollow() {
    const formData = new FormData();
    formData.set('profileId', profileId);
    setError(null);
    startTransition(async () => {
      const result = await unfollowProfile(formData);
      if (result?.error) setError(result.error);
      else {
        setFollowing(false);
        setConfirmOpen(false);
      }
    });
  }

  return (
    <div>
      <Button
        variant={following ? 'secondary' : 'primary'}
        size={size}
        onClick={() => (following ? setConfirmOpen(true) : follow())}
        disabled={pending}
        type="button"
      >
        {pending && !confirmOpen ? '…' : following ? 'Siguiendo' : 'Seguir'}
      </Button>
      {error && !confirmOpen && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', marginTop: 6 }}>{error}</div>
      )}

      {confirmOpen && (
        <Modal title="¿Dejar de seguir?" onClose={() => setConfirmOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              type="button"
              onClick={confirmUnfollow}
              disabled={pending}
              style={{
                width: '100%', textAlign: 'center', padding: '13px 14px',
                fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--danger)',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              {pending ? 'Dejando de seguir…' : 'Dejar de seguir'}
            </button>
            {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', textAlign: 'center' }}>{error}</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
