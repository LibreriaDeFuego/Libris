import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getActiveClubBook } from '@/lib/activeClub';
import { EncuadreScreen } from '@/screens/EncuadreScreen.jsx';

export const metadata = { title: 'Encuadre de portada · Libris' };

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
  if (!clubBook?.books?.cover_url) redirect(`/club/${clubId}/preferencias`);

  const [{ data: chapters }, { data: volumes }, { data: myProgress }] = await Promise.all([
    supabase.from('chapters').select('id, number, title, label, volume_id').eq('club_book_id', clubBook.id).order('number'),
    supabase.from('volumes').select('id, name, position').eq('club_book_id', clubBook.id).order('position'),
    supabase
      .from('reading_progress')
      .select('chapter_id, percent, reaction, current_page, total_pages')
      .eq('club_book_id', clubBook.id)
      .eq('profile_id', user.id)
      .maybeSingle(),
  ]);

  return (
    <EncuadreScreen
      club={club}
      clubs={clubs}
      book={clubBook.books}
      chapters={chapters ?? []}
      volumes={volumes ?? []}
      myProgress={myProgress ?? null}
    />
  );
}
