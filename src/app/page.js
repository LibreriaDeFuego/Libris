import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getActiveClubBook } from '@/lib/activeClub';
import { getClubProgressSummary } from '@/lib/clubDetail';
import { computeHeroProgress } from '@/lib/heroProgress';
import { OnboardingScreen } from '@/screens/OnboardingScreen.jsx';
import { MisClubesScreen } from '@/screens/MisClubesScreen.jsx';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clubs = await getMyClubs(supabase, user.id);
  if (clubs.length === 0) return <OnboardingScreen />;

  // Un héroe chico por club (portada + título/autor + % y barra) en vez de
  // una fila angosta — ver README. Cada uno con su propio progreso, no solo
  // el del club activo (esa noción ya no existe: cada tarjeta es su propio
  // club, y tocarla entra directo a "Progreso y Actividad").
  const enrichedClubs = await Promise.all(
    clubs.map(async (club) => {
      const clubBook = await getActiveClubBook(supabase, club.id);
      if (!clubBook) return { ...club, book: null };

      const { chapters, volumes, myProgress } = await getClubProgressSummary(supabase, { clubBookId: clubBook.id, userId: user.id });
      const percent = myProgress?.percent ?? 0;
      const { progressMeta, unit, pips } = computeHeroProgress({ chapters, volumes, myProgress, percent });

      return { ...club, book: clubBook.books, percent, progressMeta, unit, pips };
    })
  );

  return <MisClubesScreen clubs={enrichedClubs} />;
}
