-- Libris — migración 021: la imagen de la cita se guarda al publicar.
--
-- Hasta ahora la tarjeta de la cita se dibujaba de nuevo cada vez que se
-- quería descargar, a partir del texto y el estilo guardados — nunca se
-- guardaba la imagen en sí. Eso significaba que en el feed de Inicio y en
-- la Actividad del perfil, una cita con imagen (kind = 'quote') se seguía
-- mostrando con el tratamiento genérico de siempre (la portada del libro
-- de fondo + el texto de la cita superpuesto), no con la tarjeta real que
-- la persona eligió al publicar.
--
-- Ahora, al publicar, el navegador genera la tarjeta (igual que para
-- descargarla) y la sube al bucket "quote-cards" — el feed muestra esa
-- imagen tal cual, en el mismo formato que se eligió.

-- ============================================================
-- 1. Bucket + columna
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quote-cards', 'quote-cards', true, 8388608, array['image/jpeg'])
on conflict (id) do nothing;

create policy "cualquiera ve las imágenes de citas"
  on storage.objects for select
  using (bucket_id = 'quote-cards');

create policy "cada quien sube sus propias imágenes de citas"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'quote-cards' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "cada quien borra sus propias imágenes de citas"
  on storage.objects for delete to authenticated
  using (bucket_id = 'quote-cards' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.comments add column if not exists quote_image_url text;

-- ============================================================
-- 2. profile_activity y recent_activity: ahora también traen la imagen
-- ============================================================
drop function if exists public.profile_activity(uuid, int);

create function public.profile_activity(target_profile_id uuid, limit_count int default 20)
returns table (
  id uuid, kind text, body text, voice_transcript text, created_at timestamptz,
  club_id uuid, club_name text,
  book_title text, book_author text, book_cover_url text, photo_url text,
  quote_style text, quote_image_url text
)
language sql security definer stable set search_path = public
as $$
  select id, kind, body, voice_transcript, created_at,
         club_id, club_name, book_title, book_author, book_cover_url, photo_url,
         quote_style, quote_image_url
    from (
      select c.id, c.kind, c.body, c.voice_transcript, c.created_at,
             cl.id as club_id, cl.name as club_name,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.quote_style, c.quote_image_url
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
             p.image_url as photo_url, null::text as quote_style, null::text as quote_image_url
        from posts p
       where p.profile_id = target_profile_id
    ) combined
   order by created_at desc
   limit limit_count;
$$;

revoke all on function public.profile_activity(uuid, int) from public;
grant execute on function public.profile_activity(uuid, int) to authenticated;

drop function if exists public.recent_activity(int);

create function public.recent_activity(limit_count int default 30)
returns table (
  id uuid, kind text, body text, created_at timestamptz,
  profile_id uuid, display_name text, avatar_url text,
  club_id uuid, club_name text,
  book_title text, book_author text, book_cover_url text,
  photo_url text, quote_style text, quote_image_url text
)
language sql security definer stable set search_path = public
as $$
  select id, kind, body, created_at, profile_id, display_name, avatar_url,
         club_id, club_name, book_title, book_author, book_cover_url, photo_url,
         quote_style, quote_image_url
    from (
      select c.id, 'quote'::text as kind, c.body, c.created_at,
             c.profile_id, p.display_name, p.avatar_url,
             cl.id as club_id, cl.name as club_name,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.quote_style, c.quote_image_url
        from comments c
        join profiles p on p.id = c.profile_id
        join club_books cb on cb.id = c.club_book_id
        join clubs cl on cl.id = cb.club_id
        join books b on b.id = cb.book_id
       where c.kind = 'quote'
         and not c.is_spoiler
         and (
           cl.join_mode <> 'invite'
           or exists (select 1 from club_members m where m.club_id = cl.id and m.profile_id = auth.uid())
         )
      union all
      select po.id, 'photo'::text as kind, po.caption as body, po.created_at,
             po.profile_id, p.display_name, p.avatar_url,
             null::uuid as club_id, null::text as club_name,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             po.image_url as photo_url, null::text as quote_style, null::text as quote_image_url
        from posts po
        join profiles p on p.id = po.profile_id
    ) combined
   order by created_at desc
   limit limit_count;
$$;

revoke all on function public.recent_activity(int) from public;
grant execute on function public.recent_activity(int) to authenticated;
