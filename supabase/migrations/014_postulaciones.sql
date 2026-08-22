-- Libris — migración 014: postulaciones a clubes privados.
--
-- Hasta ahora un club era público (unión directa) o privado (solo por
-- link de invitación). Se agrega un tercer modo: privado "con solicitud"
-- — aparece listado en Descubrir con su nombre, como los públicos, pero
-- para sumarse hay que mandar una solicitud que un administrador aprueba
-- o rechaza. Como una cuenta privada de Instagram.

-- ============================================================
-- 1. MODO DE INGRESO DEL CLUB
-- ============================================================
alter table public.clubs add column if not exists join_mode text not null default 'invite'
  check (join_mode in ('open', 'request', 'invite'));

-- Migra el estado actual sin cambiar el comportamiento de ningún club
-- existente: los públicos pasan a 'open', los privados a 'invite'.
update public.clubs set join_mode = case when is_private then 'invite' else 'open' end;

-- is_private se sigue usando (lo lee other_clubs_activity para anonimizar
-- nombres) pero de acá en más lo mantiene la propia app en conjunto con
-- join_mode: is_private = join_mode <> 'open'.

-- ============================================================
-- 2. SOLICITUDES
-- ============================================================
create table if not exists public.club_join_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (club_id, profile_id)
);

alter table public.club_join_requests enable row level security;

create policy "el solicitante ve sus propias solicitudes"
  on public.club_join_requests for select to authenticated
  using (profile_id = auth.uid());

create policy "los administradores ven las solicitudes de su club"
  on public.club_join_requests for select to authenticated
  using (public.is_club_admin(club_id));

create policy "cualquiera postula a un club que reciba solicitudes"
  on public.club_join_requests for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (select 1 from public.clubs c where c.id = club_id and c.join_mode = 'request')
    and not exists (
      select 1 from public.club_members m
      where m.club_id = club_join_requests.club_id and m.profile_id = auth.uid()
    )
  );

-- Si te rechazaron, podés volver a postular (pending de nuevo). No podés
-- tocar tu propia solicitud de ninguna otra forma.
create policy "el solicitante puede volver a postular si lo rechazaron"
  on public.club_join_requests for update to authenticated
  using (profile_id = auth.uid() and status = 'rejected')
  with check (profile_id = auth.uid() and status = 'pending');

create policy "los administradores aprueban o rechazan solicitudes"
  on public.club_join_requests for update to authenticated
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

-- Al aprobar una solicitud, el administrador suma a esa persona al club
-- (no a cualquiera — solo a quien tenga una solicitud ya aprobada).
create policy "administradores suman gente con solicitud aprobada"
  on public.club_members for insert to authenticated
  with check (
    public.is_club_admin(club_id)
    and exists (
      select 1 from public.club_join_requests r
      where r.club_id = club_members.club_id
        and r.profile_id = club_members.profile_id
        and r.status = 'approved'
    )
  );

-- ============================================================
-- 3. DESCUBRIR: incluir también los clubes "con solicitud"
-- ============================================================
drop function if exists public.discover_public_clubs(int);
create or replace function public.discover_public_clubs(limit_count int default 30)
returns table (
  id uuid, name text, join_mode text, member_count bigint,
  book_title text, book_author text, book_cover_url text,
  my_request_status text
)
language sql security definer stable set search_path = public
as $$
  select c.id, c.name, c.join_mode,
         (select count(*) from club_members m where m.club_id = c.id),
         b.title, b.author, b.cover_url,
         (select r.status from club_join_requests r where r.club_id = c.id and r.profile_id = auth.uid())
    from clubs c
    left join club_books cb on cb.club_id = c.id and cb.is_active
    left join books b on b.id = cb.book_id
   where c.join_mode in ('open', 'request')
   order by c.created_at desc
   limit limit_count;
$$;

revoke all on function public.discover_public_clubs(int) from public;
grant execute on function public.discover_public_clubs(int) to authenticated;

-- ============================================================
-- 4. "OTROS CLUBES LEYENDO LO MISMO": ya no alcanza con is_private
-- ============================================================
-- Un club "con solicitud" ya muestra su nombre en Descubrir, así que no
-- tiene sentido anonimizarlo acá — solo los 'invite' (privados de toda la
-- vida) se anonimizan.
create or replace function public.other_clubs_activity(target_book_id uuid, exclude_club_id uuid)
returns table (id uuid, club_label text, is_public boolean, started_at timestamptz, member_count bigint)
language sql security definer stable set search_path = public
as $$
  select cb.id,
         case when c.join_mode = 'invite' then 'Un club' else c.name end,
         c.join_mode <> 'invite',
         cb.started_at,
         (select count(*) from club_members m where m.club_id = c.id)
    from club_books cb
    join clubs c on c.id = cb.club_id
   where cb.book_id = target_book_id
     and cb.is_active
     and cb.club_id <> exclude_club_id
   order by cb.started_at desc
   limit 20;
$$;
