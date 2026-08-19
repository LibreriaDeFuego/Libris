'use client';

import { useActionState, useRef } from 'react';
import { uploadBookCover } from '@/app/actions/media';
import { Icon } from '@/design-system/components/core/Icon.jsx';

const initialState = { error: null };

// Botón discreto sobre la tarjeta del libro: abre el selector de archivos y
// envía en cuanto se elige una imagen, sin un paso extra de confirmación.
export function CoverUploader({ bookId, hasCover }) {
  const [state, action] = useActionState(uploadBookCover, initialState);
  const formRef = useRef(null);

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="bookId" value={bookId} />
      <label
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontSize: 'var(--fs-2xs)', fontWeight: 600, color: '#fff',
          background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 'var(--radius-pill)', padding: '5px 10px',
        }}
      >
        <Icon name="image-plus" size={13} color="#fff" />
        {hasCover ? 'Cambiar portada' : 'Subir portada'}
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={() => formRef.current?.requestSubmit()}
        />
      </label>
      {state?.error && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', marginTop: 6 }}>{state.error}</div>
      )}
    </form>
  );
}
