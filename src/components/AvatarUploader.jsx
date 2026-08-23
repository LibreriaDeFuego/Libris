'use client';

import { useState, useTransition } from 'react';
import { uploadAvatar } from '@/app/actions/media';
import { Icon } from '@/design-system/components/core/Icon.jsx';

const pillStyle = (pending) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  cursor: pending ? 'default' : 'pointer', opacity: pending ? 0.6 : 1,
  fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text-primary)',
  background: 'var(--surface-card)', border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-pill)', padding: '5px 10px',
});

// Dos botones chicos para subir/cambiar la foto de perfil — de la galería, o
// sacándola en el momento con la cámara (capture="user" abre la cámara
// frontal, la que tiene sentido para una selfie). Sin <form> propio, para
// poder usarse dentro del formulario de "Editar perfil" sin anidar formularios.
export function AvatarUploader({ hasAvatar }) {
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function handleChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set('file', file);
    event.target.value = '';

    startTransition(async () => {
      const result = await uploadAvatar(null, formData);
      setError(result?.error ?? null);
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label style={pillStyle(pending)}>
          <Icon name="image" size={13} />
          {pending ? 'Subiendo…' : hasAvatar ? 'Cambiar foto' : 'Elegir foto'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            onChange={handleChange}
            style={{ display: 'none' }}
          />
        </label>
        <label style={pillStyle(pending)}>
          <Icon name="camera" size={13} />
          Tomar foto
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            disabled={pending}
            onChange={handleChange}
            style={{ display: 'none' }}
          />
        </label>
      </div>
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}
