import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyActiveClubBook } from '@/lib/getMyActiveClubBook';
import { NovedadesScreen } from '@/screens/NovedadesScreen.jsx';

export const metadata = { title: 'Novedades · Libris' };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clubBook = await getMyActiveClubBook(supabase, user.id);
  if (!clubBook) return <NovedadesScreen events={[]} />;

  const [{ data: comments }, { data: progress }, { data: otherClubBooks }] = await Promise.all([
    supabase
      .from('comments')
      .select('id, created_at, profiles(display_name)')
      .eq('club_book_id', clubBook.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('reading_progress')
      .select('id, updated_at, profiles(display_name), chapters(label)')
      .eq('club_book_id', clubBook.id)
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('club_books')
      .select('id, started_at')
      .eq('book_id', clubBook.book_id)
      .eq('is_active', true)
      .neq('club_id', clubBook.club_id)
      .order('started_at', { ascending: false })
      .limit(10),
  ]);

  const bookTitle = clubBook.books?.title ?? 'el libro';

  const misClubesEvents = [
    ...(comments ?? []).map((c) => ({
      id: `comment-${c.id}`,
      icon: 'message-circle',
      color: 'var(--accent-500)',
      title: `${c.profiles?.display_name ?? 'Alguien'} comentó en ${bookTitle}`,
      time: c.created_at,
      club: 'Mis clubes',
    })),
    ...(progress ?? []).map((p) => ({
      id: `progress-${p.id}`,
      icon: 'book-open',
      color: 'var(--accent-500)',
      title: `${p.profiles?.display_name ?? 'Alguien'} actualizó su progreso a ${p.chapters?.label ?? 'un nuevo capítulo'}`,
      time: p.updated_at,
      club: 'Mis clubes',
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time));

  const otrosClubesEvents = (otherClubBooks ?? []).map((cb) => ({
    id: `other-club-${cb.id}`,
    icon: 'users',
    color: 'var(--gold-500)',
    title: `Otro club también está leyendo ${bookTitle}`,
    time: cb.started_at,
    club: 'Otros clubes',
  }));

  return <NovedadesScreen events={[...misClubesEvents, ...otrosClubesEvents]} />;
}
