-- Libris — migración 010: el número de capítulo tiene que ser único dentro
-- de su volumen, no en todo el libro. Antes, "Cap. 1" de "Libro 2" chocaba
-- con el "Cap. 1" de "Libro 1" — justo el caso que la migración 009 quería
-- permitir (cada volumen con su propia numeración).

alter table public.chapters drop constraint if exists chapters_club_book_id_number_key;

-- Único por volumen (dos volúmenes distintos sí pueden tener, cada uno, un
-- "Cap. 1").
create unique index if not exists chapters_number_por_volumen
  on public.chapters (club_book_id, volume_id, number)
  where volume_id is not null;

-- Único entre los capítulos que todavía no están en ningún volumen.
create unique index if not exists chapters_number_sin_volumen
  on public.chapters (club_book_id, number)
  where volume_id is null;
