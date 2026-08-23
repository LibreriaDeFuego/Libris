import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/requireUser';
import { safeNext } from '@/lib/safeNext';
import { ElegirUsuarioScreen } from '@/screens/ElegirUsuarioScreen.jsx';

export const metadata = { title: 'Elegí tu usuario · Libris' };

// A donde llega cualquier cuenta sin username (ver el middleware) —
// si por algún motivo entra acá teniendo uno ya, no tiene nada que hacer.
export default async function ElegirUsuarioPage({ searchParams }) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();
  if (profile?.username) redirect(safeNext(next));

  return <ElegirUsuarioScreen next={safeNext(next)} />;
}
