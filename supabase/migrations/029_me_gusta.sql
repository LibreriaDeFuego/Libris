-- Libris — migración 029: "Me gusta" en reseñas, citas, comentarios,
-- notas de voz y fotos.
--
-- Dos tablas de likes, no una genérica: "comments" y "posts" son tablas
-- distintas (con su propia RLS y su propio dueño), así que cada una tiene
-- su tabla de likes con una referencia real (foreign key), en vez de una
-- referencia "polimórfica" sin garantía de integridad.

create table public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, profile_id)
);

alter table public.comment_likes enable row level security;

-- Mismo criterio de visibilidad que ya usa "members read comments of their
-- clubs" (schema.sql) — si no podés ver el comentario, tampoco sus likes.
create policy "miembros del club ven los likes de sus comentarios"
  on public.comment_likes for select to authenticated
  using (exists (
    select 1 from public.comments c
    join public.club_books cb on cb.id = c.club_book_id
    where c.id = comment_id and public.is_club_member(cb.club_id)
  ));

create policy "cada quien pone sus propios likes en comentarios"
  on public.comment_likes for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.comments c
      join public.club_books cb on cb.id = c.club_book_id
      where c.id = comment_id and public.is_club_member(cb.club_id)
    )
  );

create policy "cada quien saca sus propios likes en comentarios"
  on public.comment_likes for delete to authenticated
  using (profile_id = auth.uid());

create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, profile_id)
);

alter table public.post_likes enable row level security;

-- Las fotos ya son públicas para cualquier autenticado (schema.sql,
-- "cualquiera ve las fotos publicadas") — sus likes, igual.
create policy "cualquiera ve los likes de las fotos"
  on public.post_likes for select to authenticated
  using (true);

create policy "cada quien pone sus propios likes en fotos"
  on public.post_likes for insert to authenticated
  with check (profile_id = auth.uid());

create policy "cada quien saca sus propios likes en fotos"
  on public.post_likes for delete to authenticated
  using (profile_id = auth.uid());

-- ============================================================
-- profile_activity y recent_activity: ahora también traen like_count
-- (cuántos likes tiene) y liked_by_me (si quien mira ya le dio like) —
-- calculados con un lateral join a la tabla de likes que corresponda.
-- ============================================================
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
