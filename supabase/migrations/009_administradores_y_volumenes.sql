-- Libris — migración 009: administradores del club (hasta 3, con las mismas
-- facultades), capítulos con nombre propio y agrupados en "volúmenes"
-- (Libro 1, Libro 2, 2026, 2027...) con numeración libre, y comentarios que
-- pueden apuntar a un capítulo puntual además de al libro en general (esto
-- último ya lo permitía la columna comments.chapter_id, no hace falta tocarla).

-- ============================================================
-- 1. ADMINISTRADORES DEL CLUB
-- ============================================================
-- "owner" pasa a llamarse "admin": el creador del club ya es su primer
-- administrador, y puede nombrar hasta 2 más (3 en total), todos con las
-- mismas facultades — no hay jerarquía entre ellos.
update public.club_members set role = 'admin' where role = 'owner';

alter table public.club_members drop constraint if exists club_members_role_check;
alter table public.club_members add constraint club_members_role_check
  check (role in ('admin', 'member'));

-- Tope de 3 administradores por club.
create or replace function public.enforce_max_admins()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'admin' then
    if (select count(*) from public.club_members
        where club_id = new.club_id and role = 'admin') >= 3 then
      raise exception 'Este club ya tiene el máximo de 3 administradores.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_max_admins on public.club_members;
create trigger trg_max_admins
  before insert or update of role on public.club_members
  for each row execute function public.enforce_max_admins();

-- Que un club nunca se quede sin administradores: ni saliendo del club
-- (delete) ni sacándose el rol (update) si sos el último que queda y
-- todavía hay otros miembros.
create or replace function public.prevent_last_admin_leaving()
returns trigger
language plpgsql
as $$
declare
  remaining_admins int;
  remaining_members int;
begin
  if old.role = 'admin' then
    select count(*) into remaining_admins from public.club_members
      where club_id = old.club_id and role = 'admin' and profile_id <> old.profile_id;
    if remaining_admins = 0 then
      select count(*) into remaining_members from public.club_members
        where club_id = old.club_id and profile_id <> old.profile_id;
      if remaining_members > 0 then
        raise exception 'Este club se quedaría sin administradores. Nombrá a otro administrador antes de salir.';
      end if;
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_last_admin_leaving on public.club_members;
create trigger trg_prevent_last_admin_leaving
  before delete on public.club_members
  for each row execute function public.prevent_last_admin_leaving();

create or replace function public.prevent_last_admin_demotion()
returns trigger
language plpgsql
as $$
declare
  remaining_admins int;
  remaining_members int;
begin
  if old.role = 'admin' and new.role <> 'admin' then
    select count(*) into remaining_admins from public.club_members
      where club_id = old.club_id and role = 'admin' and profile_id <> old.profile_id;
    if remaining_admins = 0 then
      select count(*) into remaining_members from public.club_members
        where club_id = old.club_id and profile_id <> old.profile_id;
      if remaining_members > 0 then
        raise exception 'Este club se quedaría sin administradores. Nombrá a otro administrador antes de sacarle el rol a este.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_last_admin_demotion on public.club_members;
create trigger trg_prevent_last_admin_demotion
  before update of role on public.club_members
  for each row execute function public.prevent_last_admin_demotion();

-- Helper para políticas: ¿el usuario actual es administrador de este club?
create or replace function public.is_club_admin(target_club_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.club_members
    where club_id = target_club_id and profile_id = auth.uid() and role = 'admin'
  );
$$;

-- El club (nombre, visibilidad) ahora lo editan los administradores, no solo
-- quien lo creó.
drop policy if exists "el creador edita su club" on public.clubs;
create policy "los administradores editan su club"
  on public.clubs for update to authenticated
  using (public.is_club_admin(id))
  with check (public.is_club_admin(id));

-- Un administrador puede nombrar o sacar administradores de su club.
create policy "los administradores cambian roles en su club"
  on public.club_members for update to authenticated
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

-- ============================================================
-- 2. VOLÚMENES (agrupar capítulos: "Libro 1", "Libro 2", "2026"...)
-- ============================================================
create table if not exists public.volumes (
  id uuid primary key default gen_random_uuid(),
  club_book_id uuid not null references public.club_books(id) on delete cascade,
  name text not null,
  position int not null,
  created_at timestamptz not null default now(),
  unique (club_book_id, position)
);

alter table public.volumes enable row level security;

create policy "miembros ven los volúmenes de su club"
  on public.volumes for select to authenticated
  using (exists (
    select 1 from public.club_books cb
    where cb.id = club_book_id and public.is_club_member(cb.club_id)
  ));

create policy "administradores crean volúmenes en su club"
  on public.volumes for insert to authenticated
  with check (exists (
    select 1 from public.club_books cb
    where cb.id = club_book_id and public.is_club_admin(cb.club_id)
  ));

create policy "administradores editan volúmenes de su club"
  on public.volumes for update to authenticated
  using (exists (
    select 1 from public.club_books cb
    where cb.id = club_book_id and public.is_club_admin(cb.club_id)
  ));

-- ============================================================
-- 3. CAPÍTULOS: nombre propio + volumen
-- ============================================================
-- "title" es el nombre que le pone el administrador ("El inicio"); el número
-- de capítulo (columna "number", ya existía) se sigue mostrando siempre
-- adelante ("Cap. 1. El inicio"), así se conserva el orden aunque tenga
-- nombre. "label" queda como quedó (columna vieja, ya no se usa para mostrar
-- capítulos con nombre propio, pero no hace falta borrarla).
alter table public.chapters add column if not exists title text;
alter table public.chapters add column if not exists volume_id uuid references public.volumes(id) on delete set null;

-- Antes cualquier miembro podía agregar capítulos (era un MVP sin roles).
-- Ahora es cosa de los administradores, y además pueden renombrarlos,
-- renumerarlos y meterlos en un volumen.
drop policy if exists "members create chapters in their clubs" on public.chapters;
create policy "administradores crean capítulos en su club"
  on public.chapters for insert to authenticated
  with check (exists (
    select 1 from public.club_books cb
    where cb.id = club_book_id and public.is_club_admin(cb.club_id)
  ));

create policy "administradores editan capítulos de su club"
  on public.chapters for update to authenticated
  using (exists (
    select 1 from public.club_books cb
    where cb.id = club_book_id and public.is_club_admin(cb.club_id)
  ));
