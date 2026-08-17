'use client';

import { useActionState, useState } from 'react';
import { createClub, joinClub } from '@/app/actions/clubs';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { Tabs } from '@/design-system/components/navigation/Tabs.jsx';

const initialState = { error: null };

export function OnboardingScreen() {
  const [mode, setMode] = useState('Crear club');
  const [createState, createAction, createPending] = useActionState(createClub, initialState);
  const [joinState, joinAction, joinPending] = useActionState(joinClub, initialState);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '32px 18px' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Todavía no estás en ningún club
        </div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
          Armá uno nuevo o unite a uno existente con su ID.
        </div>
      </div>

      <Tabs items={['Crear club', 'Unirme a un club']} active={mode} onChange={setMode} />

      {mode === 'Crear club' ? (
        <form action={createAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Nombre del club</div>
            <Input name="clubName" placeholder="ej. Letras en Vela" required />
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Primer libro — título</div>
            <Input name="bookTitle" placeholder="ej. Rayuela" required />
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Autor</div>
            <Input name="bookAuthor" placeholder="ej. Julio Cortázar" required />
          </div>
          {createState?.error && (
            <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
              {createState.error}
            </div>
          )}
          <Button variant="primary" size="lg" type="submit" disabled={createPending}>
            {createPending ? 'Creando...' : 'Crear club'}
          </Button>
        </form>
      ) : (
        <form action={joinAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>ID del club</div>
            <Input name="clubId" placeholder="Pegá el ID que te compartieron" required />
          </div>
          {joinState?.error && (
            <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
              {joinState.error}
            </div>
          )}
          <Button variant="primary" size="lg" type="submit" disabled={joinPending}>
            {joinPending ? 'Uniéndote...' : 'Unirme'}
          </Button>
        </form>
      )}
    </div>
  );
}
