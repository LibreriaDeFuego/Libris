'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setUsername } from '@/app/actions/profile';
import { UsernameField } from '@/components/UsernameField';
import { Button } from '@/design-system/components/core/Button.jsx';

const initialState = { error: null };

// Pantalla obligatoria para cualquier cuenta que todavía no tiene un
// nombre de usuario (las creadas antes de que existiera este campo, o por
// Google) — la manda acá el middleware, y no deja seguir hasta guardar uno.
export function ElegirUsuarioScreen({ next }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [status, setStatus] = useState(null);
  const [state, action, pending] = useActionState(setUsername, initialState);

  useEffect(() => {
    if (state?.saved) router.push(next);
  }, [state, next, router]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '48px 24px' }}>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático de /public, no una foto de contenido */}
        <img src="/logo-libris.png" alt="Libris" style={{ height: 40, width: 'auto', display: 'block' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 16 }}>
          Elegí tu nombre de usuario
        </div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 'var(--lh-snug)' }}>
          Es nuevo en Libris: sirve para distinguirte de otras personas con un nombre parecido al tuyo en el buscador y en tu perfil. Se puede cambiar después desde &ldquo;Editar perfil&rdquo;.
        </div>
      </div>

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <UsernameField value={value} onChange={setValue} onStatusChange={setStatus} autoFocus />

        {state?.error && (
          <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
            {state.error}
          </div>
        )}

        <Button variant="primary" size="lg" type="submit" disabled={pending || status !== 'available'}>
          {pending ? 'Guardando…' : 'Continuar'}
        </Button>
      </form>
    </div>
  );
}
