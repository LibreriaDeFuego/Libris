import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveClub, getActiveClubBook } from '@/lib/activeClub';
import { PreferenciasScreen } from '@/screens/PreferenciasScreen.jsx';

export const metadata = { title: 'Preferencias · Libris' };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { active } = await getActiveClub(supabase, user.id);
  if (!active) redirect('/');

  const [{ count: memberCount }, clubBook] = await Promise.all([
    supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', active.id),
    getActiveClubBook(supabase, active.id),
  ]);

  return (
    <PreferenciasScreen
      club={active}
      book={clubBook?.books ?? null}
      isOwner={active.created_by === user.id}
      memberCount={memberCount ?? 0}
    />
  );
}
