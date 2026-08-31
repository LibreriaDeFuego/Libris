// Todos los clubes a los que pertenece el usuario, en orden de ingreso.
export async function getMyClubs(supabase, userId) {
  const { data } = await supabase
    .from('club_members')
    .select('role, joined_at, clubs(id, name, is_private, join_mode, created_by)')
    .eq('profile_id', userId)
    .order('joined_at');

  return (data ?? [])
    .filter((membership) => membership.clubs)
    .map((membership) => ({ ...membership.clubs, role: membership.role }));
}

// Los miembros de un club, con perfil básico — mismo shape que ya usa
// /club/[clubId] para "Quiénes están leyendo".
export async function getClubMembers(supabase, clubId) {
  const { data } = await supabase
    .from('club_members')
    .select('profile_id, profiles(display_name, avatar_url)')
    .eq('club_id', clubId)
    .order('joined_at');

  return (data ?? []).map((m) => ({
    profileId: m.profile_id,
    displayName: m.profiles?.display_name ?? 'Alguien',
    avatarUrl: m.profiles?.avatar_url ?? null,
  }));
}

// Libro activo de un club puntual.
export async function getActiveClubBook(supabase, clubId) {
  const { data } = await supabase
    .from('club_books')
    .select('id, club_id, book_id, books(id, title, author, cover_url, cover_has_title)')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle();
  return data ?? null;
}
