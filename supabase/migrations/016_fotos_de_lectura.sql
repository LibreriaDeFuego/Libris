-- Libris — migración 016: fotos de lo que estás leyendo, en el Perfil.
--
-- Se agrega a la Actividad del perfil (junto a comentarios y notas de voz)
-- un tercer tipo de bloque: una foto que la persona sube directamente,
-- opcionalmente con un texto corto. No está atada a ningún club — es
-- personal, como el resto del perfil — así que es visible para cualquiera
-- que pueda ver ese perfil (mismo criterio que ya usa "Seguir").

-- ============================================================
-- 1. TABLA Y BUCKET
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "cualquiera ve las fotos publicadas"
  on public.posts for select to authenticated
  using (true);

create policy "cada quien publica las suyas"
  on public.posts for insert to authenticated
  with check (profile_id = auth.uid());

create policy "cada quien borra las suyas"
  on public.posts for delete to authenticated
  using (profile_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-photos', 'post-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "cualquiera ve las fotos del feed"
  on storage.objects for select
  using (bucket_id = 'post-photos');

create policy "cada quien sube sus propias fotos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "cada quien borra sus propias fotos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 2. profile_activity: ahora también trae las fotos
-- ============================================================
-- Mismo criterio de visibilidad que ya tenía para comentarios y notas de
-- voz (definido en 015_perfil_de_usuario.sql) — las fotos se agregan aparte
-- porque no cuelgan de ningún club: se ven siempre que se puede ver el
-- perfil. "photo_url" es nuevo: la foto de fondo de la tarjeta cuando
-- kind = 'photo' (en el resto de los casos, la tarjeta sigue usando la
-- portada del libro, book_cover_url, como hasta ahora).
--
-- Postgres no deja agregar una columna al resultado de una función con
-- CREATE OR REPLACE — hay que borrarla y crearla de nuevo.
drop function if exists public.profile_activity(uuid, int);

create function public.profile_activity(target_profile_id uuid, limit_count int default 20)
returns table (
  id uuid, kind text, body text, voice_transcript text, created_at timestamptz,
  club_id uuid, club_name text,
  book_title text, book_author text, book_cover_url text, photo_url text
)
language sql security definer stable set search_path = public
as $$
  select id, kind, body, voice_transcript, created_at,
         club_id, club_name, book_title, book_author, book_cover_url, photo_url
    from (
      select c.id, c.kind, c.body, c.voice_transcript, c.created_at,
             cl.id as club_id, cl.name as club_name,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url
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
      union all
      select p.id, 'photo'::text as kind, p.caption as body, null::text as voice_transcript, p.created_at,
             null::uuid as club_id, null::text as club_name,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             p.image_url as photo_url
        from posts p
       where p.profile_id = target_profile_id
    ) combined
   order by created_at desc
   limit limit_count;
$$;

revoke all on function public.profile_activity(uuid, int) from public;
grant execute on function public.profile_activity(uuid, int) to authenticated;
