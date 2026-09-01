'use client';

import { useState, useTransition } from 'react';
import { uploadBookCover } from '@/app/actions/media';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { CoverCropModal } from '@/components/CoverCropModal';

// Sin <form> propio a propósito: este control se usa dentro del formulario de
// preferencias, y HTML no permite formularios anidados (rompe la hidratación).
// tone='dark' para la tarjeta negra del libro; 'light' sobre fondo claro.
//
// Antes de subir la foto, un recorte propio (no el de PhotoCropModal, que
// usa un marco de proporción fija — círculo para la foto de perfil, 3:4
// para las fotos de publicación). Una portada no tiene una única
// proporción: hay libros de bolsillo bien verticales y libros cuadrados,
// así que acá el marco de recorte es el que se ajusta, no la foto — ver
// CoverCropModal.
export function CoverUploader({ bookId, hasCover, tone = 'dark' }) {
  const [error, setError] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [pending, startTransition] = useTransition();

  const palette = tone === 'dark'
    ? { color: '#fff', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)' }
    : { color: 'var(--text-primary)', background: 'var(--surface-card)', border: '1px solid var(--border-default)' };

  function handlePick(event) {
    const file = event.target.files?.[0];
    // Limpiamos el input para poder reintentar con el mismo archivo si falla.
    event.target.value = '';
    if (!file) return;
    setError(null);
    setPendingFile(file);
  }

  function handleCropConfirm(blob) {
    setPendingFile(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('bookId', bookId);
      formData.set('file', blob, 'portada.jpg');

      const result = await uploadBookCover(null, formData);
      setError(result?.error ?? null);
    });
  }

  return (
    <div>
      <label
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          cursor: pending ? 'default' : 'pointer', opacity: pending ? 0.6 : 1,
          fontSize: 'var(--fs-2xs)', fontWeight: 600,
          borderRadius: 'var(--radius-pill)', padding: '5px 10px', ...palette,
        }}
      >
        <Icon name="image-plus" size={13} color={palette.color} />
        {pending ? 'Subiendo…' : hasCover ? 'Cambiar portada' : 'Subir portada'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={handlePick}
          style={{ display: 'none' }}
        />
      </label>
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', marginTop: 6 }}>{error}</div>
      )}

      {pendingFile && (
        <CoverCropModal
          file={pendingFile}
          title="Ajusta la portada"
          onConfirm={handleCropConfirm}
          onCancel={() => setPendingFile(null)}
        />
      )}
    </div>
  );
}
