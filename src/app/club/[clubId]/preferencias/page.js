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
  const [{ data: members }, clubBook, { data: pendingRequests }] = await Promise.all([
    supabase
      .from('club_members')
      .select('profile_id, role, joined_at, profiles(display_name, avatar_url)')
      .eq('club_id', clubId)
      .order('joined_at'),
    libro
      ? supabase
          .from('club_books')
          .select('id, is_principal, books(id, title, author, cover_url)')
          .eq('id', libro)
          .eq('club_id', clubId)
          .maybeSingle()
          .then(({ data }) => data)
      : getPrincipalClubBook(supabase, clubId),
    isAdmin
      ? supabase
          .from('club_join_requests')
          .select('id, message, created_at, profiles(display_name)')
          .eq('club_id', clubId)
          .eq('status', 'pending')
          .order('created_at')
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <PreferenciasScreen
      club={club}
      book={clubBook?.books ?? null}
      clubBookId={clubBook?.id ?? null}
      isBookPrincipal={clubBook?.is_principal ?? true}
      isAdmin={isAdmin}
      currentUserId={user.id}
      members={members ?? []}
      pendingRequests={pendingRequests ?? []}
    />
  );
}
