-- La sección "Descubrir" pasa a llamarse "Recursos" y queda solo con
-- Guías y Cursos: se elimina la categoría "Autor".

-- 1) Borra el contenido editorial ya publicado bajo "Autor" (el ejemplo
--    "Julio Cortázar" sembrado en la migración 005).
delete from public.editorial_items where category = 'Autor';

-- 2) Actualiza la restricción de la columna para que "Autor" ya no sea
--    un valor válido en el futuro.
alter table public.editorial_items drop constraint if exists editorial_items_category_check;
alter table public.editorial_items add constraint editorial_items_category_check
  check (category in ('Guía', 'Curso'));
