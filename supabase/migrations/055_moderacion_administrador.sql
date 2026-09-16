-- Libris — migración 055: un administrador del club puede borrar
-- comentarios, citas o notas de voz AJENAS que no correspondan con las
-- dinámicas del club (spam, contenido fuera de lugar, etc.) — no solo las
-- propias, que es lo único que se podía hasta acá.
--
-- A propósito acotada, tras charlarlo: alcanza a comentarios de texto
-- (kind = 'text', con o sin foto/GIF adjunto), citas destacadas
-- (kind = 'quote') y notas de voz (kind = 'voice') — NO a las reseñas
-- finales del libro (kind = 'review'), que quedan afuera. El borrado sigue
-- siendo total (la fila desaparece del todo, igual que cuando borrás lo
-- tuyo) — no queda ningún aviso "eliminado por un administrador" en el
-- lugar donde estaba. Lo único que SÍ queda es una notificación para quien
-- lo había publicado (ver más abajo) — para eso hace falta guardar un
-- resumen ANTES de borrar, porque una vez borrada la fila no queda nada de
-- donde sacarlo.
--
-- Todo escrito para poder volver a correrse sin romper (create table/
-- policy if not exists, drop policy if exists antes de cada create
-- policy) — mismo criterio que el resto de las migraciones recientes.

-- ============================================================
-- 1. RLS de comments: admin del club puede borrar text/quote/voice ajenos.
-- ============================================================
-- Reemplaza la policy de la migración 028 (dueño únicamente) por una que
-- además deja pasar a un administrador del club — pero solo para los tres
-- tipos de arriba, nunca para 'review'. La mitad "dueño" queda idéntica a
-- como estaba (los cuatro kind, incluida 'review').
drop policy if exists "cada quien borra sus propios comentarios" on public.comments;
create policy "borra comentarios propios, o ajenos si sos admin del club"
  on public.comments for delete to authenticated
  using (
    (profile_id = auth.uid() and kind in ('review', 'quote', 'text', 'voice'))
    or (
      kind in ('quote', 'text', 'voice')
      and exists (
        select 1 from public.club_books cb
        where cb.id = comments.club_book_id and public.is_club_admin(cb.club_id)
      )
    )
  );

-- ============================================================
-- 2. moderation_deletes — registro mínimo para poder avisarle a quien
--    escribió algo que un administrador se lo borró.
-- ============================================================
-- No hay tabla de notificaciones propia en esta app (ver migración 037) —
-- se arman al vuelo cruzando lo que ya existe. Acá no hay "lo que ya
-- existe" para cruzar: el borrado hace desaparecer la fila entera. Esta
-- tabla guarda lo mínimo (a quién, en qué club/capítulo, de qué tipo, una
-- vista previa corta) en el momento del borrado, así notifications_feed
-- tiene de dónde armar el aviso.
create table if not exists public.moderation_deletes (
  id uuid primary key default gen_random_uuid(),
  club_book_id uuid not null references public.club_books(id) on delete cascade,
  chapter_id uuid references public.chapters(id),
  kind text not null check (kind in ('text', 'quote', 'voice')),
  preview text,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  actor_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists moderation_deletes_target_idx on public.moderation_deletes(target_profile_id, created_at desc);

alter table public.moderation_deletes enable row level security;

-- Nadie necesita leer esto directo (notifications_feed es security definer
-- y no pasa por RLS) — esta policy de select queda solo como red de
-- seguridad, por si algo la consulta directo alguna vez.
drop policy if exists "cada quien ve sus propios avisos de moderación" on public.moderation_deletes;
create policy "cada quien ve sus propios avisos de moderación"
  on public.moderation_deletes for select to authenticated
  using (target_profile_id = auth.uid());

-- Solo puede insertar un administrador del club correspondiente, dejando
-- constancia de que fue él o ella (actor_profile_id = auth.uid()) — nunca
-- a nombre de otra persona.
drop policy if exists "administradores registran sus borrados de moderación" on public.moderation_deletes;
create policy "administradores registran sus borrados de moderación"
  on public.moderation_deletes for insert to authenticated
  with check (
    actor_profile_id = auth.uid()
    and exists (
      select 1 from public.club_books cb
      where cb.id = moderation_deletes.club_book_id and public.is_club_admin(cb.club_id)
    )
  );

-- ============================================================
-- 3. notifications_feed suma una rama más: "te borraron algo".
-- ============================================================
-- Mismo shape de siempre (kind, source_id, created_at, actor_*, club_*,
-- chapter_id, post_id, preview) — create or replace, no hace falta tocar
-- el resto de las ramas.
create or replace function public.notifications_feed(limit_count int default 30)
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

      union all

      -- un administrador borró algo que habías publicado (migración 055)
      select 'moderation_delete', md.id, md.created_at,
             md.actor_profile_id, p.display_name, p.avatar_url,
             cb.club_id, clb.name, md.chapter_id, null::uuid,
             md.preview
        from moderation_deletes md
        join club_books cb on cb.id = md.club_book_id
        join clubs clb on clb.id = cb.club_id
        join profiles p on p.id = md.actor_profile_id
       where md.target_profile_id = auth.uid()
    ) events
   order by created_at desc
   limit limit_count;
$$;
