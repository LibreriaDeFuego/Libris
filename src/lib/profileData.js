import { signCommentImageUrls } from '@/lib/commentPhotos';

// Todo lo que necesita la pantalla de Perfil, para un profileId puntual —
// compartido entre "mi perfil" (/perfil) y "el perfil de otra persona"
// (/perfil/[profileId]) para no duplicar las cuatro consultas.
export async function getProfileData(supabase, viewerId, targetProfileId) {
  const isOwn = targetProfileId === viewerId;

  const [{ data: profile }, { data: stats }, { data: activity }, { data: booksRead }, followRow] = await Promise.all([
    supabase.from('profiles').select('id, display_name, username, avatar_url, bio').eq('id', targetProfileId).maybeSingle(),
    supabase.rpc('profile_stats', { target_profile_id: targetProfileId }).maybeSingle(),
    supabase.rpc('profile_activity', { target_profile_id: targetProfileId, limit_count: 20 }),
    // "Libros leídos" (la estantería del encabezado) — distinto de
    // stats.book_count: ahí se cuenta cualquier libro con progreso
    // registrado, acá solo los que de verdad se terminaron (tienen una
    // reseña final). Ver profile_books_read, migración 045.
    supabase.rpc('profile_books_read', { target_profile_id: targetProfileId }),
    isOwn
      ? Promise.resolve({ data: null })
      : supabase.from('follows').select('follower_id').eq('follower_id', viewerId).eq('followed_id', targetProfileId).maybeSingle(),
  ]);

  // Un comentario compartido con foto adjunta trae, todavía, el path
  // guardado (bucket privado "comment-photos") — se firma acá.
  const signedActivity = await signCommentImageUrls(supabase, activity ?? []);

  return {
    profile,
    isOwn,
    isFollowing: Boolean(followRow?.data),
    stats: stats ?? { book_count: 0, follower_count: 0, following_count: 0 },
    activity: signedActivity,
    booksRead: booksRead ?? [],
  };
}
