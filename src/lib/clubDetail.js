import { buildClubActivity } from '@/lib/clubActivity';

// Todo lo que necesitan el héroe + "Tu camino" + "Actividad del club" para
// un club puntual, más allá del libro activo (que ya se resuelve aparte con
// getActiveClubBook). Un solo lugar para esta consulta porque la usan dos
// pantallas con los mismos datos: /club/[clubId] y el héroe que vive en
// "Mis clubes de lectura" (el club activo, mismo mecanismo).
export async function getClubHeroExtras(supabase, { clubId, clubBookId, userId, isAdmin }) {
  if (!clubBookId) {
    return { chapters: [], volumes: [], myProgress: null, myReview: null, activity: [], hasActivity: false, pendingRequestCount: 0 };
  }

  const [
    { data: chapters },
    { data: volumes },
    { data: myProgress },
    { data: myReview },
    { count: commentCount },
    { count: pendingRequestCount },
    { data: recentComments },
    { data: recentReviews },
  ] = await Promise.all([
    supabase.from('chapters').select('id, number, title, label, volume_id').eq('club_book_id', clubBookId).order('number'),
    supabase.from('volumes').select('id, name, position').eq('club_book_id', clubBookId).order('position'),
    supabase
      .from('reading_progress')
      .select('chapter_id, percent, reaction, current_page, total_pages, streak_count')
      .eq('club_book_id', clubBookId)
      .eq('profile_id', userId)
      .maybeSingle(),
    supabase
      .from('comments')
      .select('id, title, body, is_spoiler')
      .eq('club_book_id', clubBookId)
      .eq('profile_id', userId)
      .eq('kind', 'review')
      .maybeSingle(),
    supabase.from('comments').select('id', { count: 'exact', head: true }).eq('club_book_id', clubBookId),
    isAdmin
      ? supabase.from('club_join_requests').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'pending')
      : Promise.resolve({ count: 0 }),
    supabase
      .from('comments')
      .select('id, chapter_id, created_at, profile_id, profiles(display_name, avatar_url)')
      .eq('club_book_id', clubBookId)
      .is('parent_comment_id', null)
      .neq('kind', 'review')
      .order('created_at', { ascending: false })
      .limit(24),
    supabase
      .from('comments')
      .select('id, created_at, profile_id, profiles(display_name, avatar_url)')
      .eq('club_book_id', clubBookId)
      .eq('kind', 'review')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const chaptersById = new Map((chapters ?? []).map((c) => [c.id, c]));
  const activity = buildClubActivity({ comments: recentComments, reviews: recentReviews, chaptersById });

  return {
    chapters: chapters ?? [],
    volumes: volumes ?? [],
    myProgress: myProgress ?? null,
    myReview: myReview ?? null,
    activity,
    hasActivity: (commentCount ?? 0) > 0,
    pendingRequestCount: pendingRequestCount ?? 0,
  };
}
