'use client';

import { useState, useTransition } from 'react';
import { uploadBookCover } from '@/app/actions/media';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { PhotoCropModal } from '@/components/PhotoCropModal';

// Proporción 2:3 (ancho/alto ≈ 0.667) — la de una portada de libro de bolsillo
// de toda la vida. No es la que ya se usaba de facto en las tarjetas (esas
// solo encuadran "cover" lo que llegue, sea cual sea su proporción real);
// acá sí elegimos una, porque ahora es la persona quien decide qué parte de
// su foto entra en ese rectángulo.
const COVER_ASPECT = 2 / 3;

// Sin <form> propio a propósito: este control se usa dentro del formulario de
// preferencias, y HTML no permite formularios anidados (rompe la hidratación).
// tone='dark' para la tarjeta negra del libro; 'light' sobre fondo claro.
//
// Antes de subir la foto, un recorte propio (no el círculo de la foto de
// perfil ni el 3:4 de las fotos de publicación): mismo mecanismo de
// arrastrar + acercar de PhotoCropModal, pero con la proporción de una
// portada de libro. Así la persona elige qué parte de la foto que subió
// queda dentro del rectángulo, en vez de que quede recortada a lo que sea
// que decida el contenedor donde se muestre.
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
        <PhotoCropModal
          file={pendingFile}
          aspect={COVER_ASPECT}
          shape="square"
          outputSize={720}
          title="Ajusta la portada"
          onConfirm={handleCropConfirm}
          onCancel={() => setPendingFile(null)}
        />
      )}
    </div>
  );
}
