'use client';

import { useActionState } from 'react';
import { signInWithGoogle } from '@/app/login/actions';

const initialState = { error: null };

// Logo oficial de Google, inline para no depender de un CDN externo.
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

export function GoogleSignInButton({ next = '/' }) {
  const [state, action, pending] = useActionState(signInWithGoogle, initialState);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-tertiary)', fontSize: 'var(--fs-2xs)' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        o
        <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      </div>

      <form action={action}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          disabled={pending}
          style={{
            width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '13px 20px', borderRadius: 'var(--radius-pill)',
            background: 'var(--surface-card)', color: 'var(--text-primary)',
            border: '1px solid var(--border-default)', cursor: pending ? 'default' : 'pointer',
            fontFamily: 'var(--font-body)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)',
            opacity: pending ? 0.6 : 1,
          }}
        >
          <GoogleMark />
          {pending ? 'Abriendo Google...' : 'Continuar con Google'}
        </button>
      </form>

      {state?.error && (
        <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-xs)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
          {state.error}
        </div>
      )}
    </div>
  );
}
