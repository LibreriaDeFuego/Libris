import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getActiveClubBook, getClubMembers } from '@/lib/activeClub';
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

  // A quién ya sigue el usuario — una sola consulta para todos los clubes,
  // en vez de una por integrante, para saber qué botón mostrar en la lista
  // de integrantes de cada tarjeta.
  const { data: followRows } = await supabase.from('follows').select('followed_id').eq('follower_id', user.id);
  const followingSet = new Set((followRows ?? []).map((f) => f.followed_id));

  // Un héroe chico por club (portada + título/autor + % y barra) en vez de
  // una fila angosta — ver README. Cada uno con su propio progreso, no solo
  // el del club activo (esa noción ya no existe: cada tarjeta es su propio
  // club, y tocarla entra directo a "Progreso y Actividad").
  const enrichedClubs = await Promise.all(
    clubs.map(async (club) => {
      const [clubBook, members] = await Promise.all([
        getActiveClubBook(supabase, club.id),
        getClubMembers(supabase, club.id),
      ]);
      const membersWithFollow = members.map((m) => ({ ...m, isFollowing: followingSet.has(m.profileId) }));

      if (!clubBook) return { ...club, book: null, members: membersWithFollow };

      const { chapters, volumes, myProgress } = await getClubProgressSummary(supabase, { clubBookId: clubBook.id, userId: user.id });
      const percent = myProgress?.percent ?? 0;
      const { progressMeta, unit, pips } = computeHeroProgress({ chapters, volumes, myProgress, percent });

      return { ...club, book: clubBook.books, percent, progressMeta, unit, pips, members: membersWithFollow };
    })
  );

  return <MisClubesScreen clubs={enrichedClubs} currentUserId={user.id} />;
}
