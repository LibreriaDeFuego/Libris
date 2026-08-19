import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveClub, getActiveClubBook } from '@/lib/activeClub';
import { OnboardingScreen } from '@/screens/OnboardingScreen.jsx';
import { ClubScreen } from '@/screens/ClubScreen.jsx';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { clubs, active } = await getActiveClub(supabase, user.id);
  if (!active) return <OnboardingScreen />;

  const [{ count: memberCount }, clubBook] = await Promise.all([
    supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', active.id),
    getActiveClubBook(supabase, active.id),
  ]);

  const baseProps = {
    club: { ...active, memberCount: memberCount ?? 0 },
    clubs,
    isOwner: active.created_by === user.id,
  };

  if (!clubBook) {
    // Club sin libro activo (no debería pasar vía el onboarding actual, pero
    // cubrimos el caso para no romper la pantalla).
    return <ClubScreen {...baseProps} book={null} clubBookId={null} chapters={[]} myProgress={null} previews={[]} otherClubsCount={0} />;
  }

  const [{ data: chapters }, { data: myProgress }, { data: comments }, { data: otherClubsCount }] = await Promise.all([
    supabase.from('chapters').select('id, number, label').eq('club_book_id', clubBook.id).order('number'),
    supabase
      .from('reading_progress')
      .select('chapter_id, percent, reaction')
      .eq('club_book_id', clubBook.id)
      .eq('profile_id', user.id)
      .maybeSingle(),
    supabase
      .from('comments')
      .select('id, kind, body, is_spoiler, created_at, profiles(display_name)')
      .eq('club_book_id', clubBook.id)
      .order('created_at', { ascending: false })
      .limit(3),
    // RLS solo expone los clubes propios, así que el conteo de "otros clubes
    // leyendo lo mismo" tiene que venir de una función security definer.
    supabase.rpc('other_clubs_reading_count', {
      target_book_id: clubBook.book_id,
      exclude_club_id: active.id,
    }),
  ]);

  return (
    <ClubScreen
      {...baseProps}
      book={clubBook.books}
      clubBookId={clubBook.id}
      chapters={chapters ?? []}
      myProgress={myProgress ?? null}
      previews={comments ?? []}
      otherClubsCount={Number(otherClubsCount ?? 0)}
    />
  );
}
