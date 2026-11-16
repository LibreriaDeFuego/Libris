-- Libris — migración 066: lo que se habla en un club (comentarios, citas
-- de capítulo, reseñas) deja de aparecer en Inicio o en el Perfil de
-- nadie — ni publicado "orgánico" ni reposteado. Hasta ahora, toda cita o
-- reseña de capítulo se publicaba sola en el feed (sin que nadie la
-- compartiera a propósito), y un comentario de texto/voz podía sumarse
-- con el interruptor "compartir" de cada uno (shared_to_feed, migración
-- 031) — y cualquiera de los tres se podía además repostear al feed de
-- otra persona. Pedido explícito: nada de un club sale de ahí, sin
-- excepción — ni lo automático ni un reposteo a mano.
--
-- Se sacan del todo las dos secciones que traían filas desde "comments"
-- (las propias y las reposteadas) de recent_activity y profile_activity —
-- lo demás (fotos/texto/voz del perfil y citas de perfil, propias y
-- reposteadas) sigue exactamente igual. La firma de las dos funciones no
-- cambia, así que alcanza con create or replace — ninguna columna se
-- agrega ni se saca.
--
-- El interruptor "compartir" de cada comentario (shared_to_feed) y el
-- botón de repostear ya no tienen ningún efecto visible después de esto
-- — se sacan de la pantalla en el mismo commit que esta migración
-- (ComentariosScreen, EngagementBlock, ShareButton, toggleShareToFeed).
-- La columna shared_to_feed en "comments" queda tal cual, sin usarse —
-- no vale la pena una migración aparte solo para borrar una columna que
-- ya no lee nadie.

create or replace function public.profile_activity(target_profile_id uuid, limit_count int default 20)
returns table (
  id uuid, kind text, title text, body text, voice_transcript text, created_at timestamptz,
  profile_id uuid, display_name text, avatar_url text,
  club_id uuid, club_name text, chapter_id uuid,
  book_title text, book_author text, book_cover_url text, photo_url text, image_urls jsonb,
  voice_url text, voice_duration_seconds int,
  quote_style text, quote_image_url text, card_style text, card_color text,
  like_count int, liked_by_me boolean, replies jsonb,
  repost_count int, reposted_by_me boolean,
  is_repost boolean, repost_id uuid,
  reposted_by_id uuid, reposted_by_name text, reposted_by_avatar text,
  is_current_book boolean, club_book_id uuid
)
language sql security definer stable set search_path = public
as $$
  select id, kind, title, body, voice_transcript, created_at,
         profile_id, display_name, avatar_url,
         club_id, club_name, chapter_id, book_title, book_author, book_cover_url, photo_url, image_urls,
         voice_url, voice_duration_seconds,
         quote_style, quote_image_url, card_style, card_color, like_count, liked_by_me, replies,
         repost_count, reposted_by_me, is_repost, repost_id,
         reposted_by_id, reposted_by_name, reposted_by_avatar, is_current_book, club_book_id
    from (
      -- fotos/texto/voz propios del perfil (siempre orgánico)
      select p.id, 'photo'::text as kind, null::text as title, p.caption as body, p.voice_transcript, p.created_at,
             p.profile_id, pf.display_name, pf.avatar_url,
             null::uuid as club_id, null::text as club_name, null::uuid as chapter_id,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             p.image_url as photo_url, null::jsonb as image_urls,
             p.voice_url, p.voice_duration_seconds,
             null::text as quote_style, null::text as quote_image_url,
             null::text as card_style, null::text as card_color,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             coalesce(pcs.replies, '[]'::jsonb) as replies,
             coalesce(rp.repost_count, 0) as repost_count, coalesce(rp.reposted_by_me, false) as reposted_by_me,
             false as is_repost, null::uuid as repost_id,
             null::uuid as reposted_by_id, null::text as reposted_by_name, null::text as reposted_by_avatar,
             true as is_current_book, null::uuid as club_book_id
        from posts p
        join profiles pf on pf.id = p.profile_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from post_likes where post_id = p.id
        ) cnt on true
        left join lateral (
          select jsonb_agg(jsonb_build_object(
                   'id', pc.id, 'body', pc.body, 'created_at', pc.created_at,
                   'profiles', jsonb_build_object('display_name', pcp.display_name, 'avatar_url', pcp.avatar_url)
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
      -- citas propias del perfil (migración 049) — sin hilo de respuestas
      -- ni repost, solo "me gusta".
      select q.id, 'quote'::text as kind, null::text as title, q.quote_text as body, null::text as voice_transcript, q.created_at,
             q.profile_id, pf.display_name, pf.avatar_url,
             null::uuid as club_id, null::text as club_name, null::uuid as chapter_id,
             q.book_title, q.book_author, q.book_cover_url,
             null::text as photo_url, '[]'::jsonb as image_urls,
             null::text as voice_url, null::int as voice_duration_seconds,
             null::text as quote_style, null::text as quote_image_url,
             q.card_style, q.card_color,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             '[]'::jsonb as replies,
             0 as repost_count, false as reposted_by_me,
             false as is_repost, null::uuid as repost_id,
             null::uuid as reposted_by_id, null::text as reposted_by_name, null::text as reposted_by_avatar,
             true as is_current_book, null::uuid as club_book_id
        from profile_quotes q
        join profiles pf on pf.id = q.profile_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from profile_quote_likes where quote_id = q.id
        ) cnt on true
       where q.profile_id = target_profile_id
      union all
      -- fotos/texto/voz que target_profile_id reposteó
      select p.id, 'photo'::text as kind, null::text as title, p.caption as body, p.voice_transcript, rp.created_at,
             p.profile_id, pf.display_name, pf.avatar_url,
             null::uuid as club_id, null::text as club_name, null::uuid as chapter_id,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             p.image_url as photo_url, null::jsonb as image_urls,
             p.voice_url, p.voice_duration_seconds,
             null::text as quote_style, null::text as quote_image_url,
             null::text as card_style, null::text as card_color,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             coalesce(pcs.replies, '[]'::jsonb) as replies,
             coalesce(rc.repost_count, 0) as repost_count, coalesce(rc.reposted_by_me, false) as reposted_by_me,
             true as is_repost, rp.id as repost_id,
             rp.profile_id as reposted_by_id, rpp.display_name as reposted_by_name, rpp.avatar_url as reposted_by_avatar,
             true as is_current_book, null::uuid as club_book_id
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
                   'profiles', jsonb_build_object('display_name', pcp.display_name, 'avatar_url', pcp.avatar_url)
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

create or replace function public.recent_activity(limit_count int default 30)
returns table (
  id uuid, kind text, title text, body text, voice_transcript text, created_at timestamptz,
  profile_id uuid, display_name text, avatar_url text,
  club_id uuid, club_name text, chapter_id uuid,
  book_title text, book_author text, book_cover_url text,
  photo_url text, image_urls jsonb,
  voice_url text, voice_duration_seconds int,
  quote_style text, quote_image_url text,
  card_style text, card_color text,
  like_count int, liked_by_me boolean, replies jsonb,
  repost_count int, reposted_by_me boolean,
  is_repost boolean, repost_id uuid,
  reposted_by_id uuid, reposted_by_name text, reposted_by_avatar text,
  is_current_book boolean, club_book_id uuid
)
language sql security definer stable set search_path = public
as $$
  select id, kind, title, body, voice_transcript, created_at, profile_id, display_name, avatar_url,
         club_id, club_name, chapter_id, book_title, book_author, book_cover_url, photo_url, image_urls,
         voice_url, voice_duration_seconds,
         quote_style, quote_image_url, card_style, card_color, like_count, liked_by_me, replies,
         repost_count, reposted_by_me, is_repost, repost_id,
         reposted_by_id, reposted_by_name, reposted_by_avatar, is_current_book, club_book_id
    from (
      -- fotos/texto/voz, publicados de forma orgánica
      select po.id, 'photo'::text as kind, null::text as title, po.caption as body, po.voice_transcript, po.created_at,
             po.profile_id, p.display_name, p.avatar_url,
             null::uuid as club_id, null::text as club_name, null::uuid as chapter_id,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             po.image_url as photo_url, null::jsonb as image_urls,
             po.voice_url, po.voice_duration_seconds,
             null::text as quote_style, null::text as quote_image_url,
             null::text as card_style, null::text as card_color,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             coalesce(pcs.replies, '[]'::jsonb) as replies,
             coalesce(rp.repost_count, 0) as repost_count, coalesce(rp.reposted_by_me, false) as reposted_by_me,
             false as is_repost, null::uuid as repost_id,
             null::uuid as reposted_by_id, null::text as reposted_by_name, null::text as reposted_by_avatar,
             true as is_current_book, null::uuid as club_book_id
        from posts po
        join profiles p on p.id = po.profile_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from post_likes where post_id = po.id
        ) cnt on true
        left join lateral (
          select jsonb_agg(jsonb_build_object(
                   'id', pc.id, 'body', pc.body, 'created_at', pc.created_at,
                   'profiles', jsonb_build_object('display_name', pcp.display_name, 'avatar_url', pcp.avatar_url)
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
      -- citas del perfil, de cualquier persona (migración 049)
      select q.id, 'quote'::text as kind, null::text as title, q.quote_text as body, null::text as voice_transcript, q.created_at,
             q.profile_id, pf.display_name, pf.avatar_url,
             null::uuid as club_id, null::text as club_name, null::uuid as chapter_id,
             q.book_title, q.book_author, q.book_cover_url,
             null::text as photo_url, '[]'::jsonb as image_urls,
             null::text as voice_url, null::int as voice_duration_seconds,
             null::text as quote_style, null::text as quote_image_url,
             q.card_style, q.card_color,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             '[]'::jsonb as replies,
             0 as repost_count, false as reposted_by_me,
             false as is_repost, null::uuid as repost_id,
             null::uuid as reposted_by_id, null::text as reposted_by_name, null::text as reposted_by_avatar,
             true as is_current_book, null::uuid as club_book_id
        from profile_quotes q
        join profiles pf on pf.id = q.profile_id
        left join lateral (
          select count(*)::int as like_count, bool_or(profile_id = auth.uid()) as liked_by_me
            from profile_quote_likes where quote_id = q.id
        ) cnt on true
      union all
      -- fotos/texto/voz, reposteados por otra persona
      select po.id, 'photo'::text as kind, null::text as title, po.caption as body, po.voice_transcript, rp.created_at,
             po.profile_id, p.display_name, p.avatar_url,
             null::uuid as club_id, null::text as club_name, null::uuid as chapter_id,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             po.image_url as photo_url, null::jsonb as image_urls,
             po.voice_url, po.voice_duration_seconds,
             null::text as quote_style, null::text as quote_image_url,
             null::text as card_style, null::text as card_color,
             coalesce(cnt.like_count, 0) as like_count, coalesce(cnt.liked_by_me, false) as liked_by_me,
             coalesce(pcs.replies, '[]'::jsonb) as replies,
             coalesce(rc.repost_count, 0) as repost_count, coalesce(rc.reposted_by_me, false) as reposted_by_me,
             true as is_repost, rp.id as repost_id,
             rp.profile_id as reposted_by_id, rpp.display_name as reposted_by_name, rpp.avatar_url as reposted_by_avatar,
             true as is_current_book, null::uuid as club_book_id
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
                   'profiles', jsonb_build_object('display_name', pcp.display_name, 'avatar_url', pcp.avatar_url)
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
