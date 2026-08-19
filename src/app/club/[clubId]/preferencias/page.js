import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getActiveClubBook } from '@/lib/activeClub';
import { PreferenciasScreen } from '@/screens/PreferenciasScreen.jsx';

export const metadata = { title: 'Preferencias · Libris' };

export default async function Page({ params }) {
  const { clubId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clubs = await getMyClubs(supabase, user.id);
  const club = clubs.find((c) => c.id === clubId);
  if (!club) notFound();

  const [{ count: memberCount }, clubBook] = await Promise.all([
    supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', clubId),
    getActiveClubBook(supabase, clubId),
  ]);

  return (
    <PreferenciasScreen
      club={club}
      book={clubBook?.books ?? null}
      isOwner={club.created_by === user.id}
      memberCount={memberCount ?? 0}
    />
  );
}
