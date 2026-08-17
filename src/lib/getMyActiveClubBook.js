// Ubica el club_book activo del club del usuario (por ahora, un usuario
// pertenece a un solo club — ver TODO en OnboardingScreen para multi-club).
// Devuelve null si el usuario no tiene club o el club no tiene libro activo.
export async function getMyActiveClubBook(supabase, userId) {
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('profile_id', userId)
    .limit(1)
    .maybeSingle();
  if (!membership) return null;

  const { data: clubBook } = await supabase
    .from('club_books')
    .select('id, club_id, book_id, books(title, author)')
    .eq('club_id', membership.club_id)
    .eq('is_active', true)
    .maybeSingle();
  if (!clubBook) return null;

  return clubBook;
}
