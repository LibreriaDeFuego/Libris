import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getActiveClubBook } from '@/lib/activeClub';
import { getClubHeroExtras } from '@/lib/clubDetail';
import { ClubScreen } from '@/screens/ClubScreen.jsx';

export default async function Page({ params }) {
  const { clubId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clubs = await getMyClubs(supabase, user.id);
  const club = clubs.find((c) => c.id === clubId);
  if (!club) notFound(); // no es miembro (o el club no existe): no mostramos nada de RLS de todos modos

  const isAdmin = club.role === 'admin';

  const [{ count: memberCount }, clubBook] = await Promise.all([
    supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', clubId),
    getActiveClubBook(supabase, clubId),
  ]);

  const baseProps = {
    club: { ...club, memberCount: memberCount ?? 0 },
    isAdmin,
  };

  if (!clubBook) {
    return (
      <ClubScreen
        {...baseProps}
        pendingRequestCount={0}
        book={null}
        clubBookId={null}
        chapters={[]}
        volumes={[]}
        myProgress={null}
        myReview={null}
        otherClubsCount={0}
      />
    );
  }

  const [heroExtras, { data: otherClubsCount }, { data: members }, { data: memberProgress }] = await Promise.all([
    // Chapters, volumes, mi progreso, mi reseña, actividad reciente y
    // solicitudes pendientes — ver src/lib/clubDetail.js.
    getClubHeroExtras(supabase, { clubId, clubBookId: clubBook.id, userId: user.id, isAdmin }),
    // RLS solo expone los clubes propios; el conteo de "otros clubes leyendo
    // lo mismo" viene de una función security definer.
    supabase.rpc('other_clubs_reading_count', {
      target_book_id: clubBook.book_id,
      exclude_club_id: clubId,
    }),
    // "Quiénes están leyendo": todos los miembros del club — mismo alcance
    // que ya tiene la lista de Preferencias, RLS ya lo permite.
    supabase.from('club_members').select('profile_id, profiles(display_name, avatar_url)').eq('club_id', clubId).order('joined_at'),
    // El progreso de todos (no solo el propio) para este libro, para saber
    // quién va por qué capítulo. reading_progress no tiene FK a club_members,
    // así que se trae aparte y se cruza acá abajo por profile_id.
    supabase.from('reading_progress').select('profile_id, chapter_id').eq('club_book_id', clubBook.id),
  ]);

  const progressByProfile = new Map((memberProgress ?? []).map((p) => [p.profile_id, p.chapter_id]));
  const membersWithProgress = (members ?? []).map((m) => ({
    profileId: m.profile_id,
    displayName: m.profiles?.display_name ?? 'Alguien',
    avatarUrl: m.profiles?.avatar_url ?? null,
    chapterId: progressByProfile.get(m.profile_id) ?? null,
  }));

  return (
    <ClubScreen
      {...baseProps}
      pendingRequestCount={heroExtras.pendingRequestCount}
      book={clubBook.books}
      clubBookId={clubBook.id}
      chapters={heroExtras.chapters}
      volumes={heroExtras.volumes}
      myProgress={heroExtras.myProgress}
      myReview={heroExtras.myReview}
      members={membersWithProgress}
      activity={heroExtras.activity}
      currentUserId={user.id}
      otherClubsCount={Number(otherClubsCount ?? 0)}
    />
  );
}
