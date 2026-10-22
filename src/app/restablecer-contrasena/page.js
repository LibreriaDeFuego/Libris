import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';

export const metadata = { title: 'Nueva contraseña · Libris' };

// Se llega acá desde /auth/callback, después de canjear el link que manda
// "Olvidé mi contraseña" (requestPasswordReset) — ese canje ya deja una
// sesión de recuperación armada. Sin sesión (link viejo, ya usado, o
// alguien entró a esta URL a mano) no hay nada que mostrar salvo cómo
// pedir uno nuevo.
export default async function RestablecerContrasenaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '48px 24px' }}>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', lineHeight: 'var(--lh-normal)' }}>
          Este link no es válido o ya venció.
        </div>
        <Link href="/recuperar-contrasena" style={{ color: 'var(--text-link)', fontSize: 'var(--fs-sm)' }}>
          Pedir uno nuevo
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm />;
}
