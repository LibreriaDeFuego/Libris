'use client';

import { useState, useTransition } from 'react';
import { uploadAvatar } from '@/app/actions/media';
import { Icon } from '@/design-system/components/core/Icon.jsx';

// Botón chico para subir/cambiar la foto de perfil. Sin <form> propio, para
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
      <label
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          cursor: pending ? 'default' : 'pointer', opacity: pending ? 0.6 : 1,
          fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text-primary)',
          background: 'var(--surface-card)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-pill)', padding: '5px 10px',
        }}
      >
        <Icon name="camera" size={13} />
        {pending ? 'Subiendo…' : hasAvatar ? 'Cambiar foto' : 'Subir foto'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </label>
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}
