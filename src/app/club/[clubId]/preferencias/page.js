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

  const isAdmin = club.role === 'admin';

  const [{ data: members }, clubBook] = await Promise.all([
    supabase
      .from('club_members')
      .select('profile_id, role, joined_at, profiles(display_name)')
      .eq('club_id', clubId)
      .order('joined_at'),
    getActiveClubBook(supabase, clubId),
  ]);

  return (
    <PreferenciasScreen
      club={club}
      book={clubBook?.books ?? null}
      isAdmin={isAdmin}
      currentUserId={user.id}
      members={members ?? []}
    />
  );
}
