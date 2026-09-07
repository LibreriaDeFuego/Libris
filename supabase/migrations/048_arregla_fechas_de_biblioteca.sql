-- Libris — migración 048: dos arreglos sobre las fechas de lectura
-- (migración 047).
--
-- 1. BUG: al editar un libro agregado a mano (EditPersonalBookForm →
--    updatePersonalBook) la fecha no quedaba guardada, sin ningún
--    error — porque personal_books (migración 046) nunca tuvo una
--    policy de UPDATE, solo select/insert/delete. Con RLS activado y
--    ninguna policy que lo permita, Postgres no tira error: el UPDATE
--    simplemente no afecta ninguna fila (PostgREST no distingue eso de
--    "no encontró la fila"), así que el guardado parecía funcionar —
--    sin mensaje de error — pero no cambiaba nada.
--
-- 2. Todavía no se podía corregir la fecha de un libro de CLUB —
--    reading_progress ya tenía su propia policy de update (esa parte
--    estaba bien, ver schema.sql), pero profile_books_read no devolvía
--    el club_book_id necesario para apuntar ese update. Se agrega esa
--    columna (null para un agregado a mano, que no tiene).

create policy "cada quien edita los suyos"
  on public.personal_books for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Cambia el conjunto de columnas devueltas (se agrega club_book_id) →
-- hay que borrar la función vieja.
drop function if exists public.profile_books_read(uuid, int);

create function public.profile_books_read(target_profile_id uuid, limit_count int default 60)
returns table (
  book_id uuid, title text, author text, cover_url text,
  started_at date, finished_at date, source text, club_book_id uuid
)
language sql security definer stable set search_path = public
as $$
  with club_read as (
    select distinct on (b.id)
           b.id as book_id, b.title, b.author, b.cover_url,
           rp.started_at::date as started_at,
           coalesce(rp.finished_at, c.created_at)::date as finished_at,
           cb.id as club_book_id
      from comments c
      join club_books cb on cb.id = c.club_book_id
      join clubs cl on cl.id = cb.club_id
      join books b on b.id = cb.book_id
      left join reading_progress rp on rp.club_book_id = cb.id and rp.profile_id = c.profile_id
     where c.profile_id = target_profile_id
       and c.kind = 'review'
       and (
         target_profile_id = auth.uid()
         or cl.join_mode <> 'invite'
         or exists (select 1 from club_members m where m.club_id = cl.id and m.profile_id = auth.uid())
       )
     order by b.id, c.created_at desc
  ),
  personal_read as (
    select id as book_id, title, author, cover_url, started_at, finished_at, null::uuid as club_book_id
      from personal_books
     where profile_id = target_profile_id
  )
  select book_id, title, author, cover_url, started_at, finished_at, 'club'::text as source, club_book_id from club_read
  union all
  select book_id, title, author, cover_url, started_at, finished_at, 'personal'::text as source, club_book_id from personal_read
  order by finished_at desc nulls first
  limit limit_count;
$$;

revoke all on function public.profile_books_read(uuid, int) from public;
grant execute on function public.profile_books_read(uuid, int) to authenticated;
