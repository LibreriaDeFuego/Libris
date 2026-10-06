// Todos los clubes a los que pertenece el usuario, en orden de ingreso.
export async function getMyClubs(supabase, userId) {
  const { data, error } = await supabase
    .from('club_members')
    .select('role, joined_at, clubs(id, name, is_private, join_mode, created_by, meeting_at, meeting_mode, meeting_link, meeting_place)')
    .eq('profile_id', userId)
    .order('joined_at');

  // Antes esto se tragaba en silencio (data ?? []) — si esta consulta falla
  // (por ejemplo, una migración de columna todavía no corrida en Supabase),
  // page.js interpreta "cero clubes" como "todavía no tenés ninguno" y
  // manda a la pantalla de bienvenida, como si los clubes hubieran
  // desaparecido. Un log server-side deja el motivo real a mano en los
  // logs, en vez de una lista vacía sin explicación.
  if (error) console.error('getMyClubs:', error.message);

  return (data ?? [])
    .filter((membership) => membership.clubs)
    .map((membership) => ({ ...membership.clubs, role: membership.role }));
}

// Los miembros de un club, con perfil básico — la usa "Mis clubes de
// lectura" para la lista de integrantes de cada tarjeta.
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

// El libro PRINCIPAL de un club puntual — el que se destaca en "Mis
// clubes de lectura" y el que abre "Tu camino" por default. Un club puede
// tener varios libros en curso a la vez (is_active, migración 060); el
// principal es, siempre, el ACTIVO con la fecha de ingreso (started_at)
// más reciente — "el último que se agrega es el principal, y punto", sin
// elección de por medio (antes era un flag aparte, is_principal, que
// había que mover a mano y podía desincronizarse; migración 062 lo saca
// del todo). Los demás libros en curso (y los archivados) se piden aparte
// con getClubOtherBooks (clubDetail.js).
export async function getPrincipalClubBook(supabase, clubId) {
  const { data } = await supabase
    .from('club_books')
    .select('id, club_id, book_id, books(id, title, author, cover_url)')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
