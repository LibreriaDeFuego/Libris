import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getPrincipalClubBook } from '@/lib/activeClub';
import { PreferenciasScreen } from '@/screens/PreferenciasScreen.jsx';

export const metadata = { title: 'Preferencias · Libris' };

export default async function Page({ params, searchParams }) {
  const { clubId } = await params;
  const { libro } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clubs = await getMyClubs(supabase, user.id);
  const club = clubs.find((c) => c.id === clubId);
  if (!club) notFound();

  const isAdmin = club.role === 'admin';

  // "?libro=" — configurar un libro en paralelo, no solo el principal
  // (migración 060); sin el parámetro, sigue siendo el principal, como
  // siempre. Antes esta pantalla SIEMPRE traía el principal, sin importar
  // desde qué libro se abriera Preferencias — el ícono de Preferencias en
  // "Tu camino" de un libro en paralelo terminaba mostrando los datos de
  // otro libro.
  //
  // El principal siempre se pide aparte (ya no es una columna del libro
  // que se esté mirando, migración 062) — para poder comparar y saber si
  // "este" libro es el principal o no, sin otra consulta más si no hace
  // falta.
  const [{ data: members }, principalClubBook, clubBook, { data: pendingRequests }] = await Promise.all([
    supabase
      .from('club_members')
      .select('profile_id, role, joined_at, profiles(display_name, avatar_url)')
      .eq('club_id', clubId)
      .order('joined_at'),
    getPrincipalClubBook(supabase, clubId),
    libro
      ? supabase
          .from('club_books')
          .select('id, books(id, title, author, cover_url)')
          .eq('id', libro)
          .eq('club_id', clubId)
          .maybeSingle()
          .then(({ data }) => data)
      : Promise.resolve(null),
    isAdmin
      ? supabase
          .from('club_join_requests')
          .select('id, message, created_at, profiles(display_name)')
          .eq('club_id', clubId)
          .eq('status', 'pending')
          .order('created_at')
      : Promise.resolve({ data: [] }),
  ]);

  const effectiveClubBook = libro ? clubBook : principalClubBook;

  return (
    <PreferenciasScreen
      club={club}
      book={effectiveClubBook?.books ?? null}
      clubBookId={effectiveClubBook?.id ?? null}
      isBookPrincipal={effectiveClubBook?.id === principalClubBook?.id}
      isAdmin={isAdmin}
      currentUserId={user.id}
      members={members ?? []}
      pendingRequests={pendingRequests ?? []}
    />
  );
}
