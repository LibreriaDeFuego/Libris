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
// clubes de lectura" y el que abre "Tu camino" por default. Hasta la
// migración 060 esto era "el" libro activo del club (como mucho uno a la
// vez); ahora un club puede tener varios libros en curso al mismo tiempo
// (is_active), pero sigue habiendo como mucho un principal entre ellos
// (is_principal) — para no romper ninguna pantalla que asuma "el libro
// del club". Los demás libros en curso (y los archivados) se piden aparte
// con getClubOtherBooks (clubDetail.js).
export async function getPrincipalClubBook(supabase, clubId) {
  const { data } = await supabase
    .from('club_books')
    .select('id, club_id, book_id, books(id, title, author, cover_url)')
    .eq('club_id', clubId)
    .eq('is_principal', true)
    .maybeSingle();
  return data ?? null;
}
