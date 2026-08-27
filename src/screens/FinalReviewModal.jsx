'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { postBookReview } from '@/app/actions/clubs';
import { BookReviewCard } from '@/components/BookReviewCard';

// Se abre justo después de declarar un libro terminado (Actualizar
// progreso → "Terminado"). Título obligatorio, reseña opcional pero pensada
// para ser larga — en el feed se ve hasta 5 líneas, con el resto detrás de
// "seguir leyendo". "myReview" (si llega) precarga el formulario para editar
// la reseña que esa persona ya había publicado para este libro, en vez de
// crear una segunda.
export function FinalReviewModal({ clubBookId, book, myReview, onClose }) {
  const [title, setTitle] = useState(myReview?.title ?? '');
  const [body, setBody] = useState(myReview?.body ?? '');
  const [isSpoiler, setIsSpoiler] = useState(myReview?.is_spoiler ?? false);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const formData = new FormData();
    formData.set('clubBookId', clubBookId);
    if (myReview?.id) formData.set('reviewId', myReview.id);
    formData.set('title', title);
    formData.set('body', body);
    if (isSpoiler) formData.set('isSpoiler', 'on');

    startTransition(async () => {
      const result = await postBookReview(formData);
      if (result?.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <Modal title="¡Lo terminaste! Contanos qué te pareció" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <BookReviewCard title={title || 'Tu título acá'} coverUrl={book?.cover_url} />
        <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        <Textarea
          placeholder="Tu reseña — lo que quieras contar del libro (opcional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
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
            Después
          </Button>
          <Button variant="primary" size="md" type="button" onClick={handleSave} disabled={pending || !title.trim()}>
            {pending ? 'Publicando...' : 'Publicar reseña'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
