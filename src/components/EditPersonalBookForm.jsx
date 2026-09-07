'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePersonalBook } from '@/app/actions/library';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';

// Editar un libro agregado a mano — se abre al tocar su portada en Mi
// Biblioteca (solo la propia, solo los de source === 'personal'). No deja
// cambiar la portada (mismo recorte de AddPersonalBookForm sería repetir
// todo ese flujo para un cambio que en general es "se me pasó poner la
// fecha") — updatePersonalBook, igual que updatePost, solo toca texto.
export function EditPersonalBookForm({ book, onClose }) {
  const router = useRouter();
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? '');
  const [startedAt, setStartedAt] = useState(book.started_at ?? '');
  const [finishedAt, setFinishedAt] = useState(book.finished_at ?? '');
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!title.trim()) {
      setError('Escribe el título del libro.');
      return;
    }
    const formData = new FormData();
    formData.set('bookId', book.book_id);
    formData.set('title', title.trim());
    formData.set('author', author.trim());
    formData.set('startedAt', startedAt);
    formData.set('finishedAt', finishedAt);

    startTransition(async () => {
      const result = await updatePersonalBook(null, formData);
      if (result?.error) setError(result.error);
      else {
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <Modal title="Editar libro" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Autor (opcional)" value={author} onChange={(e) => setAuthor(e.target.value)} />

        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>Empezaste</span>
            <Input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          </label>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>Terminaste</span>
            <Input type="date" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} />
          </label>
        </div>
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>
          Si todavía lo estás leyendo, deja “Terminaste” en blanco.
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="md" type="button" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" type="button" onClick={save} disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
