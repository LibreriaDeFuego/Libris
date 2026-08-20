import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getActiveClubBook } from '@/lib/activeClub';
import { GestionCapitulosScreen } from '@/screens/GestionCapitulosScreen.jsx';

export const metadata = { title: 'Capítulos · Libris' };

export default async function Page({ params }) {
  const { clubId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clubs = await getMyClubs(supabase, user.id);
  const club = clubs.find((c) => c.id === clubId);
  if (!club) notFound();
  if (club.role !== 'admin') redirect(`/club/${clubId}`);

  const clubBook = await getActiveClubBook(supabase, clubId);
  if (!clubBook) redirect(`/club/${clubId}`);

  const [{ data: chapters }, { data: volumes }] = await Promise.all([
    supabase.from('chapters').select('id, number, title, label, volume_id').eq('club_book_id', clubBook.id).order('number'),
    supabase.from('volumes').select('id, name, position').eq('club_book_id', clubBook.id).order('position'),
  ]);

  return (
    <GestionCapitulosScreen
      club={club}
      book={clubBook.books}
      clubBookId={clubBook.id}
      chapters={chapters ?? []}
      volumes={volumes ?? []}
    />
  );
}
