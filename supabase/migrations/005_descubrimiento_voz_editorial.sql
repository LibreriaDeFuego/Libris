-- Libris — migración 005: descubrimiento social, notas de voz, sección
-- editorial y portadas de libros. Correr DESPUÉS de 004, una sola vez.

-- ============================================================
-- 1. ALMACENAMIENTO (Supabase Storage)
-- ============================================================
-- Portadas: bucket público (una tapa de libro no es información sensible y
-- así se puede mostrar sin firmar URLs en cada request).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-covers', 'book-covers', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Notas de voz: bucket PRIVADO. Son conversaciones dentro de un club, así que
-- se sirven con URLs firmadas y solo para miembros.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-notes', 'voice-notes', false, 10485760,
        array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'])
on conflict (id) do nothing;

create policy "cualquiera ve las portadas"
  on storage.objects for select
  using (bucket_id = 'book-covers');

create policy "usuarios autenticados suben portadas"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'book-covers');

create policy "usuarios autenticados reemplazan portadas"
  on storage.objects for update to authenticated
  using (bucket_id = 'book-covers');

-- Las notas de voz se guardan como "<club_book_id>/<archivo>", así que la
-- primera carpeta del path identifica el libro del club y sirve para verificar
-- la membresía sin tablas extra.
create policy "miembros escuchan las notas de voz de su club"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'voice-notes'
    and exists (
      select 1 from public.club_books cb
      where cb.id::text = (storage.foldername(name))[1]
        and public.is_club_member(cb.club_id)
    )
  );

create policy "miembros graban notas de voz en su club"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'voice-notes'
    and exists (
      select 1 from public.club_books cb
      where cb.id::text = (storage.foldername(name))[1]
        and public.is_club_member(cb.club_id)
    )
  );

-- ============================================================
-- 2. PERMISOS QUE FALTABAN
-- ============================================================
-- Guardar la portada implica actualizar el libro.
create policy "miembros actualizan los libros de su club"
  on public.books for update to authenticated
  using (exists (
    select 1 from public.club_books cb
    where cb.book_id = books.id and public.is_club_member(cb.club_id)
  ));

-- El creador puede cambiar si el club es privado o público.
create policy "el creador edita su club"
  on public.clubs for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ============================================================
-- 3. DESCUBRIMIENTO SOCIAL
-- ============================================================
-- RLS solo deja ver los clubes propios, y está bien que así sea: nadie debería
-- leer los datos de un club ajeno. Estas funciones (security definer) exponen
-- únicamente lo mínimo para el descubrimiento, y anonimizan a los clubes
-- privados — su nombre nunca sale.

create or replace function public.other_clubs_reading_count(target_book_id uuid, exclude_club_id uuid)
returns bigint
language sql security definer stable set search_path = public
as $$
  select count(*)
    from club_books cb
   where cb.book_id = target_book_id
     and cb.is_active
     and cb.club_id <> exclude_club_id;
$$;

create or replace function public.other_clubs_activity(target_book_id uuid, exclude_club_id uuid)
returns table (id uuid, club_label text, is_public boolean, started_at timestamptz, member_count bigint)
language sql security definer stable set search_path = public
as $$
  select cb.id,
         case when c.is_private then 'Un club' else c.name end,
         not c.is_private,
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

-- Qué se está leyendo en toda la app (para la pantalla Descubrir).
create or replace function public.popular_books(limit_count int default 12)
returns table (book_id uuid, title text, author text, cover_url text, club_count bigint)
language sql security definer stable set search_path = public
as $$
  select b.id, b.title, b.author, b.cover_url, count(distinct cb.club_id)
    from books b
    join club_books cb on cb.book_id = b.id and cb.is_active
   group by b.id, b.title, b.author, b.cover_url
   order by count(distinct cb.club_id) desc, b.title
   limit limit_count;
$$;

revoke all on function public.other_clubs_reading_count(uuid, uuid) from public;
revoke all on function public.other_clubs_activity(uuid, uuid) from public;
revoke all on function public.popular_books(int) from public;
grant execute on function public.other_clubs_reading_count(uuid, uuid) to authenticated;
grant execute on function public.other_clubs_activity(uuid, uuid) to authenticated;
grant execute on function public.popular_books(int) to authenticated;

-- ============================================================
-- 4. SECCIÓN EDITORIAL ("Descubrir")
-- ============================================================
-- Contenido curado. Por ahora se carga desde el Table Editor de Supabase;
-- no hay panel de administración dentro de la app.
create table if not exists public.editorial_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('Guía', 'Autor', 'Curso')),
  title text not null,
  subtitle text,
  body text,
  image_url text,
  link_url text,
  is_published boolean not null default true,
  published_at timestamptz not null default now()
);

alter table public.editorial_items enable row level security;

create policy "el contenido editorial publicado es visible"
  on public.editorial_items for select to authenticated
  using (is_published);

create index on public.editorial_items (category, published_at desc);

insert into public.editorial_items (category, title, subtitle, body) values
  ('Guía', 'Cómo armar un club de lectura', 'Ocho pasos para empezar bien',
   E'Elegí un primer libro corto: terminar algo junto arma más grupo que empezar algo ambicioso.\n\nDefinan juntos los capítulos y un ritmo realista. Es preferible un capítulo por semana sostenido que tres por semana los primeros quince días.\n\nAcuerden desde el arranque qué se hace con los spoilers. Marcar un comentario como spoiler no es exagerado: es lo que permite que quien va más lento siga participando.\n\nDejen espacio para las impresiones sueltas, no solo para el análisis. Una nota de voz de dos minutos diciendo "che, esto me voló la cabeza" mantiene más vivo un club que una reseña perfecta.'),
  ('Guía', 'Manejar spoilers sin pelear', 'Reglas simples para el grupo',
   E'La regla base: si tu comentario adelanta algo que pasa después del capítulo que estás comentando, va marcado como spoiler.\n\nNo hace falta ser rígido con los detalles menores. Lo que arruina la lectura es revelar giros y finales, no mencionar que un personaje aparece.\n\nCuando alguien se olvida y spoilea, conviene resolverlo en privado y sin drama. El objetivo es que nadie tenga miedo de comentar.'),
  ('Autor', 'Julio Cortázar', 'Rayuela cumple años y sigue incomodando',
   E'Rayuela propone dos lecturas posibles: la lineal y la del tablero de dirección, saltando capítulos. Para un club es un buen experimento dividir al grupo y comparar experiencias.\n\nSi es la primera vez del grupo con Cortázar, los cuentos son una puerta de entrada más amable que la novela.'),
  ('Curso', 'Taller de lectura crítica', 'Cuatro semanas, en línea',
   E'Un taller pensado para clubes que quieren pasar del "me gustó" al "por qué me gustó".\n\nSe trabaja sobre textos cortos y cada semana se propone una herramienta de lectura distinta: punto de vista, tiempo narrativo, voz y estructura.')
on conflict do nothing;
