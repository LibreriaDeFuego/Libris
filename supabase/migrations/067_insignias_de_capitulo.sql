-- Libris — migración 067: insignias de capítulo. Una marca chica y
-- opcional que cualquier miembro del club pone sobre el capítulo que
-- quiera, para decir cómo lo dejó — "me enganchó", "me rompió el
-- corazón", "me hizo reír", "no lo vi venir", "fome" o "lo dejé aquí".
--
-- Reglas, tal como se pidieron:
--   - Una sola insignia por persona por capítulo, nunca más de una.
--   - Se puede cambiar cuando quieras, o sacarla del todo (tocar la
--     misma que ya tenías puesta la saca — por eso el unique es
--     (chapter_id, profile_id), no (chapter_id, profile_id, kind): la
--     fila entera se borra al sacarla, no se guarda un estado "vacío").
--   - Se ve: cualquier miembro del club ve las insignias de cualquiera,
--     no solo las propias — por eso el select no filtra por profile_id.
--   - "Lo dejé aquí" no tiene ningún efecto aparte de mostrarse — no
--     cambia is_active, no toca reading_progress, no le avisa a nadie
--     más que con la marca en sí. Es solo una opción más de "kind",
--     sin ningún trigger ni chequeo especial.
--
-- Mismo patrón que chapter_questions (migración 053): todo con "if not
-- exists"/"drop policy if exists" para poder volver a correr esto sin
-- romper si quedó cortado a mitad de camino.

-- "club_book_id" queda guardado acá mismo, no solo chapter_id — mismo
-- trato que ya usan comments y chapter_questions, justamente para poder
-- traer las insignias de un libro entero (todo Tu camino, o el select
-- de Comentarios) sin tener que pasar por "chapters" en cada consulta.
create table if not exists public.chapter_badges (
  id uuid primary key default gen_random_uuid(),
  club_book_id uuid not null references public.club_books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  kind text not null check (kind in ('engancho', 'corazon_roto', 'risa', 'sorpresa', 'fome', 'lo_deje')),
  created_at timestamptz not null default now(),
  unique (chapter_id, profile_id)
);

create index if not exists chapter_badges_club_book_id_idx on public.chapter_badges(club_book_id);

alter table public.chapter_badges enable row level security;

-- Cualquier miembro del club ve TODAS las insignias de ese capítulo, no
-- solo la propia — es justamente el pedido: que se vea quién puso qué.
drop policy if exists "miembros ven las insignias de su club" on public.chapter_badges;
create policy "miembros ven las insignias de su club"
  on public.chapter_badges for select to authenticated
  using (exists (
    select 1 from public.club_books cb
    where cb.id = chapter_badges.club_book_id and public.is_club_member(cb.club_id)
  ));

drop policy if exists "cada quien pone su propia insignia" on public.chapter_badges;
create policy "cada quien pone su propia insignia"
  on public.chapter_badges for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.club_books cb
      where cb.id = chapter_badges.club_book_id and public.is_club_member(cb.club_id)
    )
  );

-- Cambiar de insignia es un update (mismo chapter_id + profile_id, otro
-- kind) — sacarla del todo es un delete (más abajo). Ninguna de las dos
-- necesita volver a chequear membresía: si la fila ya existe, es porque
-- el insert ya la pidió en su momento.
drop policy if exists "cada quien cambia su propia insignia" on public.chapter_badges;
create policy "cada quien cambia su propia insignia"
  on public.chapter_badges for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "cada quien saca su propia insignia" on public.chapter_badges;
create policy "cada quien saca su propia insignia"
  on public.chapter_badges for delete to authenticated
  using (profile_id = auth.uid());
