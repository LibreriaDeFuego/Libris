import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyActiveClubBook } from '@/lib/getMyActiveClubBook';
import { ComentariosScreen } from '@/screens/ComentariosScreen.jsx';

export const metadata = { title: 'Comentarios · Libris' };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clubBook = await getMyActiveClubBook(supabase, user.id);
  if (!clubBook) redirect('/');

  const { data: comments } = await supabase
    .from('comments')
    .select('id, kind, body, is_spoiler, created_at, profile_id, profiles(display_name)')
    .eq('club_book_id', clubBook.id)
    .order('created_at', { ascending: false });

  return <ComentariosScreen clubBookId={clubBook.id} comments={comments ?? []} currentUserId={user.id} />;
}
