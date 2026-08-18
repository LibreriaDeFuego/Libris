import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InviteScreen } from '@/screens/InviteScreen.jsx';

export const metadata = { title: 'Invitación · Libris' };

export default async function Page({ params }) {
  const { clubId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  // Sin sesión mandamos a login y volvemos acá después de entrar/registrarse.
  if (!user) redirect(`/login?next=/unirse/${clubId}`);

  const { data: existing } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('club_id', clubId)
    .eq('profile_id', user.id)
    .maybeSingle();
  if (existing) redirect('/');

  // RLS no deja leer el club a quien todavía no es miembro; esta función
  // (security definer, migración 004) expone solo lo justo para la invitación.
  const { data: info } = await supabase.rpc('club_invite_info', { target_club_id: clubId });
  const club = Array.isArray(info) ? info[0] : info;

  return <InviteScreen clubId={clubId} club={club ?? null} />;
}
