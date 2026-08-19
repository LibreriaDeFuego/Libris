import { redirect } from 'next/navigation';

// Toda acción de servidor que escriba datos pasa por acá: si no hay sesión,
// corta y manda al login en vez de fallar contra RLS con un error críptico.
export async function requireUser(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}
