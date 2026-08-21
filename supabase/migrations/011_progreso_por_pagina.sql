-- Libris — migración 011: registrar el progreso de lectura de dos formas,
-- porque cada quien puede estar leyendo una edición distinta del mismo
-- libro (los capítulos son iguales para todos, pero el número de página no).
--
--   1. Por capítulo: "voy en el Cap. 8" — el % de la barra se calcula solo,
--      según en qué lugar de la lista de capítulos está ese capítulo.
--   2. Por página: "voy en la 56 de 843" — página actual y total de
--      páginas de ESA edición puntual (son datos por persona, no del libro).
--
-- "percent" pasa a calcularlo siempre el servidor (antes lo elegía el
-- usuario con un slider que en realidad medía el avance dentro del
-- capítulo, no el del libro entero).

alter table public.reading_progress alter column chapter_id drop not null;
alter table public.reading_progress add column if not exists current_page int;
alter table public.reading_progress add column if not exists total_pages int;

-- Tiene que haber un capítulo O un par de página/total válido.
alter table public.reading_progress drop constraint if exists reading_progress_mode_check;
alter table public.reading_progress add constraint reading_progress_mode_check
  check (chapter_id is not null or (current_page is not null and total_pages is not null));

-- Si hay página y total, que tengan sentido entre sí.
alter table public.reading_progress drop constraint if exists reading_progress_pages_check;
alter table public.reading_progress add constraint reading_progress_pages_check
  check (
    (current_page is null and total_pages is null)
    or (current_page is not null and total_pages is not null and total_pages > 0 and current_page >= 0 and current_page <= total_pages)
  );
