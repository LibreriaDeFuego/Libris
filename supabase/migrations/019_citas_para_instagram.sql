-- Libris — migración 019: estilo de tarjeta para citas exportables a Instagram.
--
-- Las citas destacadas (kind = 'quote') ya existían; ahora, al publicarlas,
-- la persona elige uno de tres estilos visuales para la tarjeta que se puede
-- descargar como imagen (portada de fondo / oscuro / editorial). El estilo
-- elegido queda guardado junto a la cita —no solo al momento de descargar—
-- para que la tarjeta se vea siempre igual, la vuelva a descargar quien la
-- publicó, o aparezca así en su perfil más adelante.

-- ============================================================
-- 1. comments.quote_style
-- ============================================================
alter table public.comments add column if not exists quote_style text;

alter table public.comments drop constraint if exists comments_quote_style_check;
alter table public.comments add constraint comments_quote_style_check
  check (quote_style is null or quote_style in ('cover', 'dark', 'editorial'));

-- ============================================================
-- 2. profile_activity: ahora también trae el estilo de la cita
-- ============================================================
-- Mismo motivo que en 016_fotos_de_lectura.sql: Postgres no deja agregar una
-- columna al resultado de una función con CREATE OR REPLACE — hay que
-- borrarla y crearla de nuevo.
drop function if exists public.profile_activity(uuid, int);

create function public.profile_activity(target_profile_id uuid, limit_count int default 20)
returns table (
  id uuid, kind text, body text, voice_transcript text, created_at timestamptz,
  club_id uuid, club_name text,
  book_title text, book_author text, book_cover_url text, photo_url text, quote_style text
)
language sql security definer stable set search_path = public
as $$
  select id, kind, body, voice_transcript, created_at,
         club_id, club_name, book_title, book_author, book_cover_url, photo_url, quote_style
    from (
      select c.id, c.kind, c.body, c.voice_transcript, c.created_at,
             cl.id as club_id, cl.name as club_name,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.quote_style
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
             p.image_url as photo_url, null::text as quote_style
        from posts p
       where p.profile_id = target_profile_id
    ) combined
   order by created_at desc
   limit limit_count;
$$;

revoke all on function public.profile_activity(uuid, int) from public;
grant execute on function public.profile_activity(uuid, int) to authenticated;
