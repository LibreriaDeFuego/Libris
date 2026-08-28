'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { updateComment } from '@/app/actions/clubs';

// Editar tu propio comentario de capítulo (kind = 'text') — solo el texto
// y el spoiler, no hay nada más que editar acá.
export function EditCommentModal({ comment, onClose }) {
  const [body, setBody] = useState(comment.body ?? '');
  const [isSpoiler, setIsSpoiler] = useState(comment.is_spoiler ?? false);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const text = body.trim();
    if (!text) {
      setError('Escribe algo antes de guardar.');
      return;
    }
    const formData = new FormData();
    formData.set('commentId', comment.id);
    formData.set('body', text);
    if (isSpoiler) formData.set('isSpoiler', 'on');

    startTransition(async () => {
      const result = await updateComment(formData);
      if (result?.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <Modal title="Editar comentario" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="¿Qué te pareció este tramo del libro?"
          rows={4}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={isSpoiler} onChange={(e) => setIsSpoiler(e.target.checked)} />
          Contiene spoilers
        </label>
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
