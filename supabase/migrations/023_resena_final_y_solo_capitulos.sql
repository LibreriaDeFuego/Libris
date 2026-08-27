-- Libris — migración 023: la reseña final, al declarar un libro terminado;
-- los comentarios del club quedan solo por capítulo (se saca "General del
-- libro" — esa dinámica quedaba floja, se refuerza comentar por capítulo).
--
-- "Terminado" es una opción nueva en Actualizar progreso (junto a "Por
-- capítulo" y "Por página"). Al guardarla se pide una reseña: título +
-- texto — se guarda como un comentario más (kind = 'review'), pero SIEMPRE
-- del libro entero (chapter_id null, nunca de un capítulo puntual). En el
-- feed se muestra con identidad propia: el título junto a la portada del
-- libro (la que ya tiene el club — no una foto que suba la persona), con
-- el mismo tratamiento de sombra proyectada que se probó primero como
-- mockup ("Identidad de Citas"); el texto de la reseña se ve hasta 5
-- líneas, se despliega tocando la tarjeta (igual que ya pasa con cualquier
-- otro comentario largo).

alter table public.reading_progress add column if not exists finished_at timestamptz;

alter table public.comments add column if not exists title text;

alter table public.comments drop constraint if exists comments_kind_check;
alter table public.comments add constraint comments_kind_check
  check (kind in ('text', 'quote', 'voice', 'review'));

-- Una reseña es del libro entero (nunca de un capítulo puntual) y necesita
-- título; el resto de los tipos de comentario no lo usan.
alter table public.comments drop constraint if exists comments_review_shape_check;
alter table public.comments add constraint comments_review_shape_check
  check (kind <> 'review' or (chapter_id is null and title is not null));

-- ============================================================
-- profile_activity y recent_activity: ahora también traen el título, y
-- recent_activity ahora también trae las reseñas (antes solo citas
-- destacadas + fotos) — mismo criterio de privacidad de club que ya usan
-- las citas: se ven siempre las de un club abierto o "con solicitud",
-- las de uno privado solo si sos miembro.
-- ============================================================
-- Postgres no deja agregar una columna al resultado de una función con
-- CREATE OR REPLACE — hay que borrarla y crearla de nuevo.
drop function if exists public.profile_activity(uuid, int);

create function public.profile_activity(target_profile_id uuid, limit_count int default 20)
returns table (
  id uuid, kind text, title text, body text, voice_transcript text, created_at timestamptz,
  club_id uuid, club_name text,
  book_title text, book_author text, book_cover_url text, photo_url text,
  quote_style text, quote_image_url text
)
language sql security definer stable set search_path = public
as $$
  select id, kind, title, body, voice_transcript, created_at,
         club_id, club_name, book_title, book_author, book_cover_url, photo_url,
         quote_style, quote_image_url
    from (
      select c.id, c.kind, c.title, c.body, c.voice_transcript, c.created_at,
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
      select p.id, 'photo'::text as kind, null::text as title, p.caption as body, null::text as voice_transcript, p.created_at,
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
  id uuid, kind text, title text, body text, created_at timestamptz,
  profile_id uuid, display_name text, avatar_url text,
  club_id uuid, club_name text,
  book_title text, book_author text, book_cover_url text,
  photo_url text, quote_style text, quote_image_url text
)
language sql security definer stable set search_path = public
as $$
  select id, kind, title, body, created_at, profile_id, display_name, avatar_url,
         club_id, club_name, book_title, book_author, book_cover_url, photo_url,
         quote_style, quote_image_url
    from (
      select c.id, c.kind, c.title, c.body, c.created_at,
             c.profile_id, p.display_name, p.avatar_url,
             cl.id as club_id, cl.name as club_name,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.quote_style, c.quote_image_url
        from comments c
        join profiles p on p.id = c.profile_id
        join club_books cb on cb.id = c.club_book_id
        join clubs cl on cl.id = cb.club_id
        join books b on b.id = cb.book_id
       where c.kind in ('quote', 'review')
         and not c.is_spoiler
         and (
           cl.join_mode <> 'invite'
           or exists (select 1 from club_members m where m.club_id = cl.id and m.profile_id = auth.uid())
         )
      union all
      select po.id, 'photo'::text as kind, null::text as title, po.caption as body, po.created_at,
             po.profile_id, p.display_name, p.avatar_url,
             null::uuid as club_id, null::text as club_name,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             po.image_url as photo_url, null::text as quote_style, null::text as quote_image_url
        from posts po
        join profiles p on po.profile_id = p.id
    ) combined
   order by created_at desc
   limit limit_count;
$$;

revoke all on function public.recent_activity(int) from public;
grant execute on function public.recent_activity(int) to authenticated;
