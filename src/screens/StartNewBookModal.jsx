'use client';

import { useActionState } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { startNewClubBook } from '@/app/actions/clubs';

const initialState = { error: null };

// Arranca un libro nuevo para el club — mismos tres campos que "Crear
// club" (OnboardingScreen.jsx): título, autor, cantidad de capítulos.
// Siempre pasa a ser el PRINCIPAL del club (el que se destaca en "Mis
// clubes de lectura" y el que abre "Tu camino" por default) — ya no hay
// elección entre eso o sumarlo "en paralelo": se pidió que el último
// libro agregado sea siempre el principal, sin excepción. El libro que
// deja de serlo NO se archiva ni se cierra (nada se cierra solo desde la
// migración 060) — sigue pudiendo comentarse y marcarse progreso igual
// que siempre, solo que ahora se ve desde "Otros libros del club".
// Al confirmar, la propia Server Action redirige a la pantalla del club —
// no hace falta cerrar el modal a mano.
export function StartNewBookModal({ clubId, currentBookTitle, onClose }) {
  const [state, formAction, pending] = useActionState(startNewClubBook, initialState);

  return (
    <Modal title="Empezar un libro nuevo" onClose={onClose}>
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="hidden" name="clubId" value={clubId} />

        {currentBookTitle && (
          <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            Este va a pasar a ser el libro principal del club. “{currentBookTitle}” sigue abierto — comentarios y
            progreso funcionan igual que siempre —, pero deja de ser el destacado y se ve desde “Otros libros del
            club”.
          </div>
        )}

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
