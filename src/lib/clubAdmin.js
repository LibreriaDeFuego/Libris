// Si `userId` es administrador del club dueño de este `club_book_id` —
// lo necesitan las acciones que dejan a un administrador borrar contenido
// AJENO (deleteComment/deleteQuote en clubs.js, deleteVoiceComment en
// media.js): tu propio contenido siempre se puede borrar (eso ya lo cubre
// la política de RLS de siempre), esto es solo para la excepción de
// moderación. Un simple helper compartido en vez de repetir el mismo
// join club_books -> club_members en las tres acciones.
export async function isClubBookAdmin(supabase, clubBookId, userId) {
  if (!clubBookId || !userId) return false;

  const { data: clubBook } = await supabase
    .from('club_books')
    .select('club_id')
    .eq('id', clubBookId)
    .maybeSingle();
  if (!clubBook) return false;

  const { data: membership } = await supabase
    .from('club_members')
    .select('role')
    .eq('club_id', clubBook.club_id)
    .eq('profile_id', userId)
    .maybeSingle();

  return membership?.role === 'admin';
}

// Deja un registro de que un administrador borró contenido AJENO — es lo
// único que le da a notifications_feed (migración 037) algo de qué avisarle
// a quien lo había publicado, ya que el borrado en sí es total (la fila de
// "comments" desaparece del todo, sin dejar rastro — se pidió así a
// propósito). Se llama ANTES de borrar la fila real, con los datos que
// hacían falta guardar (a quién se le borró, en qué club/capítulo, de qué
// tipo era, una vista previa corta) — después ya no hay de dónde sacarlos.
export async function logModerationDelete(supabase, { clubBookId, chapterId, kind, preview, targetProfileId, actorProfileId }) {
  await supabase.from('moderation_deletes').insert({
    club_book_id: clubBookId,
    chapter_id: chapterId,
    kind,
    preview,
    target_profile_id: targetProfileId,
    actor_profile_id: actorProfileId,
  });
}
