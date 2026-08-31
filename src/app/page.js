import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveClub, getActiveClubBook, getClubActivityPreview } from '@/lib/activeClub';
import { getClubHeroExtras } from '@/lib/clubDetail';
import { OnboardingScreen } from '@/screens/OnboardingScreen.jsx';
import { MisClubesScreen } from '@/screens/MisClubesScreen.jsx';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { clubs, active } = await getActiveClub(supabase, user.id);
  if (clubs.length === 0) return <OnboardingScreen />;

  const [enrichedClubs, { data: publicClubs }] = await Promise.all([
    Promise.all(
      clubs.map(async (club) => {
        const [{ count: memberCount }, clubBook] = await Promise.all([
          supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', club.id),
          getActiveClubBook(supabase, club.id),
        ]);
        const activity = clubBook
          ? await getClubActivityPreview(supabase, clubBook.id, clubBook.books?.title ?? 'el libro')
          : null;
        return { ...club, memberCount: memberCount ?? 0, book: clubBook?.books ?? null, clubBookId: clubBook?.id ?? null, activity };
      })
    ),
    // Adelanto de Descubrir: un par de clubes públicos que todavía no son
    // los tuyos, mismo criterio (y misma función) que la pestaña Descubrir.
    supabase.rpc('discover_public_clubs', { limit_count: 20 }),
  ]);

  const myClubIds = new Set(clubs.map((c) => c.id));
  const discoverClubs = (publicClubs ?? []).filter((c) => !myClubIds.has(c.id)).slice(0, 2);

  // El héroe (+ "Tu camino" + "Actividad del club") vive acá arriba, para el
  // club activo — mismo componente y mismos datos que ya usaba /club/[clubId]
  // (que sigue existiendo como vista de un club puntual, ver README). Ya
  // tenemos el clubBook del club activo del loop de arriba; solo falta lo
  // que no pide la tarjeta de la lista (capítulos, mi progreso, actividad
  // completa).
  const activeEnriched = enrichedClubs.find((c) => c.id === active.id) ?? null;
  const isAdmin = active.role === 'admin';
  const heroExtras = activeEnriched?.book
    ? await getClubHeroExtras(supabase, { clubId: active.id, clubBookId: activeEnriched.clubBookId, userId: user.id, isAdmin })
    : null;

  const hero = activeEnriched?.book
    ? {
        club: active,
        clubs: enrichedClubs,
        book: activeEnriched.book,
        clubBookId: activeEnriched.clubBookId,
        isAdmin,
        pendingRequestCount: heroExtras.pendingRequestCount,
        hasActivity: heroExtras.hasActivity,
        chapters: heroExtras.chapters,
        volumes: heroExtras.volumes,
        myProgress: heroExtras.myProgress,
        myReview: heroExtras.myReview,
        activity: heroExtras.activity,
      }
    : null;

  return <MisClubesScreen clubs={enrichedClubs} discoverClubs={discoverClubs} hero={hero} />;
}
