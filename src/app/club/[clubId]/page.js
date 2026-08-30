import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getActiveClubBook } from '@/lib/activeClub';
import { buildClubActivity } from '@/lib/clubActivity';
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

  const [{ count: memberCount }, clubBook, { count: pendingRequestCount }] = await Promise.all([
    supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', clubId),
    getActiveClubBook(supabase, clubId),
    isAdmin
      ? supabase.from('club_join_requests').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'pending')
      : Promise.resolve({ count: 0 }),
  ]);

  const baseProps = {
    club: { ...club, memberCount: memberCount ?? 0 },
    clubs,
    isAdmin,
    pendingRequestCount: pendingRequestCount ?? 0,
  };

  if (!clubBook) {
    return <ClubScreen {...baseProps} book={null} clubBookId={null} chapters={[]} volumes={[]} myProgress={null} myReview={null} hasActivity={false} otherClubsCount={0} />;
  }

  const [
    { data: chapters },
    { data: volumes },
    { data: myProgress },
    { data: myReview },
    { count: commentCount },
    { data: otherClubsCount },
    { data: members },
    { data: memberProgress },
    { data: recentComments },
    { data: recentReviews },
  ] = await Promise.all([
    supabase.from('chapters').select('id, number, title, label, volume_id').eq('club_book_id', clubBook.id).order('number'),
    supabase.from('volumes').select('id, name, position').eq('club_book_id', clubBook.id).order('position'),
    supabase
      .from('reading_progress')
      .select('chapter_id, percent, reaction, current_page, total_pages, streak_count')
      .eq('club_book_id', clubBook.id)
      .eq('profile_id', user.id)
      .maybeSingle(),
    // La reseña que esta persona ya haya publicado para este libro (si hay),
    // para precargar el formulario al editarla en vez de duplicarla.
    supabase
      .from('comments')
      .select('id, title, body, is_spoiler')
      .eq('club_book_id', clubBook.id)
      .eq('profile_id', user.id)
      .eq('kind', 'review')
      .maybeSingle(),
    // Ya no se muestra la lista de comentarios acá ("Impresiones recientes"
    // se sacó de esta pantalla) — solo un conteo, liviano, para el punto de
    // actividad del selector de club (ClubSwitcher).
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('club_book_id', clubBook.id),
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
    // "Actividad del club": los comentarios más recientes (sin respuestas,
    // sin reseñas) para agrupar por capítulo — ver src/lib/clubActivity.js.
    supabase
      .from('comments')
      .select('id, chapter_id, created_at, profile_id, profiles(display_name, avatar_url)')
      .eq('club_book_id', clubBook.id)
      .is('parent_comment_id', null)
      .neq('kind', 'review')
      .order('created_at', { ascending: false })
      .limit(24),
    supabase
      .from('comments')
      .select('id, created_at, profile_id, profiles(display_name, avatar_url)')
      .eq('club_book_id', clubBook.id)
      .eq('kind', 'review')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const progressByProfile = new Map((memberProgress ?? []).map((p) => [p.profile_id, p.chapter_id]));
  const membersWithProgress = (members ?? []).map((m) => ({
    profileId: m.profile_id,
    displayName: m.profiles?.display_name ?? 'Alguien',
    avatarUrl: m.profiles?.avatar_url ?? null,
    chapterId: progressByProfile.get(m.profile_id) ?? null,
  }));

  const chaptersById = new Map((chapters ?? []).map((c) => [c.id, c]));
  const activity = buildClubActivity({ comments: recentComments, reviews: recentReviews, chaptersById });

  return (
    <ClubScreen
      {...baseProps}
      book={clubBook.books}
      clubBookId={clubBook.id}
      chapters={chapters ?? []}
      volumes={volumes ?? []}
      myProgress={myProgress ?? null}
      myReview={myReview ?? null}
      members={membersWithProgress}
      activity={activity}
      currentUserId={user.id}
      hasActivity={(commentCount ?? 0) > 0}
      otherClubsCount={Number(otherClubsCount ?? 0)}
    />
  );
}
