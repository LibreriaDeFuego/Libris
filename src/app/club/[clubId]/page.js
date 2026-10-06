import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getPrincipalClubBook } from '@/lib/activeClub';
import { getClubHeroExtras, getChapterCommentCounts, getChaptersWithQuestions, getClubOtherBooks } from '@/lib/clubDetail';
import { ClubScreen } from '@/screens/ClubScreen.jsx';

export default async function Page({ params, searchParams }) {
  const { clubId } = await params;
  const { libro } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clubs = await getMyClubs(supabase, user.id);
  const club = clubs.find((c) => c.id === clubId);
  if (!club) notFound(); // no es miembro (o el club no existe): no mostramos nada de RLS de todos modos

  const isAdmin = club.role === 'admin';

  // "?libro=" (migración 060) — ver un libro en paralelo del club, no solo
  // el principal; así se llega desde "Otros libros del club" o desde el
  // redirect de startNewClubBook cuando el libro nuevo NO pasa a ser el
  // principal. Un libro ARCHIVADO acá redirige al club a secas: esa vista
  // es de solo lectura (PastChapterPath, migración 058), no "Tu camino" de
  // verdad — llegar con un link viejo a un libro que mientras tanto se
  // archivó no debería dejar marcar progreso ni comentar como si nada.
  const [{ count: memberCount }, clubBook] = await Promise.all([
    supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', clubId),
    libro
      ? supabase
          .from('club_books')
          .select('id, club_id, book_id, is_active, books(id, title, author, cover_url)')
          .eq('id', libro)
          .eq('club_id', clubId)
          .maybeSingle()
          .then(({ data }) => data)
      : getPrincipalClubBook(supabase, clubId),
  ]);
  if (libro && (!clubBook || !clubBook.is_active)) redirect(`/club/${clubId}`);

  const baseProps = {
    club: { ...club, memberCount: memberCount ?? 0 },
    isAdmin,
  };

  if (!clubBook) {
    // Sin libro principal (club recién creado, o un estado raro) — igual
    // puede tener libros en paralelo/archivados, por eso otherBooks se
    // pide siempre, pase lo que pase acá arriba.
    const otherBooks = await getClubOtherBooks(supabase, clubId, user.id, null);
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
        pendingQuestionChapterIds={[]}
        answeredQuestionChapterIds={[]}
        otherBooks={otherBooks}
      />
    );
  }

  const [heroExtras, commentCounts, questionsByChapter, otherBooks] = await Promise.all([
    // Chapters, volumes, mi progreso, mi reseña, actividad reciente y
    // solicitudes pendientes — ver src/lib/clubDetail.js.
    getClubHeroExtras(supabase, { clubId, clubBookId: clubBook.id, userId: user.id, isAdmin }),
    // Cuántos comentarios tiene cada capítulo, para la pastilla de
    // "Comentarios" en Tu camino.
    getChapterCommentCounts(supabase, clubBook.id),
    // Qué capítulos tienen alguna pregunta sin responder (o ya respondida
    // del todo), para el distintivo del nodo en Tu camino (migraciones
    // 053/054).
    getChaptersWithQuestions(supabase, clubBook.id, user.id),
    // Los demás libros del club — en paralelo y/o archivados (migración
    // 060) — para "Otros libros del club", deslizando a la izquierda.
    getClubOtherBooks(supabase, clubId, user.id, clubBook.id),
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
      pendingQuestionChapterIds={questionsByChapter.pending}
      answeredQuestionChapterIds={questionsByChapter.answered}
      otherBooks={otherBooks}
    />
  );
}
