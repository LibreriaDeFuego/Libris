'use client';

import { useActionState } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { startNewClubBook } from '@/app/actions/clubs';

const initialState = { error: null };

// Arranca un libro nuevo para el club — mismos tres campos que "Crear
// club" (OnboardingScreen.jsx): título, autor, cantidad de capítulos.
// A diferencia de esa pantalla, acá también archiva el libro en curso
// (startNewClubBook, clubs.js) — el aviso de arriba de todo es lo único
// que distingue a este formulario del de crear un club desde cero.
// Al confirmar, la propia Server Action redirige a la pantalla del club,
// ya con el libro nuevo activo — no hace falta cerrar el modal a mano.
export function StartNewBookModal({ clubId, currentBookTitle, onClose }) {
  const [state, formAction, pending] = useActionState(startNewClubBook, initialState);

  return (
    <Modal title="Empezar un libro nuevo" onClose={onClose}>
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="hidden" name="clubId" value={clubId} />

        <div
          style={{
            background: 'var(--gold-100)', border: '1px solid rgba(201,151,10,.35)', borderRadius: 'var(--radius-md)',
            padding: 12, display: 'flex', gap: 8, alignItems: 'flex-start',
          }}
        >
          <Icon name="triangle-alert" size={15} color="#8A5A00" />
          <div style={{ fontSize: 'var(--fs-xs)', color: '#5A3D00', lineHeight: 1.5 }}>
            {currentBookTitle ? `"${currentBookTitle}" queda archivado` : 'El libro actual queda archivado'} — los comentarios y el progreso de cada persona se guardan tal cual, pero dejan de verse en Tu camino apenas arranca el libro nuevo.
          </div>
        </div>

        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Título</div>
          <Input name="bookTitle" placeholder="ej. Rayuela" required />
        </div>
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Autor</div>
          <Input name="bookAuthor" placeholder="ej. Julio Cortázar" required />
        </div>
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>¿Cuántos capítulos tiene?</div>
          <Input name="chapterCount" type="number" min={1} max={300} defaultValue={12} />
          <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
            Después puedes agregar más desde “Gestionar capítulos”.
          </div>
        </div>

        {state?.error && (
          <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
            {state.error}
          </div>
        )}

        <Button variant="primary" size="lg" type="submit" disabled={pending}>
          {pending ? 'Empezando…' : 'Empezar este libro'}
        </Button>
      </form>
    </Modal>
  );
}
