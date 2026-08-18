'use client';

import { useActionState, useState } from 'react';
import { signIn, signUp } from '@/app/login/actions';
import { Button } from '@/design-system/components/core/Button.jsx';
import { Input } from '@/design-system/components/forms/Input.jsx';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

const initialState = { error: null };

export function LoginForm({ next = '/', googleEnabled = false }) {
  const [mode, setMode] = useState('signIn'); // 'signIn' | 'signUp'
  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState);

  const action = mode === 'signIn' ? signInAction : signUpAction;
  const state = mode === 'signIn' ? signInState : signUpState;
  const pending = mode === 'signIn' ? signInPending : signUpPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '48px 24px' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Libris
        </div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
          {mode === 'signIn' ? 'Entrá a tu cuenta' : 'Creá tu cuenta'}
        </div>
      </div>

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="hidden" name="next" value={next} />
        {mode === 'signUp' && (
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Tu nombre</div>
            <Input name="displayName" placeholder="¿Cómo te llamamos?" required />
          </div>
        )}
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Email</div>
          <Input name="email" type="email" placeholder="vos@ejemplo.com" required />
        </div>
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Contraseña</div>
          <Input name="password" type="password" placeholder="••••••••" required minLength={6} />
        </div>

        {state?.error && (
          <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
            {state.error}
          </div>
        )}

        {state?.needsConfirmation && (
          <div style={{ color: 'var(--gold-700)', fontSize: 'var(--fs-xs)', background: 'var(--gold-100)', borderRadius: 'var(--radius-md)', padding: 10, lineHeight: 'var(--lh-snug)' }}>
            Te mandamos un mail para confirmar tu cuenta. Abrí el link y después entrá con tu email y contraseña.
          </div>
        )}

        <Button variant="primary" size="lg" disabled={pending} type="submit">
          {pending ? 'Un momento...' : mode === 'signIn' ? 'Entrar' : 'Crear cuenta'}
        </Button>
      </form>

      {googleEnabled && <GoogleSignInButton next={next} />}

      <button
        type="button"
        onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
        style={{ background: 'none', border: 'none', color: 'var(--text-link)', fontSize: 'var(--fs-sm)', cursor: 'pointer', padding: 0 }}
      >
        {mode === 'signIn' ? '¿No tenés cuenta? Creá una' : '¿Ya tenés cuenta? Entrá'}
      </button>
    </div>
  );
}
