-- Libris — migración 046: "Mi biblioteca" — agregar a mano los libros que
-- se leyeron fuera de un club (mockup aprobado en el chat, artifact "Mi
-- Biblioteca").
--
-- Hasta acá, "libros leídos" (profile_books_read, migración 045) solo
-- salía de reseñas finales dejadas DENTRO de un club (comments.kind =
-- 'review'). No hay forma de anotar un libro leído por fuera de Libris —
-- se agrega una tabla nueva, personal_books, para eso.
--
-- Visibilidad: mismo criterio que "posts" (fotos del perfil, migración
-- 016) — es contenido personal, no atado a ningún club, así que se ve
-- siempre que se puede ver el perfil (mismo criterio que "Seguir"), sin
-- el chequeo de club privado/invitación que sí aplica a los libros que
-- vienen de una reseña de club.

-- ============================================================
-- 1. TABLA Y BUCKET
-- ============================================================
create table if not exists public.personal_books (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  author text,
  cover_url text,
  created_at timestamptz not null default now()
);

alter table public.personal_books enable row level security;

drop policy if exists "cualquiera ve los libros agregados a mano" on public.personal_books;
create policy "cualquiera ve los libros agregados a mano"
  on public.personal_books for select to authenticated
  using (true);

drop policy if exists "cada quien agrega los suyos" on public.personal_books;
create policy "cada quien agrega los suyos"
  on public.personal_books for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "cada quien borra los suyos" on public.personal_books;
create policy "cada quien borra los suyos"
  on public.personal_books for delete to authenticated
  using (profile_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('personal-book-covers', 'personal-book-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "cualquiera ve las portadas agregadas a mano" on storage.objects;
create policy "cualquiera ve las portadas agregadas a mano"
  on storage.objects for select
  using (bucket_id = 'personal-book-covers');

drop policy if exists "cada quien sube sus propias portadas" on storage.objects;
create policy "cada quien sube sus propias portadas"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'personal-book-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "cada quien borra sus propias portadas" on storage.objects;
create policy "cada quien borra sus propias portadas"
  on storage.objects for delete to authenticated
  using (bucket_id = 'personal-book-covers' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 2. profile_books_read: ahora también trae los agregados a mano
-- ============================================================
-- Se agrega "source" ('club' | 'personal') para poder distinguirlos en
-- "Mi biblioteca" (filtro "De mis clubes" / "Agregados por mí") — cambia
-- el conjunto de columnas devueltas, así que hay que borrar la función
-- vieja (igual que ya pasó en 016 con profile_activity).
--
-- limit_count sube de 30 a 60: antes alcanzaba y sobraba para la
-- estantería del encabezado del Perfil, pero "Mi biblioteca" quiere ver
-- bastante más de una sola pantalla.
drop function if exists public.profile_books_read(uuid, int);

create function public.profile_books_read(target_profile_id uuid, limit_count int default 60)
returns table (book_id uuid, title text, author text, cover_url text, reviewed_at timestamptz, source text)
language sql security definer stable set search_path = public
as $$
  with club_read as (
    select distinct on (b.id)
           b.id as book_id, b.title, b.author, b.cover_url, c.created_at as reviewed_at
      from comments c
      join club_books cb on cb.id = c.club_book_id
      join clubs cl on cl.id = cb.club_id
      join books b on b.id = cb.book_id
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
    select id as book_id, title, author, cover_url, created_at as reviewed_at
      from personal_books
     where profile_id = target_profile_id
  )
  select book_id, title, author, cover_url, reviewed_at, 'club'::text as source from club_read
  union all
  select book_id, title, author, cover_url, reviewed_at, 'personal'::text as source from personal_read
  order by reviewed_at desc
  limit limit_count;
$$;

revoke all on function public.profile_books_read(uuid, int) from public;
grant execute on function public.profile_books_read(uuid, int) to authenticated;
