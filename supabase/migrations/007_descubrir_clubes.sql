-- Libris — migración 007: descubrir otros clubes públicos para unirse.
-- Correr DESPUÉS de 006, una sola vez.
--
-- RLS solo deja ver los clubes propios (correcto), así que un directorio de
-- clubes públicos necesita una función security definer, igual que el resto
-- del descubrimiento social (migración 005).

create or replace function public.discover_public_clubs(limit_count int default 30)
returns table (
  id uuid, name text, member_count bigint,
  book_title text, book_author text, book_cover_url text
)
language sql security definer stable set search_path = public
as $$
  select c.id, c.name,
         (select count(*) from club_members m where m.club_id = c.id),
         b.title, b.author, b.cover_url
    from clubs c
    left join club_books cb on cb.club_id = c.id and cb.is_active
    left join books b on b.id = cb.book_id
   where c.is_private = false
   order by c.created_at desc
   limit limit_count;
$$;

revoke all on function public.discover_public_clubs(int) from public;
grant execute on function public.discover_public_clubs(int) to authenticated;
