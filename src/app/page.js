import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getActiveClubBook, getClubActivityPreview } from '@/lib/activeClub';
import { OnboardingScreen } from '@/screens/OnboardingScreen.jsx';
import { MisClubesScreen } from '@/screens/MisClubesScreen.jsx';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clubs = await getMyClubs(supabase, user.id);
  if (clubs.length === 0) return <OnboardingScreen />;

  const [enrichedClubs, { data: publicClubsPreview }] = await Promise.all([
    Promise.all(
      clubs.map(async (club) => {
        const [{ count: memberCount }, clubBook] = await Promise.all([
          supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', club.id),
          getActiveClubBook(supabase, club.id),
        ]);
        const activity = clubBook
          ? await getClubActivityPreview(supabase, clubBook.id, clubBook.books?.title ?? 'el libro')
          : null;
        return { ...club, memberCount: memberCount ?? 0, book: clubBook?.books ?? null, activity };
      })
    ),
    supabase.rpc('discover_public_clubs', { limit_count: 3 }),
  ]);

  const myClubIds = new Set(clubs.map((c) => c.id));
  const publicPreview = (publicClubsPreview ?? []).filter((c) => !myClubIds.has(c.id)).slice(0, 3);

  return <MisClubesScreen clubs={enrichedClubs} publicClubsPreview={publicPreview} />;
}
