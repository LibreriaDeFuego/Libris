import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getActiveClubBook } from '@/lib/activeClub';
import { getClubHeroExtras, getChapterCommentCounts } from '@/lib/clubDetail';
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
        commentCounts={{}}
        otherClubsCount={0}
      />
    );
  }

  const [heroExtras, { data: otherClubsCount }, commentCounts] = await Promise.all([
    // Chapters, volumes, mi progreso, mi reseña, actividad reciente y
    // solicitudes pendientes — ver src/lib/clubDetail.js.
    getClubHeroExtras(supabase, { clubId, clubBookId: clubBook.id, userId: user.id, isAdmin }),
    // RLS solo expone los clubes propios; el conteo de "otros clubes leyendo
    // lo mismo" viene de una función security definer.
    supabase.rpc('other_clubs_reading_count', {
      target_book_id: clubBook.book_id,
      exclude_club_id: clubId,
    }),
    // Cuántos comentarios tiene cada capítulo, para la pastilla de
    // "Comentarios" en Tu camino.
    getChapterCommentCounts(supabase, clubBook.id),
  ]);

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
      activity={heroExtras.activity}
      commentCounts={commentCounts}
      otherClubsCount={Number(otherClubsCount ?? 0)}
    />
  );
}
