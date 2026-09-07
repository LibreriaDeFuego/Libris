'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateClubBookDates } from '@/app/actions/library';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';

// Corregir las fechas de un libro DE CLUB — se abre al tocar su portada
// en Mi Biblioteca (la propia). Sin campos de título/autor: esos son del
// libro del club, la misma edición que ven todos los que están en ese
// club — solo se corrigen las fechas (pensado sobre todo para el caso
// que ya advierte la migración 047: un libro de club de antes de esa
// fecha quedó con "empezaste" en el día en que se corrió, no en el
// real).
export function EditClubBookDatesForm({ book, onClose }) {
  const router = useRouter();
  const [startedAt, setStartedAt] = useState(book.started_at ?? '');
  const [finishedAt, setFinishedAt] = useState(book.finished_at ?? '');
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function save() {
    // No debería pasar (mode='finished' siempre crea el registro de
    // progreso antes de poder reseñar, ver clubs.js) pero si por lo que
    // sea faltara, no hay a qué fila apuntar el update.
    if (!book.club_book_id) {
      setError('No encontramos el registro de progreso de este libro.');
      return;
    }
    if (!startedAt) {
      setError('Indica cuándo empezaste a leerlo.');
      return;
    }
    const formData = new FormData();
    formData.set('clubBookId', book.club_book_id);
    formData.set('startedAt', startedAt);
    formData.set('finishedAt', finishedAt);

    startTransition(async () => {
      const result = await updateClubBookDates(null, formData);
      if (result?.error) setError(result.error);
      else {
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <Modal title="Editar fechas" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {book.title}
          </div>
          {book.author && (
            <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>{book.author}</div>
          )}
        </div>

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
