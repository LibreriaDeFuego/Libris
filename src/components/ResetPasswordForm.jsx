'use client';

import { useActionState } from 'react';
import { updatePassword } from '@/app/login/actions';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';

const initialState = { error: null };

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '48px 24px' }}>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático de /public, no una foto de contenido */}
        <img src="/logo-libris.png" alt="Libris" style={{ height: 40, width: 'auto', display: 'block' }} />
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: 10 }}>
          Elige una contraseña nueva
        </div>
      </div>

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Contraseña nueva</div>
          <Input name="password" type="password" placeholder="••••••••" required minLength={6} />
        </div>

        {state?.error && (
          <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
            {state.error}
          </div>
        )}

        <Button variant="primary" size="lg" disabled={pending} type="submit">
          {pending ? 'Guardando...' : 'Guardar contraseña'}
        </Button>
      </form>
    </div>
  );
}
