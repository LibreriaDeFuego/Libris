'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateClubPreferences, leaveClub } from '@/app/actions/clubs';
import { Button } from '@/design-system/components/core/Button.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { CoverUploader } from '@/components/CoverUploader';

const initialState = { error: null };

function Section({ title, description, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 'var(--lh-snug)' }}>
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// Opción de visibilidad con su explicación, para que no haya que adivinar qué
// hace: cada tarjeta dice exactamente qué ven los demás.
function VisibilityOption({ value, current, onChange, icon, title, description }) {
  const selected = current === value;
  return (
    <label
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer',
        background: selected ? 'var(--accent-50)' : 'var(--surface-card)',
        border: `1px solid ${selected ? 'var(--accent-500)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-md)', padding: 12,
      }}
    >
      <input
        type="radio"
        name="visibility"
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        style={{ marginTop: 3 }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
          <Icon name={icon} size={14} />
          {title}
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 3, lineHeight: 'var(--lh-snug)' }}>
          {description}
        </div>
      </div>
    </label>
  );
}

export function PreferenciasScreen({ club, book, isOwner, memberCount }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateClubPreferences, initialState);
  const [visibility, setVisibility] = useState(club.is_private ? 'privado' : 'publico');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leavePending, startLeave] = useTransition();

  function handleLeave() {
    const formData = new FormData();
    formData.set('clubId', club.id);
    startLeave(() => leaveClub(formData));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => router.push('/')}>
          <Icon name="arrow-left" size={18} />
        </IconButton>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Preferencias
        </div>
      </div>

      {isOwner ? (
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <input type="hidden" name="clubId" value={club.id} />
          {book && <input type="hidden" name="bookId" value={book.id} />}

          <Section title="El club">
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Nombre</div>
              <Input name="clubName" defaultValue={club.name} required />
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
              {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}
            </div>
          </Section>

          <Section
            title="Quién ve este club"
            description="Otros clubes que leen el mismo libro ven que hay un club leyéndolo. Esto decide si además ven cómo se llama."
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <VisibilityOption
                value="privado"
                current={visibility}
                onChange={setVisibility}
                icon="eye-off"
                title="Privado"
                description="Los otros clubes ven “Un club también está leyendo este libro”, sin el nombre. Nadie de afuera sabe que este club existe."
              />
              <VisibilityOption
                value="publico"
                current={visibility}
                onChange={setVisibility}
                icon="eye"
                title="Público"
                description="Los otros clubes ven el nombre del club y cuántos miembros tiene. Los comentarios y el progreso siguen siendo privados."
              />
            </div>
          </Section>

          {book && (
            <Section title="El libro en curso">
              <div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Título</div>
                <Input name="bookTitle" defaultValue={book.title} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Autor</div>
                <Input name="bookAuthor" defaultValue={book.author} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44, height: 62, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                    background: book.cover_url ? `center/cover no-repeat url(${book.cover_url})` : 'var(--accent-500)',
                  }}
                />
                <CoverUploader bookId={book.id} hasCover={Boolean(book.cover_url)} tone="light" />
              </div>
            </Section>
          )}

          {state?.error && (
            <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
              {state.error}
            </div>
          )}
          {state?.saved && !state?.error && (
            <div style={{ color: 'var(--success)', fontSize: 'var(--fs-xs)', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
              Cambios guardados.
            </div>
          )}

          <Button variant="primary" size="lg" type="submit" disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      ) : (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)' }}>
          Solo quien creó <strong>{club.name}</strong> puede cambiar el nombre, la visibilidad y el libro en curso.
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Salir del club
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-snug)' }}>
          Dejás de ver el club y su actividad. Tus comentarios y tu progreso quedan guardados por si volvés a entrar con el link de invitación.
        </div>
        {confirmLeave ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="md" onClick={() => setConfirmLeave(false)} type="button">Cancelar</Button>
            <Button variant="primary" size="md" onClick={handleLeave} disabled={leavePending} type="button">
              {leavePending ? 'Saliendo…' : 'Sí, salir del club'}
            </Button>
          </div>
        ) : (
          <div>
            <Button variant="secondary" size="md" onClick={() => setConfirmLeave(true)} type="button">
              <Icon name="log-out" size={15} />
              Salir de {club.name}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
