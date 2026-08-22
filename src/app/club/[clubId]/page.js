import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getActiveClubBook } from '@/lib/activeClub';
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
    return <ClubScreen {...baseProps} book={null} clubBookId={null} chapters={[]} volumes={[]} myProgress={null} previews={[]} otherClubsCount={0} />;
  }

  const [{ data: chapters }, { data: volumes }, { data: myProgress }, { data: comments }, { data: otherClubsCount }] = await Promise.all([
    supabase.from('chapters').select('id, number, title, label, volume_id').eq('club_book_id', clubBook.id).order('number'),
    supabase.from('volumes').select('id, name, position').eq('club_book_id', clubBook.id).order('position'),
    supabase
      .from('reading_progress')
      .select('chapter_id, percent, reaction, current_page, total_pages')
      .eq('club_book_id', clubBook.id)
      .eq('profile_id', user.id)
      .maybeSingle(),
    supabase
      .from('comments')
      .select('id, kind, body, is_spoiler, created_at, profiles(display_name)')
      .eq('club_book_id', clubBook.id)
      .order('created_at', { ascending: false })
      .limit(3),
    // RLS solo expone los clubes propios; el conteo de "otros clubes leyendo
    // lo mismo" viene de una función security definer.
    supabase.rpc('other_clubs_reading_count', {
      target_book_id: clubBook.book_id,
      exclude_club_id: clubId,
    }),
  ]);

  return (
    <ClubScreen
      {...baseProps}
      book={clubBook.books}
      clubBookId={clubBook.id}
      chapters={chapters ?? []}
      volumes={volumes ?? []}
      myProgress={myProgress ?? null}
      previews={comments ?? []}
      otherClubsCount={Number(otherClubsCount ?? 0)}
    />
  );
}
