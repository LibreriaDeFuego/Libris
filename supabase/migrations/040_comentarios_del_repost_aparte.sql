-- Libris — migración 040: los comentarios que alguien deja en TU repost no
-- se mezclan con los comentarios del post ORIGINAL.
--
-- Hasta la migración 039, "me gusta"/comentar de una tarjeta reposteada
-- apuntaban siempre al contenido original (activity.id es siempre el id
-- original) — a propósito, para no duplicar el hilo. El problema: si
-- alguien comentaba DESDE un repost, ese comentario quedaba colgando del
-- comentario/cita/reseña original con un parent_comment_id normal, así que
-- aparecía en TODOS lados donde se ve el original — incluida la pantalla
-- de Comentarios del club de la persona dueña del contenido, que nunca
-- reposteó nada. Se pidió que un comentario hecho "sobre mi repost" viva
-- solo ahí, no en la publicación de quien la escribió originalmente.
--
-- La solución: una columna "repost_id" (nullable) en "comments" y en
-- "post_comments" — null es un comentario normal (como siempre); con
-- valor, el comentario está scopeado a ESE repost puntual, no al contenido
-- en general. Cada repost tiene ahora su propio hilo, separado tanto del
-- original como de cualquier OTRO repost del mismo contenido.

-- ============================================================
-- 1. Columna nueva
-- ============================================================
alter table public.comments add column if not exists repost_id uuid references public.reposts(id) on delete cascade;
alter table public.post_comments add column if not exists repost_id uuid references public.reposts(id) on delete cascade;

-- Borrar el repost (dejar de compartir) se lleva puesto lo que se
-- comentó ahí — no tiene sentido dejarlos huérfanos, apuntando a un
-- repost que ya no existe: "on delete cascade" arriba se encarga.

-- ============================================================
-- 2. Quién puede postear un comentario con repost_id
-- ============================================================
-- Mismo problema que ya resolvió can_repost_comment en la migración 039:
-- la política de insert de "comments" exige ser miembro del club
-- (is_club_member), pero un repost puede mostrarse en Inicio a cualquiera,
-- sea miembro o no (club público). Sin este chequeo aparte, alguien podría
-- ver un repost en su feed pero no poder comentarlo. can_comment_on_repost
-- aplica la misma regla de visibilidad que ya usan recent_activity/
-- profile_activity para la rama "reposteado" — cualquiera que pueda VER el
-- repost puede comentarlo, sea o no quien lo compartió.
create or replace function public.can_comment_on_repost(target_repost_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.reposts rp
    left join public.comments c on c.id = rp.comment_id
    left join public.club_books cb on cb.id = c.club_book_id
    left join public.clubs cl on cl.id = cb.club_id
    where rp.id = target_repost_id
      and (
        rp.post_id is not null
        or (
          c.id is not null
          and not c.is_spoiler
          and (c.kind in ('quote', 'review') or (c.kind in ('text', 'voice') and c.shared_to_feed))
          and (cl.join_mode <> 'invite' or public.is_club_member(cl.id))
        )
      )
  );
$$;

drop policy if exists "members post comments in their clubs" on public.comments;
create policy "members post comments in their clubs"
  on public.comments for insert
  with check (
    profile_id = auth.uid()
    and (
      (repost_id is null and exists (
        select 1 from public.club_books cb
        where cb.id = club_book_id and public.is_club_member(cb.club_id)
      ))
      or (repost_id is not null and public.can_comment_on_repost(repost_id))
    )
  );

drop policy if exists "cada quien publica sus propios comentarios en fotos" on public.post_comments;
create policy "cada quien publica sus propios comentarios en fotos"
  on public.post_comments for insert to authenticated
  with check (
    profile_id = auth.uid()
    and (repost_id is null or public.can_comment_on_repost(repost_id))
  );

-- postReply (clubs.js) necesita leer club_book_id/chapter_id del
-- comentario ORIGINAL para heredarlos en la respuesta — antes lo hacía
-- con un select directo a "comments", sujeto a su RLS de siempre (exige
-- ser miembro del club). Mismo problema de fondo que arriba: alguien
-- puede responder al repost de una cita de un club público sin ser
-- miembro de ese club. Este lookup es solo un dato estructural (a qué
-- libro/capítulo pertenece), no contenido — se resuelve sin pasar por ese
-- RLS; la autorización real de verdad sigue viviendo en la política de
-- insert de arriba, no acá.
create or replace function public.get_comment_context(target_comment_id uuid)
returns table (club_book_id uuid, chapter_id uuid)
language sql
security definer
stable
as $$
  select club_book_id, chapter_id from public.comments where id = target_comment_id;
$$;

revoke all on function public.get_comment_context(uuid) from public;
grant execute on function public.get_comment_context(uuid) to authenticated;

-- ============================================================
-- 3. profile_activity y recent_activity: cada rama solo trae SU propio
--    hilo — repost_id is null para el contenido orgánico, repost_id = el
--    repost puntual (rp.id) para cada rama reposteada.
-- ============================================================
drop function if exists public.profile_activity(uuid, int);

create function public.profile_activity(target_profile_id uuid, limit_count int default 20)
returns table (
  id uuid, kind text, title text, body text, voice_transcript text, created_at timestamptz,
  profile_id uuid, display_name text, avatar_url text,
  club_id uuid, club_name text, chapter_id uuid,
  book_title text, book_author text, book_cover_url text, photo_url text,
  quote_style text, quote_image_url text,
  like_count int, liked_by_me boolean, replies jsonb,
  repost_count int, reposted_by_me boolean,
  is_repost boolean, repost_id uuid,
  reposted_by_id uuid, reposted_by_name text, reposted_by_avatar text
)
language sql security definer stable set search_path = public
as $$
  select id, kind, title, body, voice_transcript, created_at,
         profile_id, display_name, avatar_url,
         club_id, club_name, chapter_id, book_title, book_author, book_cover_url, photo_url,
         quote_style, quote_image_url, like_count, liked_by_me, replies,
         repost_count, reposted_by_me, is_repost, repost_id,
         reposted_by_id, reposted_by_name, reposted_by_avatar
    from (
      -- comentarios/citas/reseñas propios (siempre orgánico: es tu perfil)
      select c.id, c.kind, c.title, c.body, c.voice_transcript, c.created_at,
             c.profile_id, p.display_name, p.avatar_url,
             cl.id as club_id, cl.name as club_name, c.chapter_id,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.quote_style, c.quote_image_url,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             coalesce(reps.replies, '[]'::jsonb) as replies,
             coalesce(rp.repost_count, 0) as repost_count, coalesce(rp.reposted_by_me, false) as reposted_by_me,
             false as is_repost, null::uuid as repost_id,
             null::uuid as reposted_by_id, null::text as reposted_by_name, null::text as reposted_by_avatar
        from comments c
        join profiles p on p.id = c.profile_id
        join club_books cb on cb.id = c.club_book_id
        join clubs cl on cl.id = cb.club_id
        join books b on b.id = cb.book_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from comment_likes where comment_id = c.id
        ) cnt on true
        left join lateral (
          select jsonb_agg(jsonb_build_object(
                   'id', r.id, 'body', r.body, 'created_at', r.created_at, 'reply_to_id', r.reply_to_id,
                   'profiles', jsonb_build_object('display_name', rp2.display_name),
                   'like_count', coalesce(rl.like_count, 0), 'liked_by_me', coalesce(rl.liked_by_me, false)
                 ) order by r.created_at) as replies
            from comments r
            join profiles rp2 on rp2.id = r.profile_id
            left join lateral (
              select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
                from comment_likes where comment_id = r.id
            ) rl on true
           where r.parent_comment_id = c.id and r.repost_id is null
        ) reps on true
        left join lateral (
          select count(*)::int as repost_count, bool_or(profile_id = auth.uid()) as reposted_by_me
            from reposts where comment_id = c.id
        ) rp on true
       where c.profile_id = target_profile_id
         and not c.is_spoiler
         and c.parent_comment_id is null
         and (
           target_profile_id = auth.uid()
           or cl.join_mode <> 'invite'
           or exists (select 1 from club_members m where m.club_id = cl.id and m.profile_id = auth.uid())
         )
      union all
      -- fotos propias (siempre orgánico)
      select p.id, 'photo'::text as kind, null::text as title, p.caption as body, null::text as voice_transcript, p.created_at,
             p.profile_id, pf.display_name, pf.avatar_url,
             null::uuid as club_id, null::text as club_name, null::uuid as chapter_id,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             p.image_url as photo_url, null::text as quote_style, null::text as quote_image_url,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             coalesce(pcs.replies, '[]'::jsonb) as replies,
             coalesce(rp.repost_count, 0) as repost_count, coalesce(rp.reposted_by_me, false) as reposted_by_me,
             false as is_repost, null::uuid as repost_id,
             null::uuid as reposted_by_id, null::text as reposted_by_name, null::text as reposted_by_avatar
        from posts p
        join profiles pf on pf.id = p.profile_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from post_likes where post_id = p.id
        ) cnt on true
        left join lateral (
          select jsonb_agg(jsonb_build_object(
                   'id', pc.id, 'body', pc.body, 'created_at', pc.created_at,
                   'profiles', jsonb_build_object('display_name', pcp.display_name)
                 ) order by pc.created_at) as replies
            from post_comments pc
            join profiles pcp on pcp.id = pc.profile_id
           where pc.post_id = p.id and pc.repost_id is null
        ) pcs on true
        left join lateral (
          select count(*)::int as repost_count, bool_or(profile_id = auth.uid()) as reposted_by_me
            from reposts where post_id = p.id
        ) rp on true
       where p.profile_id = target_profile_id
      union all
      -- comentarios/citas/reseñas que target_profile_id reposteó (de
      -- cualquier autor, elegibles para el feed) — "reps" acá solo trae
      -- las respuestas scopeadas a ESTE repost puntual (r.repost_id =
      -- rp.id), no las del hilo original.
      select c.id, c.kind, c.title, c.body, c.voice_transcript, rp.created_at,
             c.profile_id, p.display_name, p.avatar_url,
             cl.id as club_id, cl.name as club_name, c.chapter_id,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.quote_style, c.quote_image_url,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             coalesce(reps.replies, '[]'::jsonb) as replies,
             coalesce(rc.repost_count, 0) as repost_count, coalesce(rc.reposted_by_me, false) as reposted_by_me,
             true as is_repost, rp.id as repost_id,
             rp.profile_id as reposted_by_id, rpp.display_name as reposted_by_name, rpp.avatar_url as reposted_by_avatar
        from reposts rp
        join comments c on c.id = rp.comment_id
        join profiles rpp on rpp.id = rp.profile_id
        join profiles p on p.id = c.profile_id
        join club_books cb on cb.id = c.club_book_id
        join clubs cl on cl.id = cb.club_id
        join books b on b.id = cb.book_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from comment_likes where comment_id = c.id
        ) cnt on true
        left join lateral (
          select jsonb_agg(jsonb_build_object(
                   'id', r.id, 'body', r.body, 'created_at', r.created_at, 'reply_to_id', r.reply_to_id,
                   'profiles', jsonb_build_object('display_name', rp2.display_name),
                   'like_count', coalesce(rl.like_count, 0), 'liked_by_me', coalesce(rl.liked_by_me, false)
                 ) order by r.created_at) as replies
            from comments r
            join profiles rp2 on rp2.id = r.profile_id
            left join lateral (
              select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
                from comment_likes where comment_id = r.id
            ) rl on true
           where r.parent_comment_id = c.id and r.repost_id = rp.id
        ) reps on true
        left join lateral (
          select count(*)::int as repost_count, bool_or(profile_id = auth.uid()) as reposted_by_me
            from reposts where comment_id = c.id
        ) rc on true
       where rp.profile_id = target_profile_id
         and not c.is_spoiler
         and c.parent_comment_id is null
         and (c.kind in ('quote', 'review') or (c.kind in ('text', 'voice') and c.shared_to_feed))
         and (
           target_profile_id = auth.uid()
           or cl.join_mode <> 'invite'
           or exists (select 1 from club_members m where m.club_id = cl.id and m.profile_id = auth.uid())
         )
      union all
      -- fotos que target_profile_id reposteó — mismo criterio, "pcs" solo
      -- trae los comentarios scopeados a este repost.
      select p.id, 'photo'::text as kind, null::text as title, p.caption as body, null::text as voice_transcript, rp.created_at,
             p.profile_id, pf.display_name, pf.avatar_url,
             null::uuid as club_id, null::text as club_name, null::uuid as chapter_id,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             p.image_url as photo_url, null::text as quote_style, null::text as quote_image_url,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             coalesce(pcs.replies, '[]'::jsonb) as replies,
             coalesce(rc.repost_count, 0) as repost_count, coalesce(rc.reposted_by_me, false) as reposted_by_me,
             true as is_repost, rp.id as repost_id,
             rp.profile_id as reposted_by_id, rpp.display_name as reposted_by_name, rpp.avatar_url as reposted_by_avatar
        from reposts rp
        join posts p on p.id = rp.post_id
        join profiles rpp on rpp.id = rp.profile_id
        join profiles pf on pf.id = p.profile_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from post_likes where post_id = p.id
        ) cnt on true
        left join lateral (
          select jsonb_agg(jsonb_build_object(
                   'id', pc.id, 'body', pc.body, 'created_at', pc.created_at,
                   'profiles', jsonb_build_object('display_name', pcp.display_name)
                 ) order by pc.created_at) as replies
            from post_comments pc
            join profiles pcp on pcp.id = pc.profile_id
           where pc.post_id = p.id and pc.repost_id = rp.id
        ) pcs on true
        left join lateral (
          select count(*)::int as repost_count, bool_or(profile_id = auth.uid()) as reposted_by_me
            from reposts where post_id = p.id
        ) rc on true
       where rp.profile_id = target_profile_id
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
  club_id uuid, club_name text, chapter_id uuid,
  book_title text, book_author text, book_cover_url text,
  photo_url text, quote_style text, quote_image_url text,
  like_count int, liked_by_me boolean, replies jsonb,
  repost_count int, reposted_by_me boolean,
  is_repost boolean, repost_id uuid,
  reposted_by_id uuid, reposted_by_name text, reposted_by_avatar text
)
language sql security definer stable set search_path = public
as $$
  select id, kind, title, body, created_at, profile_id, display_name, avatar_url,
         club_id, club_name, chapter_id, book_title, book_author, book_cover_url, photo_url,
         quote_style, quote_image_url, like_count, liked_by_me, replies,
         repost_count, reposted_by_me, is_repost, repost_id,
         reposted_by_id, reposted_by_name, reposted_by_avatar
    from (
      -- comentarios/citas/reseñas, publicados de forma orgánica
      select c.id, c.kind, c.title, c.body, c.created_at,
             c.profile_id, p.display_name, p.avatar_url,
             cl.id as club_id, cl.name as club_name, c.chapter_id,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.quote_style, c.quote_image_url,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             coalesce(reps.replies, '[]'::jsonb) as replies,
             coalesce(rp.repost_count, 0) as repost_count, coalesce(rp.reposted_by_me, false) as reposted_by_me,
             false as is_repost, null::uuid as repost_id,
             null::uuid as reposted_by_id, null::text as reposted_by_name, null::text as reposted_by_avatar
        from comments c
        join profiles p on p.id = c.profile_id
        join club_books cb on cb.id = c.club_book_id
        join clubs cl on cl.id = cb.club_id
        join books b on b.id = cb.book_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from comment_likes where comment_id = c.id
        ) cnt on true
        left join lateral (
          select jsonb_agg(jsonb_build_object(
                   'id', r.id, 'body', r.body, 'created_at', r.created_at, 'reply_to_id', r.reply_to_id,
                   'profiles', jsonb_build_object('display_name', rp2.display_name),
                   'like_count', coalesce(rl.like_count, 0), 'liked_by_me', coalesce(rl.liked_by_me, false)
                 ) order by r.created_at) as replies
            from comments r
            join profiles rp2 on rp2.id = r.profile_id
            left join lateral (
              select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
                from comment_likes where comment_id = r.id
            ) rl on true
           where r.parent_comment_id = c.id and r.repost_id is null
        ) reps on true
        left join lateral (
          select count(*)::int as repost_count, bool_or(profile_id = auth.uid()) as reposted_by_me
            from reposts where comment_id = c.id
        ) rp on true
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
      -- fotos, publicadas de forma orgánica
      select po.id, 'photo'::text as kind, null::text as title, po.caption as body, po.created_at,
             po.profile_id, p.display_name, p.avatar_url,
             null::uuid as club_id, null::text as club_name, null::uuid as chapter_id,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             po.image_url as photo_url, null::text as quote_style, null::text as quote_image_url,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             coalesce(pcs.replies, '[]'::jsonb) as replies,
             coalesce(rp.repost_count, 0) as repost_count, coalesce(rp.reposted_by_me, false) as reposted_by_me,
             false as is_repost, null::uuid as repost_id,
             null::uuid as reposted_by_id, null::text as reposted_by_name, null::text as reposted_by_avatar
        from posts po
        join profiles p on p.id = po.profile_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from post_likes where post_id = po.id
        ) cnt on true
        left join lateral (
          select jsonb_agg(jsonb_build_object(
                   'id', pc.id, 'body', pc.body, 'created_at', pc.created_at,
                   'profiles', jsonb_build_object('display_name', pcp.display_name)
                 ) order by pc.created_at) as replies
            from post_comments pc
            join profiles pcp on pcp.id = pc.profile_id
           where pc.post_id = po.id and pc.repost_id is null
        ) pcs on true
        left join lateral (
          select count(*)::int as repost_count, bool_or(profile_id = auth.uid()) as reposted_by_me
            from reposts where post_id = po.id
        ) rp on true
      union all
      -- comentarios/citas/reseñas, reposteados por otra persona
      select c.id, c.kind, c.title, c.body, rp.created_at,
             c.profile_id, p.display_name, p.avatar_url,
             cl.id as club_id, cl.name as club_name, c.chapter_id,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.quote_style, c.quote_image_url,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             coalesce(reps.replies, '[]'::jsonb) as replies,
             coalesce(rc.repost_count, 0) as repost_count, coalesce(rc.reposted_by_me, false) as reposted_by_me,
             true as is_repost, rp.id as repost_id,
             rp.profile_id as reposted_by_id, rpp.display_name as reposted_by_name, rpp.avatar_url as reposted_by_avatar
        from reposts rp
        join comments c on c.id = rp.comment_id
        join profiles rpp on rpp.id = rp.profile_id
        join profiles p on p.id = c.profile_id
        join club_books cb on cb.id = c.club_book_id
        join clubs cl on cl.id = cb.club_id
        join books b on b.id = cb.book_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from comment_likes where comment_id = c.id
        ) cnt on true
        left join lateral (
          select jsonb_agg(jsonb_build_object(
                   'id', r.id, 'body', r.body, 'created_at', r.created_at, 'reply_to_id', r.reply_to_id,
                   'profiles', jsonb_build_object('display_name', rp2.display_name),
                   'like_count', coalesce(rl.like_count, 0), 'liked_by_me', coalesce(rl.liked_by_me, false)
                 ) order by r.created_at) as replies
            from comments r
            join profiles rp2 on rp2.id = r.profile_id
            left join lateral (
              select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
                from comment_likes where comment_id = r.id
            ) rl on true
           where r.parent_comment_id = c.id and r.repost_id = rp.id
        ) reps on true
        left join lateral (
          select count(*)::int as repost_count, bool_or(profile_id = auth.uid()) as reposted_by_me
            from reposts where comment_id = c.id
        ) rc on true
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
      -- fotos, reposteadas por otra persona
      select po.id, 'photo'::text as kind, null::text as title, po.caption as body, rp.created_at,
             po.profile_id, p.display_name, p.avatar_url,
             null::uuid as club_id, null::text as club_name, null::uuid as chapter_id,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             po.image_url as photo_url, null::text as quote_style, null::text as quote_image_url,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             coalesce(pcs.replies, '[]'::jsonb) as replies,
             coalesce(rc.repost_count, 0) as repost_count, coalesce(rc.reposted_by_me, false) as reposted_by_me,
             true as is_repost, rp.id as repost_id,
             rp.profile_id as reposted_by_id, rpp.display_name as reposted_by_name, rpp.avatar_url as reposted_by_avatar
        from reposts rp
        join posts po on po.id = rp.post_id
        join profiles rpp on rpp.id = rp.profile_id
        join profiles p on p.id = po.profile_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from post_likes where post_id = po.id
        ) cnt on true
        left join lateral (
          select jsonb_agg(jsonb_build_object(
                   'id', pc.id, 'body', pc.body, 'created_at', pc.created_at,
                   'profiles', jsonb_build_object('display_name', pcp.display_name)
                 ) order by pc.created_at) as replies
            from post_comments pc
            join profiles pcp on pcp.id = pc.profile_id
           where pc.post_id = po.id and pc.repost_id = rp.id
        ) pcs on true
        left join lateral (
          select count(*)::int as repost_count, bool_or(profile_id = auth.uid()) as reposted_by_me
            from reposts where post_id = po.id
        ) rc on true
    ) combined
   order by created_at desc
   limit limit_count;
$$;

revoke all on function public.recent_activity(int) from public;
grant execute on function public.recent_activity(int) to authenticated;

-- ============================================================
-- 4. notifications_feed: un comentario scopeado a un repost ya no avisa
--    a quien escribió el original — no es una respuesta a SU publicación,
--    es un comentario dentro del repost de otra persona.
-- ============================================================
-- Queda pendiente, a propósito, avisarle a quien reposteó que alguien le
-- comentó "lo que compartió" — no se pidió, y es una notificación nueva
-- de verdad (un kind más), no un ajuste de esta. Por ahora, ese comentario
-- no le avisa a nadie; ver README.
drop function if exists public.notifications_feed(int);

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

      -- te respondieron un comentario/cita/reseña — repost_id is null:
      -- si el comentario vive scopeado a un repost de otra persona, no es
      -- una respuesta a TU publicación (ver punto 4 más arriba).
      select 'reply', r.id, r.created_at,
             r.profile_id, p.display_name, p.avatar_url,
             cb.club_id, clb.name, r.chapter_id, null::uuid,
             r.body
        from comments r
        join comments original on original.id = r.parent_comment_id
        join club_books cb on cb.id = r.club_book_id
        join clubs clb on clb.id = cb.club_id
        join profiles p on p.id = r.profile_id
       where original.profile_id = auth.uid() and r.profile_id <> auth.uid() and r.repost_id is null

      union all

      -- te comentaron una foto — mismo criterio, repost_id is null.
      select 'post_comment', pc.id, pc.created_at,
             pc.profile_id, p.display_name, p.avatar_url,
             null::uuid, null::text, null::uuid, pc.post_id,
             pc.body
        from post_comments pc
        join posts po on po.id = pc.post_id
        join profiles p on p.id = pc.profile_id
       where po.profile_id = auth.uid() and pc.profile_id <> auth.uid() and pc.repost_id is null
    ) events
   order by created_at desc
   limit limit_count;
$$;

revoke all on function public.notifications_feed(int) from public;
grant execute on function public.notifications_feed(int) to authenticated;
