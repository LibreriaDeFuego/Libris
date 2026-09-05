-- Libris — migración 041: foto o GIF opcional al comentar un capítulo.
--
-- "Comentario" (NewCommentForm, kind = 'text') era puro texto — se agrega
-- una imagen opcional. A diferencia de "quote-cards" (público, pensado
-- para compartir en Instagram) o "post-photos" (público, fotos de Perfil),
-- esto vive en un bucket PRIVADO: es una conversación de adentro de un
-- club, mismo criterio que ya usan las notas de voz (voice-notes,
-- migración 005). "comments.image_url" guarda el PATH del archivo, no una
-- URL — se firma recién al leerla (src/lib/commentPhotos.js), tanto en
-- Comentarios del club como en Inicio/Perfil si ese comentario se
-- compartió al feed con una foto puesta.

-- ============================================================
-- 1. Columna + bucket
-- ============================================================
alter table public.comments add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comment-photos', 'comment-photos', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- Path: "<club_book_id>/<profile_id>/<archivo>" — el primer segmento es
-- para el chequeo de membresía (leer/subir, igual que voice-notes), el
-- segundo para el de dueño (borrar, igual que post-photos/quote-cards).
create policy "miembros ven las fotos de comentarios de su club"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'comment-photos'
    and exists (
      select 1 from public.club_books cb
      where cb.id::text = (storage.foldername(name))[1]
        and public.is_club_member(cb.club_id)
    )
  );

create policy "miembros suben fotos a comentarios de su club"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comment-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.club_books cb
      where cb.id::text = (storage.foldername(name))[1]
        and public.is_club_member(cb.club_id)
    )
  );

create policy "cada quien borra sus propias fotos de comentarios"
  on storage.objects for delete to authenticated
  using (bucket_id = 'comment-photos' and (storage.foldername(name))[2] = auth.uid()::text);

-- ============================================================
-- 2. profile_activity y recent_activity: "image_url" nuevo, junto a
--    photo_url — null salvo en un comentario de texto que lo tenga puesto.
--    Sigue el mismo path guardado (sin firmar): quien llama a estas
--    funciones (los page.js de Inicio/Perfil) lo firma después, con
--    signCommentImageUrls.
-- ============================================================
drop function if exists public.profile_activity(uuid, int);

create function public.profile_activity(target_profile_id uuid, limit_count int default 20)
returns table (
  id uuid, kind text, title text, body text, voice_transcript text, created_at timestamptz,
  profile_id uuid, display_name text, avatar_url text,
  club_id uuid, club_name text, chapter_id uuid,
  book_title text, book_author text, book_cover_url text, photo_url text, image_url text,
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
         club_id, club_name, chapter_id, book_title, book_author, book_cover_url, photo_url, image_url,
         quote_style, quote_image_url, like_count, liked_by_me, replies,
         repost_count, reposted_by_me, is_repost, repost_id,
         reposted_by_id, reposted_by_name, reposted_by_avatar
    from (
      -- comentarios/citas/reseñas propios (siempre orgánico: es tu perfil)
      select c.id, c.kind, c.title, c.body, c.voice_transcript, c.created_at,
             c.profile_id, p.display_name, p.avatar_url,
             cl.id as club_id, cl.name as club_name, c.chapter_id,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.image_url, c.quote_style, c.quote_image_url,
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
             p.image_url as photo_url, null::text as image_url, null::text as quote_style, null::text as quote_image_url,
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
      -- cualquier autor, elegibles para el feed)
      select c.id, c.kind, c.title, c.body, c.voice_transcript, rp.created_at,
             c.profile_id, p.display_name, p.avatar_url,
             cl.id as club_id, cl.name as club_name, c.chapter_id,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.image_url, c.quote_style, c.quote_image_url,
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
      -- fotos que target_profile_id reposteó
      select p.id, 'photo'::text as kind, null::text as title, p.caption as body, null::text as voice_transcript, rp.created_at,
             p.profile_id, pf.display_name, pf.avatar_url,
             null::uuid as club_id, null::text as club_name, null::uuid as chapter_id,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             p.image_url as photo_url, null::text as image_url, null::text as quote_style, null::text as quote_image_url,
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
  photo_url text, image_url text, quote_style text, quote_image_url text,
  like_count int, liked_by_me boolean, replies jsonb,
  repost_count int, reposted_by_me boolean,
  is_repost boolean, repost_id uuid,
  reposted_by_id uuid, reposted_by_name text, reposted_by_avatar text
)
language sql security definer stable set search_path = public
as $$
  select id, kind, title, body, created_at, profile_id, display_name, avatar_url,
         club_id, club_name, chapter_id, book_title, book_author, book_cover_url, photo_url, image_url,
         quote_style, quote_image_url, like_count, liked_by_me, replies,
         repost_count, reposted_by_me, is_repost, repost_id,
         reposted_by_id, reposted_by_name, reposted_by_avatar
    from (
      -- comentarios/citas/reseñas, publicados de forma orgánica
      select c.id, c.kind, c.title, c.body, c.created_at,
             c.profile_id, p.display_name, p.avatar_url,
             cl.id as club_id, cl.name as club_name, c.chapter_id,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.image_url, c.quote_style, c.quote_image_url,
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
             po.image_url as photo_url, null::text as image_url, null::text as quote_style, null::text as quote_image_url,
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
             null::text as photo_url, c.image_url, c.quote_style, c.quote_image_url,
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
             po.image_url as photo_url, null::text as image_url, null::text as quote_style, null::text as quote_image_url,
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
