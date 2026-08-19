-- ¿Se crearon los buckets y sus políticas?
-- El SQL Editor corre todo el script en una transacción: si una sola sentencia
-- falla, se revierte TODO — incluidos los buckets creados antes del error.
select 'BUCKET: ' || id as elemento from storage.buckets
union all
select 'POLÍTICA STORAGE: ' || policyname from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
union all
select 'TABLA EDITORIAL: ' || table_name from information_schema.tables
 where table_schema = 'public' and table_name = 'editorial_items'
union all
select 'FUNCIÓN: ' || proname from pg_proc
 where proname in ('other_clubs_activity', 'popular_books', 'other_clubs_reading_count')
order by 1;
