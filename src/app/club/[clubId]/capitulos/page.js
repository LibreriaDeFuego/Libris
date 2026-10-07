import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getPrincipalClubBook } from '@/lib/activeClub';
import { GestionCapitulosScreen } from '@/screens/GestionCapitulosScreen.jsx';

export const metadata = { title: 'Capítulos · Libris' };

export default async function Page({ params, searchParams }) {
  const { clubId } = await params;
  const { libro } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clubs = await getMyClubs(supabase, user.id);
  const club = clubs.find((c) => c.id === clubId);
  if (!club) notFound();
  if (club.role !== 'admin') redirect(`/club/${clubId}`);

  // "?libro=" (migración 060) — gestionar los capítulos de un libro en
  // paralelo, no solo el principal del club; sin el parámetro, se sigue
  // administrando el principal, como siempre.
  const clubBook = libro
    ? (await supabase.from('club_books').select('id, book_id, books(id, title, author, cover_url)').eq('id', libro).eq('club_id', clubId).maybeSingle()).data
    : await getPrincipalClubBook(supabase, clubId);
  if (!clubBook) redirect(`/club/${clubId}`);

  const [{ data: chapters }, { data: volumes }, { data: questions }] = await Promise.all([
    supabase.from('chapters').select('id, number, title, label, volume_id').eq('club_book_id', clubBook.id).order('number'),
    supabase.from('volumes').select('id, name, position').eq('club_book_id', clubBook.id).order('position'),
    supabase.from('chapter_questions').select('id, chapter_id, kind, prompt, options, correct_option_index, created_by').eq('club_book_id', clubBook.id),
  ]);

  return (
    <GestionCapitulosScreen
      club={club}
      book={clubBook.books}
      clubBookId={clubBook.id}
      chapters={chapters ?? []}
      volumes={volumes ?? []}
      questions={questions ?? []}
      currentUserId={user.id}
    />
  );
}
