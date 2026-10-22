'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '@/app/login/actions';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';

const initialState = { error: null };

export function RecoverPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '48px 24px' }}>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático de /public, no una foto de contenido */}
        <img src="/logo-libris.png" alt="Libris" style={{ height: 40, width: 'auto', display: 'block' }} />
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: 10 }}>
          Recupera tu contraseña
        </div>
      </div>

      {state?.sent ? (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', lineHeight: 'var(--lh-normal)' }}>
          Si existe una cuenta con ese correo, te mandamos un link para elegir una contraseña nueva. Revisa tu bandeja de entrada (y spam).
        </div>
      ) : (
        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Email</div>
            <Input name="email" type="email" placeholder="tu@ejemplo.com" required />
          </div>

          {state?.error && (
            <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
              {state.error}
            </div>
          )}

          <Button variant="primary" size="lg" disabled={pending} type="submit">
            {pending ? 'Enviando...' : 'Mandar link'}
          </Button>
        </form>
      )}

      <Link href="/login" style={{ color: 'var(--text-link)', fontSize: 'var(--fs-sm)' }}>
        Volver a iniciar sesión
      </Link>
    </div>
  );
}
