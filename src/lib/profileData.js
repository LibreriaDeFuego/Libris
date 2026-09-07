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
    // "Libros leídos" (la estantería del encabezado, y la fuente de "Mi
    // biblioteca") — reseñas finales de un club MÁS los agregados a mano
    // (personal_books), ver profile_books_read, migraciones 045/046.
    supabase.rpc('profile_books_read', { target_profile_id: targetProfileId }),
    isOwn
      ? Promise.resolve({ data: null })
      : supabase.from('follows').select('follower_id').eq('follower_id', viewerId).eq('followed_id', targetProfileId).maybeSingle(),
  ]);

  // Un comentario compartido con foto adjunta trae, todavía, el path
  // guardado (bucket privado "comment-photos") — se firma acá.
  const signedActivity = await signCommentImageUrls(supabase, activity ?? []);
  const resolvedBooksRead = booksRead ?? [];

  return {
    profile,
    isOwn,
    isFollowing: Boolean(followRow?.data),
    // El "Libros" de las tres estadísticas pasa a salir de booksRead, no
    // del book_count que ya traía profile_stats — ese cuenta cualquier
    // libro con progreso registrado (reading_progress), esté terminado o
    // no, y ahora este número tiene que coincidir con lo que se ve al
    // tocarlo (Mi Biblioteca): libros de verdad terminados o agregados a
    // mano, ni más ni menos.
    stats: { ...(stats ?? { follower_count: 0, following_count: 0 }), book_count: resolvedBooksRead.length },
    activity: signedActivity,
    booksRead: resolvedBooksRead,
  };
}

// Lo que necesita "Mi biblioteca" (o la de otra persona) — nombre para el
// título de la pantalla si no es la propia, más la misma lista de libros
// que ya arma la estantería del Perfil.
export async function getLibraryData(supabase, viewerId, targetProfileId) {
  const isOwn = targetProfileId === viewerId;

  const [{ data: profile }, { data: booksRead }] = await Promise.all([
    supabase.from('profiles').select('id, display_name').eq('id', targetProfileId).maybeSingle(),
    supabase.rpc('profile_books_read', { target_profile_id: targetProfileId, limit_count: 200 }),
  ]);

  return { profile, isOwn, booksRead: booksRead ?? [] };
}
