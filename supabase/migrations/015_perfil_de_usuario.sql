-- Libris — migración 015: perfil de usuario que se puede seguir.
--
-- Nueva sección "Perfil": foto de portada, bio, un feed con lo que esa
-- persona comentó de cada libro, y un botón para seguirla — parecido a
-- Instagram, pero respetando la privacidad de los clubes: a un desconocido
-- solo se le muestra actividad de clubes públicos o "con solicitud"; a un
-- compañero de club se le sigue mostrando todo lo de ese club, como siempre.

-- ============================================================
-- 1. BIO Y FOTO DE PERFIL
-- ============================================================
alter table public.profiles add column if not exists bio text;
-- avatar_url ya existía en la tabla desde el principio, pero nunca se usó.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "cualquiera ve las fotos de perfil"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Cada quien sube la suya, a su propia carpeta ("<user_id>/archivo.jpg") —
-- la carpeta es lo que la política usa para no dejar subir a la carpeta de otro.
create policy "cada quien sube su propia foto de perfil"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "cada quien reemplaza su propia foto de perfil"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 2. SEGUIR
-- ============================================================
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

alter table public.follows enable row level security;

-- Quién sigue a quién no es información sensible (es lo mismo que ya es
-- público en cualquier red social) — se lee igual que los perfiles básicos.
create policy "cualquiera ve quién sigue a quién"
  on public.follows for select to authenticated
  using (true);

create policy "cada quien sigue por su cuenta"
  on public.follows for insert to authenticated
  with check (follower_id = auth.uid());

create policy "cada quien deja de seguir por su cuenta"
  on public.follows for delete to authenticated
  using (follower_id = auth.uid());

-- ============================================================
-- 3. ACTIVIDAD DEL PERFIL (lo que comentó, libro por libro)
-- ============================================================
-- RLS de "comments" solo deja ver comentarios a los miembros de ESE club —
-- correcto para la pantalla de un club, pero un perfil lo puede ver
-- cualquiera. Esta función decide, comentario por comentario, qué se
-- muestra a quien está mirando:
--   - todo lo tuyo, si mirás tu propio perfil;
--   - lo de un club público o "con solicitud", a cualquiera;
--   - lo de un club privado, solo a quien ya es miembro de ese club.
-- Los comentarios marcados spoiler no se muestran acá (ya se ocultan igual
-- dentro del club; no tiene sentido revelarlos en un perfil).
create or replace function public.profile_activity(target_profile_id uuid, limit_count int default 20)
returns table (
  id uuid, kind text, body text, voice_transcript text, created_at timestamptz,
  club_id uuid, club_name text,
  book_title text, book_author text, book_cover_url text
)
language sql security definer stable set search_path = public
as $$
  select c.id, c.kind, c.body, c.voice_transcript, c.created_at,
         cl.id, cl.name,
         b.title, b.author, b.cover_url
    from comments c
    join club_books cb on cb.id = c.club_book_id
    join clubs cl on cl.id = cb.club_id
    join books b on b.id = cb.book_id
   where c.profile_id = target_profile_id
     and not c.is_spoiler
     and (
       target_profile_id = auth.uid()
       or cl.join_mode <> 'invite'
       or exists (select 1 from club_members m where m.club_id = cl.id and m.profile_id = auth.uid())
     )
   order by c.created_at desc
   limit limit_count;
$$;

revoke all on function public.profile_activity(uuid, int) from public;
grant execute on function public.profile_activity(uuid, int) to authenticated;

-- Los tres números de arriba del perfil: libros (con la misma visibilidad
-- que la actividad), seguidores y siguiendo (sin filtro, porque "seguir" ya
-- es público).
create or replace function public.profile_stats(target_profile_id uuid)
returns table (book_count bigint, follower_count bigint, following_count bigint)
language sql security definer stable set search_path = public
as $$
  select
    (select count(distinct cb.book_id)
       from reading_progress rp
       join club_books cb on cb.id = rp.club_book_id
       join clubs cl on cl.id = cb.club_id
      where rp.profile_id = target_profile_id
        and (
          target_profile_id = auth.uid()
          or cl.join_mode <> 'invite'
          or exists (select 1 from club_members m where m.club_id = cl.id and m.profile_id = auth.uid())
        )
    ),
    (select count(*) from follows where followed_id = target_profile_id),
    (select count(*) from follows where follower_id = target_profile_id);
$$;

revoke all on function public.profile_stats(uuid) from public;
grant execute on function public.profile_stats(uuid) to authenticated;
