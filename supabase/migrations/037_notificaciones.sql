-- Libris — migración 037: notificaciones en Inicio.
--
-- No hay tabla de notificaciones propia — se arma al vuelo, cruzando lo
-- que ya existe (follows, comment_likes, post_likes, respuestas en
-- comments, post_comments), igual que ya hace recent_activity con la
-- actividad general. Lo único nuevo de verdad es "notifications_seen_at"
-- en profiles: UN solo timestamp por persona, no una fila por
-- notificación — abrir la campana marca todo lo visto de una, como ya
-- hace Instagram con el corazón (no hay "marcar como leída" una por una).

alter table public.profiles add column if not exists notifications_seen_at timestamptz;

create function public.notifications_feed(limit_count int default 30)
returns table (
  kind text, source_id uuid, created_at timestamptz,
  actor_id uuid, actor_name text, actor_avatar_url text,
  club_id uuid, club_name text, chapter_id uuid, post_id uuid,
  preview text
)
language sql security definer stable set search_path = public
as $$
  select kind, source_id, created_at, actor_id, actor_name, actor_avatar_url,
         club_id, club_name, chapter_id, post_id, preview
    from (
      -- alguien empezó a seguirte
      select 'follow'::text as kind, f.follower_id as source_id, f.created_at,
             f.follower_id as actor_id, p.display_name as actor_name, p.avatar_url as actor_avatar_url,
             null::uuid as club_id, null::text as club_name, null::uuid as chapter_id, null::uuid as post_id,
             null::text as preview
        from follows f
        join profiles p on p.id = f.follower_id
       where f.followed_id = auth.uid()

      union all

      -- le pusieron "me gusta" a un comentario/cita/reseña tuyo
      select 'like_comment', cl.id, cl.created_at,
             cl.profile_id, p.display_name, p.avatar_url,
             cb.club_id, clb.name, c.chapter_id, null::uuid,
             coalesce(c.title, c.body, c.voice_transcript, 'tu comentario')
        from comment_likes cl
        join comments c on c.id = cl.comment_id
        join club_books cb on cb.id = c.club_book_id
        join clubs clb on clb.id = cb.club_id
        join profiles p on p.id = cl.profile_id
       where c.profile_id = auth.uid() and cl.profile_id <> auth.uid()

      union all

      -- le pusieron "me gusta" a una foto tuya
      select 'like_post', pl.id, pl.created_at,
             pl.profile_id, p.display_name, p.avatar_url,
             null::uuid, null::text, null::uuid, pl.post_id,
             po.caption
        from post_likes pl
        join posts po on po.id = pl.post_id
        join profiles p on p.id = pl.profile_id
       where po.profile_id = auth.uid() and pl.profile_id <> auth.uid()

      union all

      -- te respondieron un comentario/cita/reseña
      select 'reply', r.id, r.created_at,
             r.profile_id, p.display_name, p.avatar_url,
             cb.club_id, clb.name, r.chapter_id, null::uuid,
             r.body
        from comments r
        join comments original on original.id = r.parent_comment_id
        join club_books cb on cb.id = r.club_book_id
        join clubs clb on clb.id = cb.club_id
        join profiles p on p.id = r.profile_id
       where original.profile_id = auth.uid() and r.profile_id <> auth.uid()

      union all

      -- te comentaron una foto
      select 'post_comment', pc.id, pc.created_at,
             pc.profile_id, p.display_name, p.avatar_url,
             null::uuid, null::text, null::uuid, pc.post_id,
             pc.body
        from post_comments pc
        join posts po on po.id = pc.post_id
        join profiles p on p.id = pc.profile_id
       where po.profile_id = auth.uid() and pc.profile_id <> auth.uid()
    ) events
   order by created_at desc
   limit limit_count;
$$;

revoke all on function public.notifications_feed(int) from public;
grant execute on function public.notifications_feed(int) to authenticated;
