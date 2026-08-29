-- Libris — migración 030: responder a una reseña, cita, comentario o nota
-- de voz.
--
-- La respuesta es un comentario más (kind = 'text'), con parent_comment_id
-- apuntando al original — no hace falta una tabla ni una política nueva
-- para publicarla: "members post comments in their clubs" (schema.sql) ya
-- alcanza, porque no distingue por kind. Solo se agrega la columna y, para
-- que una respuesta no aparezca como una actividad propia (duplicada) en
-- el perfil de quien la escribió, se excluye de profile_activity.

alter table public.comments add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;
create index if not exists comments_parent_comment_id_idx on public.comments (parent_comment_id);

drop function if exists public.profile_activity(uuid, int);

create function public.profile_activity(target_profile_id uuid, limit_count int default 20)
returns table (
  id uuid, kind text, title text, body text, voice_transcript text, created_at timestamptz,
  club_id uuid, club_name text,
  book_title text, book_author text, book_cover_url text, photo_url text,
  quote_style text, quote_image_url text,
  like_count int, liked_by_me boolean
)
language sql security definer stable set search_path = public
as $$
  select id, kind, title, body, voice_transcript, created_at,
         club_id, club_name, book_title, book_author, book_cover_url, photo_url,
         quote_style, quote_image_url, like_count, liked_by_me
    from (
      select c.id, c.kind, c.title, c.body, c.voice_transcript, c.created_at,
             cl.id as club_id, cl.name as club_name,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.quote_style, c.quote_image_url,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me
        from comments c
        join club_books cb on cb.id = c.club_book_id
        join clubs cl on cl.id = cb.club_id
        join books b on b.id = cb.book_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from comment_likes where comment_id = c.id
        ) cnt on true
       where c.profile_id = target_profile_id
         and not c.is_spoiler
         and c.parent_comment_id is null
         and (
           target_profile_id = auth.uid()
           or cl.join_mode <> 'invite'
           or exists (select 1 from club_members m where m.club_id = cl.id and m.profile_id = auth.uid())
         )
      union all
      select p.id, 'photo'::text as kind, null::text as title, p.caption as body, null::text as voice_transcript, p.created_at,
             null::uuid as club_id, null::text as club_name,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             p.image_url as photo_url, null::text as quote_style, null::text as quote_image_url,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me
        from posts p
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from post_likes where post_id = p.id
        ) cnt on true
       where p.profile_id = target_profile_id
    ) combined
   order by created_at desc
   limit limit_count;
$$;

revoke all on function public.profile_activity(uuid, int) from public;
grant execute on function public.profile_activity(uuid, int) to authenticated;
