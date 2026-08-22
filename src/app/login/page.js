import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/LoginForm';
import { safeNext } from '@/lib/safeNext';
import { getEnabledProviders } from '@/lib/authProviders';

// Cualquier link que apunte a una página que requiere sesión (perfil, club,
// invitación) redirige acá si quien lo abre no está logueado — y esta es la
// metadata que terminan mostrando WhatsApp/etc. como vista previa del link
// que se compartió, así que el texto está pensado para eso.
export const metadata = {
  title: 'Únete a Libris',
  description: 'Entra o crea una cuenta para ver el perfil que te compartieron.',
};

export default async function LoginPage({ searchParams }) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(safeNext(next));

  const providers = await getEnabledProviders();

  return <LoginForm next={safeNext(next)} googleEnabled={providers.google === true} />;
}
