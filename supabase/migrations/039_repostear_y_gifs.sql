-- Libris — migración 039: repostear el feed de otras personas, y GIF en las
-- fotos que se suben a Perfil.
--
-- ============================================================
-- 1. GIF EN "post-photos"
-- ============================================================
-- El bucket solo aceptaba jpeg/png/webp (migración 016) — se agrega
-- image/gif. El límite de tamaño (8 MB) queda igual: de sobra para un GIF
-- razonable, y evita que alguien suba un archivo enorme sin querer.
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id = 'post-photos';

-- ============================================================
-- 2. REPOSTEAR: tabla "reposts"
-- ============================================================
-- "Compartir en Inicio" (migración 031) ya dejaba compartir TU PROPIO
-- comentario/nota de voz a Inicio — esto es distinto: reenviar a tu feed
-- algo que publicó OTRA persona (como retweetear). Una sola tabla para
-- comentarios (reseñas, citas, y comentarios/notas de voz ya compartidos
-- por su autor) y fotos, con dos columnas nullable en vez de una tabla por
-- tipo — acá sí conviene, porque a diferencia de los likes (que siempre
-- van sobre UN tipo de contenido puntual, ya sabido de antemano en cada
-- lugar donde se usan) todo repost pasa por el mismo botón sobre la misma
-- tarjeta (ActivityCard), sea cual sea su tipo.
create table public.reposts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (comment_id is not null and post_id is null)
    or (comment_id is null and post_id is not null)
  )
);

-- Único por persona+contenido (con índices parciales, no un "unique" de
-- tabla completa, porque comment_id/post_id son nullable — dos reposts de
-- fotos distintas tienen comment_id null en ambos, y un unique común los
-- vería como duplicados).
create unique index reposts_profile_comment_uniq on public.reposts (profile_id, comment_id) where comment_id is not null;
create unique index reposts_profile_post_uniq on public.reposts (profile_id, post_id) where post_id is not null;

alter table public.reposts enable row level security;

create policy "cada quien ve sus propios reposts"
  on public.reposts for select to authenticated
  using (profile_id = auth.uid());

-- El SELECT normal de "comments" (schema.sql, "members read comments of
-- their clubs") es más angosto que la visibilidad real del feed: exige ser
-- miembro del club, sin la excepción de "club público, no hace falta ser
-- miembro" que sí tienen recent_activity/profile_activity. Una política de
-- RLS corre como quien inserta, no como security definer — así que un
-- "exists (select ... from comments ...)" directo acá adentro se toparía
-- con ese SELECT más angosto y rechazaría reposts que en realidad son
-- válidos (alguien reposteando una cita de un club abierto del que no es
-- miembro, que sí puede ver en Inicio). Por eso el chequeo va en una
-- función security definer aparte —mismo patrón que ya usa
-- is_club_member— que sí puede leer "comments" sin ese límite y aplica acá
-- la MISMA regla que ya usan recent_activity/profile_activity más abajo:
-- kind quote/review, o texto/nota de voz que su autor ya compartió, en un
-- club sin invitación o del que sos miembro.
create or replace function public.can_repost_comment(target_comment_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.comments c
    join public.club_books cb on cb.id = c.club_book_id
    join public.clubs cl on cl.id = cb.club_id
    where c.id = target_comment_id
      and c.parent_comment_id is null
      and not c.is_spoiler
      and (c.kind in ('quote', 'review') or (c.kind in ('text', 'voice') and c.shared_to_feed))
      and (cl.join_mode <> 'invite' or public.is_club_member(cl.id))
  );
$$;

-- Las fotos no necesitan el mismo chequeo: "posts" ya es de lectura
-- pública para cualquier autenticado (migración 016, "cualquiera ve las
-- fotos publicadas"), sin el problema de arriba.
create policy "repostear solo contenido elegible para el feed"
  on public.reposts for insert to authenticated
  with check (
    profile_id = auth.uid()
    and (post_id is not null or public.can_repost_comment(comment_id))
  );

create policy "cada quien saca sus propios reposts"
  on public.reposts for delete to authenticated
  using (profile_id = auth.uid());

-- ============================================================
-- 3. profile_activity y recent_activity: ahora también traen reposts
-- ============================================================
-- Dos columnas nuevas de "cuánto se reposteó esto" (repost_count/
-- reposted_by_me, mismo patrón que like_count/liked_by_me) en las dos
-- ramas de siempre (comentarios y fotos publicados de forma orgánica), más
-- dos ramas nuevas: la misma tarjeta pero reposteada por alguien, con
-- created_at del repost (para que aparezca arriba, como algo fresco) en
-- vez del original, y is_repost/repost_id/reposted_by_* para que el
-- cliente pueda mostrar "Fulana compartió esto" arriba de la tarjeta.
-- "id" sigue siendo el id del contenido ORIGINAL (no el id del repost) en
-- las cuatro ramas — así "me gusta"/comentar siguen apuntando siempre al
-- original, reposteado o no. Como el mismo id puede aparecer dos veces
-- (una vez orgánico, otra reposteado por alguien) — a propósito, es
-- exactamente lo que tiene que pasar — el cliente arma su key de React
-- con repost_id cuando existe, no con id a secas.
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
           where r.parent_comment_id = c.id
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
           where pc.post_id = p.id
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
           where r.parent_comment_id = c.id
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
           where pc.post_id = p.id
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
           where r.parent_comment_id = c.id
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
           where pc.post_id = po.id
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
           where r.parent_comment_id = c.id
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
           where pc.post_id = po.id
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
