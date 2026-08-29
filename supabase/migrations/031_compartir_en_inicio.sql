-- Libris — migración 031: compartir un comentario de capítulo o una nota
-- de voz en Inicio.
--
-- Reseñas, citas y fotos ya aparecen siempre en Inicio — no necesitan
-- esto, no cambia nada para ellas. Comentarios de capítulo y notas de voz
-- son, hasta ahora, privados del club: "shared_to_feed" (default false,
-- así que todo lo que ya existe queda exactamente como está) deja que
-- quien los escribió decida compartir uno puntual más allá del club.

alter table public.comments add column if not exists shared_to_feed boolean not null default false;

drop function if exists public.recent_activity(int);

create function public.recent_activity(limit_count int default 30)
returns table (
  id uuid, kind text, title text, body text, created_at timestamptz,
  profile_id uuid, display_name text, avatar_url text,
  club_id uuid, club_name text,
  book_title text, book_author text, book_cover_url text,
  photo_url text, quote_style text, quote_image_url text,
  like_count int, liked_by_me boolean
)
language sql security definer stable set search_path = public
as $$
  select id, kind, title, body, created_at, profile_id, display_name, avatar_url,
         club_id, club_name, book_title, book_author, book_cover_url, photo_url,
         quote_style, quote_image_url, like_count, liked_by_me
    from (
      select c.id, c.kind, c.title, c.body, c.created_at,
             c.profile_id, p.display_name, p.avatar_url,
             cl.id as club_id, cl.name as club_name,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.quote_style, c.quote_image_url,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me
        from comments c
        join profiles p on p.id = c.profile_id
        join club_books cb on cb.id = c.club_book_id
        join clubs cl on cl.id = cb.club_id
        join books b on b.id = cb.book_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from comment_likes where comment_id = c.id
        ) cnt on true
       where c.parent_comment_id is null
         and not c.is_spoiler
         and (
           c.kind in ('quote', 'review')
           or (c.kind in ('text', 'voice') and c.shared_to_feed)
         )
         and (
           cl.join_mode <> 'invite'
           or exists (select 1 from club_members m where m.club_id = cl.id and m.profile_id = auth.uid())
         )
      union all
      select po.id, 'photo'::text as kind, null::text as title, po.caption as body, po.created_at,
             po.profile_id, p.display_name, p.avatar_url,
             null::uuid as club_id, null::text as club_name,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             po.image_url as photo_url, null::text as quote_style, null::text as quote_image_url,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me
        from posts po
        join profiles p on p.id = po.profile_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from post_likes where post_id = po.id
        ) cnt on true
    ) combined
   order by created_at desc
   limit limit_count;
$$;

revoke all on function public.recent_activity(int) from public;
grant execute on function public.recent_activity(int) to authenticated;
