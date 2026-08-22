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

  const enrichedClubs = await Promise.all(
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
  );

  return <MisClubesScreen clubs={enrichedClubs} />;
}
