-- Libris — esquema inicial (Postgres / Supabase)
-- Alcance: auth + clubes + membresías + libro activo + progreso + comentarios.
-- Editorial (guías/autores/cursos) queda con datos de ejemplo por ahora.

-- ============================================================
-- PERFILES (extiende auth.users, que administra Supabase Auth)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CLUBES
-- ============================================================
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_private boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (club_id, profile_id)
);

-- ============================================================
-- LIBROS Y CAPÍTULOS (definidos colaborativamente por el club)
-- ============================================================
create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  cover_url text
);

create table public.club_books (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  book_id uuid not null references public.books(id),
  is_active boolean not null default true,
  started_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  club_book_id uuid not null references public.club_books(id) on delete cascade,
  number int not null,
  label text not null, -- ej. "Cap. 14"
  unique (club_book_id, number)
);

-- ============================================================
-- PROGRESO POR MIEMBRO
-- ============================================================
create table public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  club_book_id uuid not null references public.club_books(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id),
  percent int not null default 0 check (percent between 0 and 100),
  reaction text check (reaction in ('great', 'slow')),
  updated_at timestamptz not null default now(),
  unique (club_book_id, profile_id)
);

-- ============================================================
-- COMENTARIOS (texto / cita destacada / nota de voz), con spoiler
-- ============================================================
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  club_book_id uuid not null references public.club_books(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid references public.chapters(id),
  kind text not null check (kind in ('text', 'quote', 'voice')),
  body text, -- texto o cita
  voice_url text, -- audio si kind = 'voice'
  voice_transcript text,
  voice_duration_seconds int,
  is_spoiler boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index on public.club_members (profile_id);
create index on public.club_books (club_id) where is_active;
create index on public.reading_progress (profile_id);
create index on public.comments (club_book_id, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY — un usuario solo ve/edita lo de sus propios clubes
-- ============================================================
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_books enable row level security;
alter table public.chapters enable row level security;
alter table public.reading_progress enable row level security;
alter table public.comments enable row level security;

-- profiles: cualquiera autenticado puede leer perfiles básicos; solo el dueño edita el suyo.
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "users manage their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "users insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- helper: ¿el usuario actual es miembro del club?
create or replace function public.is_club_member(target_club_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.club_members
    where club_id = target_club_id and profile_id = auth.uid()
  );
$$;

create policy "members read their clubs"
  on public.clubs for select
  using (public.is_club_member(id));

create policy "authenticated users create clubs"
  on public.clubs for insert
  with check (auth.uid() = created_by);

create policy "members read club_members of their clubs"
  on public.club_members for select
  using (public.is_club_member(club_id));

create policy "users join clubs (insert own membership)"
  on public.club_members for insert
  with check (profile_id = auth.uid());

create policy "members read club_books of their clubs"
  on public.club_books for select
  using (public.is_club_member(club_id));

create policy "members read chapters of their clubs"
  on public.chapters for select
  using (exists (
    select 1 from public.club_books cb
    where cb.id = club_book_id and public.is_club_member(cb.club_id)
  ));

create policy "members read progress of their clubs"
  on public.reading_progress for select
  using (exists (
    select 1 from public.club_books cb
    where cb.id = club_book_id and public.is_club_member(cb.club_id)
  ));

create policy "users manage their own progress"
  on public.reading_progress for insert
  with check (profile_id = auth.uid());

create policy "users update their own progress"
  on public.reading_progress for update
  using (profile_id = auth.uid());

create policy "members read comments of their clubs"
  on public.comments for select
  using (exists (
    select 1 from public.club_books cb
    where cb.id = club_book_id and public.is_club_member(cb.club_id)
  ));

create policy "members post comments in their clubs"
  on public.comments for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.club_books cb
      where cb.id = club_book_id and public.is_club_member(cb.club_id)
    )
  );

-- books: catálogo compartido, lectura pública para autenticados
alter table public.books enable row level security;
create policy "books are readable by authenticated users"
  on public.books for select
  using (auth.role() = 'authenticated');
