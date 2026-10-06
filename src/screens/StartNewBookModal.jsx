'use client';

import { useActionState, useState } from 'react';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Chip } from '@/design-system/components/core/Chip.jsx';
import { startNewClubBook } from '@/app/actions/clubs';

const initialState = { error: null };

// Arranca un libro nuevo para el club — mismos tres campos que "Crear
// club" (OnboardingScreen.jsx): título, autor, cantidad de capítulos, más
// una elección que no tiene esa pantalla: si este libro pasa a ser el
// PRINCIPAL del club (el libro en curso de Preferencias/"Mis clubes de
// lectura") o si se suma EN PARALELO, sin tocar el principal de siempre
// (migración 060 — antes de esto, el libro anterior quedaba archivado
// siempre; ahora nada se cierra solo, es una elección aparte).
// Al confirmar, la propia Server Action redirige a la pantalla del club
// (al principal, o directo al libro nuevo si quedó en paralelo) — no hace
// falta cerrar el modal a mano.
export function StartNewBookModal({ clubId, currentBookTitle, onClose }) {
  const [state, formAction, pending] = useActionState(startNewClubBook, initialState);
  const [makesPrincipal, setMakesPrincipal] = useState(true);

  return (
    <Modal title="Empezar un libro nuevo" onClose={onClose}>
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="makesPrincipal" value={makesPrincipal ? 'true' : 'false'} />

        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
            ¿Cómo se suma este libro?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Chip selected={makesPrincipal} onClick={() => setMakesPrincipal(true)}>Pasa a ser el principal</Chip>
            <Chip selected={!makesPrincipal} onClick={() => setMakesPrincipal(false)}>Se lee en paralelo</Chip>
          </div>
          <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 6, lineHeight: 1.4 }}>
            {makesPrincipal
              ? (currentBookTitle
                ? `"${currentBookTitle}" sigue abierto — comentarios y progreso funcionan igual que siempre —, pero deja de ser el libro destacado del club.`
                : 'Este va a ser el libro que se destaca del club.')
              : 'El libro principal del club no cambia — este se suma como una lectura más, con su propio camino y sus propios comentarios.'}
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
