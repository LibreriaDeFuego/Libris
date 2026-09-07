-- Libris — migración 047: fechas de lectura (empezado/terminado) y
-- Recuento del año en "Mi biblioteca" — como el "Year in Books" de
-- Goodreads.
--
-- Dos fuentes de fecha, ya que "Mi biblioteca" junta libros de dos
-- orígenes distintos (profile_books_read, migración 046):
--   - Un libro de CLUB: la fecha la pone la propia app, sola, a partir de
--     reading_progress — "empezaste" es la primera vez que se registró
--     avance en ese libro, "terminaste" es cuándo se marcó 100% (opción
--     "Terminado" de Actualizar progreso, migración 023: ya guardaba
--     finished_at, pero nunca se leía desde ningún lado hasta ahora).
--   - Un libro AGREGADO A MANO: no hay ninguna actividad de la que
--     sacarlas, así que se piden directo en el formulario (ambas
--     opcionales — "sigo leyéndolo" es no poner fecha de fin).
--
-- IMPORTANTE — dato conocido, no un bug: a un libro de club ya
-- registrado ANTES de esta migración, "empezaste" le va a quedar en el
-- momento en que se corre esta migración (default de la columna nueva),
-- no en la fecha real en que esa persona empezó a leerlo — no hay forma
-- de reconstruir eso porque nunca se guardó. Libros nuevos, de acá en
-- adelante, quedan bien desde el primer avance que se registre.

-- ============================================================
-- 1. reading_progress: cuándo se empezó (una sola vez)
-- ============================================================
-- Sin "not null"/columna aparte que la app tenga que mandar: al agregarla
-- con default now(), un INSERT nuevo la fija sola; y como updateProgress
-- (clubs.js) hace upsert con un payload que NUNCA incluye started_at, un
-- UPDATE por conflicto (alguien que ya venía registrando avance) no la
-- toca — queda fija en el primer valor para siempre, sin tocar código.
alter table public.reading_progress add column if not exists started_at timestamptz not null default now();

-- ============================================================
-- 2. personal_books: cuándo se empezó / terminó (a mano, opcionales)
-- ============================================================
alter table public.personal_books add column if not exists started_at date;
alter table public.personal_books add column if not exists finished_at date;

-- ============================================================
-- 3. profile_books_read: ahora trae started_at/finished_at
-- ============================================================
-- "reviewed_at" se renombra a "finished_at" (más claro, y ya no es
-- siempre literalmente "cuándo se reseñó": para un libro de club, de acá
-- en más sale de reading_progress.finished_at — que ya existía desde la
-- migración 023 pero nunca se leía — con la fecha de la reseña como
-- respaldo por si faltara. Cambia el conjunto de columnas → hay que
-- borrar la función vieja.
drop function if exists public.profile_books_read(uuid, int);

create function public.profile_books_read(target_profile_id uuid, limit_count int default 60)
returns table (
  book_id uuid, title text, author text, cover_url text,
  started_at date, finished_at date, source text
)
language sql security definer stable set search_path = public
as $$
  with club_read as (
    select distinct on (b.id)
           b.id as book_id, b.title, b.author, b.cover_url,
           rp.started_at::date as started_at,
           coalesce(rp.finished_at, c.created_at)::date as finished_at
      from comments c
      join club_books cb on cb.id = c.club_book_id
      join clubs cl on cl.id = cb.club_id
      join books b on b.id = cb.book_id
      -- left join, no join: si por lo que sea faltara el registro de
      -- progreso (no debería, mode='finished' siempre lo crea antes de
      -- poder reseñar), el libro no debe desaparecer de la lista solo
      -- por quedarse sin fechas — mismo criterio que un agregado a mano
      -- sin fechas puestas.
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
    select id as book_id, title, author, cover_url, started_at, finished_at
      from personal_books
     where profile_id = target_profile_id
  )
  select book_id, title, author, cover_url, started_at, finished_at, 'club'::text as source from club_read
  union all
  select book_id, title, author, cover_url, started_at, finished_at, 'personal'::text as source from personal_read
  -- Sin fecha de fin (un agregado a mano que todavía se está leyendo)
  -- queda primero, no al final — se pone "nulls first" a propósito, en
  -- vez de confiar en que sea el default de Postgres para DESC.
  order by finished_at desc nulls first
  limit limit_count;
$$;

revoke all on function public.profile_books_read(uuid, int) from public;
grant execute on function public.profile_books_read(uuid, int) to authenticated;
