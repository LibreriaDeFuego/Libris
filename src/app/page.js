import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingScreen } from '@/screens/OnboardingScreen.jsx';
import { ClubScreen } from '@/screens/ClubScreen.jsx';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('profile_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return <OnboardingScreen />;

  const clubId = membership.club_id;

  const [{ data: club }, { count: memberCount }, { data: clubBook }] = await Promise.all([
    supabase.from('clubs').select('id, name, is_private, created_by').eq('id', clubId).single(),
    supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', clubId),
    supabase
      .from('club_books')
      .select('id, book_id, books(id, title, author, cover_url)')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (!clubBook) {
    // Club sin libro activo (no debería pasar vía el onboarding actual, pero
    // cubrimos el caso para no romper la pantalla).
    return (
      <ClubScreen
        club={{ ...club, memberCount }}
        book={null}
        clubBookId={null}
        chapters={[]}
        myProgress={null}
        previews={[]}
        otherClubsCount={0}
        isOwner={club?.created_by === user.id}
      />
    );
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
      exclude_club_id: clubId,
    }),
  ]);

  return (
    <ClubScreen
      club={{ ...club, memberCount }}
      book={clubBook.books}
      clubBookId={clubBook.id}
      chapters={chapters ?? []}
      myProgress={myProgress ?? null}
      previews={comments ?? []}
      otherClubsCount={Number(otherClubsCount ?? 0)}
      isOwner={club.created_by === user.id}
    />
  );
}
