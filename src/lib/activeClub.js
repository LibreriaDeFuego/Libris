import { cookies } from 'next/headers';

export const ACTIVE_CLUB_COOKIE = 'libris_club';

// Todos los clubes a los que pertenece el usuario, en orden de ingreso.
export async function getMyClubs(supabase, userId) {
  const { data } = await supabase
    .from('club_members')
    .select('role, joined_at, clubs(id, name, is_private, created_by)')
    .eq('profile_id', userId)
    .order('joined_at');

  return (data ?? [])
    .filter((membership) => membership.clubs)
    .map((membership) => ({ ...membership.clubs, role: membership.role }));
}

// Club activo = el que eligió el usuario (cookie), o el primero si la cookie
// quedó apuntando a un club del que ya no es miembro.
export async function getActiveClub(supabase, userId) {
  const clubs = await getMyClubs(supabase, userId);
  if (clubs.length === 0) return { clubs: [], active: null };

  const store = await cookies();
  const preferredId = store.get(ACTIVE_CLUB_COOKIE)?.value;
  const active = clubs.find((club) => club.id === preferredId) ?? clubs[0];
  return { clubs, active };
}

// Libro activo de un club puntual.
export async function getActiveClubBook(supabase, clubId) {
  const { data } = await supabase
    .from('club_books')
    .select('id, club_id, book_id, books(id, title, author, cover_url)')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle();
  return data ?? null;
}

// Última novedad de un club (comentario o progreso más reciente), para la
// tarjeta de "Mis clubes de lectura". No hay tracking de "visto/no visto"
// todavía — es un resumen de actividad, no un contador de no leídos.
export async function getClubActivityPreview(supabase, clubBookId, bookTitle) {
  if (!clubBookId) return null;

  const [{ data: comment }, { data: progress }] = await Promise.all([
    supabase
      .from('comments')
      .select('created_at, profiles(display_name)')
      .eq('club_book_id', clubBookId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('reading_progress')
      .select('updated_at, profiles(display_name), chapters(label)')
      .eq('club_book_id', clubBookId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const candidates = [];
  if (comment) {
    candidates.push({
      time: comment.created_at,
      text: `${comment.profiles?.display_name ?? 'Alguien'} comentó en ${bookTitle}`,
    });
  }
  if (progress) {
    candidates.push({
      time: progress.updated_at,
      text: `${progress.profiles?.display_name ?? 'Alguien'} avanzó a ${progress.chapters?.label ?? 'un nuevo capítulo'}`,
    });
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => new Date(b.time) - new Date(a.time));
  return candidates[0];
}
