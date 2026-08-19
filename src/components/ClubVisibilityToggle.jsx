'use client';

import { useTransition } from 'react';
import { setClubVisibility } from '@/app/actions/clubs';
import { Icon } from '@/design-system/components/core/Icon.jsx';

// Un club privado aparece como "Un club" ante quienes leen el mismo libro;
// uno público muestra su nombre. Solo lo ve y lo cambia quien creó el club.
export function ClubVisibilityToggle({ clubId, isPrivate }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    const formData = new FormData();
    formData.set('clubId', clubId);
    formData.set('isPrivate', String(!isPrivate));
    startTransition(() => setClubVisibility(formData));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none',
        border: 'none', padding: 0, cursor: pending ? 'default' : 'pointer',
        color: 'var(--text-link)', fontSize: 'var(--fs-2xs)', fontWeight: 600,
        opacity: pending ? 0.5 : 1,
      }}
    >
      <Icon name={isPrivate ? 'eye-off' : 'eye'} size={13} />
      {isPrivate ? 'Mostrar el nombre del club a otros clubes' : 'Ocultar el nombre del club'}
    </button>
  );
}
