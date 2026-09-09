'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { updatePost } from '@/app/actions/posts';

// Editar tu propia publicación: si tiene foto, queda fija (vista previa
// de solo lectura arriba) — lo único editable es el texto. Una
// publicación de solo texto (migración 049, sin photoUrl) edita nomás el
// texto, sin ninguna vista previa arriba.
export function EditPostModal({ postId, photoUrl, initialCaption, onClose }) {
  const [caption, setCaption] = useState(initialCaption ?? '');
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const formData = new FormData();
    formData.set('postId', postId);
    formData.set('caption', caption);
    startTransition(async () => {
      const result = await updatePost(formData);
      if (result?.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <Modal title={photoUrl ? 'Editar foto' : 'Editar texto'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa de la foto ya publicada, en Storage.
          <img
            src={photoUrl}
            alt=""
            style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 'var(--radius-md)', display: 'block' }}
          />
        )}
        <Textarea
          placeholder={photoUrl ? 'Escribe algo sobre esta foto (opcional)' : '¿Qué estás leyendo?'}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={photoUrl ? 2 : 4}
        />
        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="md" type="button" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" type="button" onClick={handleSave} disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
