-- Libris — chequeo rápido del setup de la base.
-- Pegar en el SQL Editor de Supabase y correr: cada fila debe decir OK.
-- Si alguna dice FALTA, correr la migración correspondiente de supabase/migrations/.

select 'Migración 002 — trigger que crea el perfil al registrarse' as paso,
       case when exists (select 1 from pg_trigger where tgname = 'on_auth_user_created')
            then 'OK' else 'FALTA' end as estado
union all
select 'Migración 002 — política: crear libros',
       case when exists (select 1 from pg_policies where tablename = 'books' and policyname = 'authenticated users create books')
            then 'OK' else 'FALTA' end
union all
select 'Migración 002 — política: crear libro activo del club',
       case when exists (select 1 from pg_policies where tablename = 'club_books' and policyname = 'members create club_books in their clubs')
            then 'OK' else 'FALTA' end
union all
select 'Migración 002 — política: crear capítulos',
       case when exists (select 1 from pg_policies where tablename = 'chapters' and policyname = 'members create chapters in their clubs')
            then 'OK' else 'FALTA' end
union all
select 'Migración 002 — política: guardar progreso',
       case when exists (select 1 from pg_policies where tablename = 'reading_progress' and policyname = 'users create progress in clubs they belong to')
            then 'OK' else 'FALTA' end
union all
select 'Migración 003 — política: el creador puede leer su club',
       case when exists (select 1 from pg_policies where tablename = 'clubs' and policyname = 'members and creator read their clubs')
            then 'OK' else 'FALTA' end
union all
select 'Migración 004 — datos del club para invitaciones',
       case when exists (select 1 from pg_proc where proname = 'club_invite_info')
            then 'OK' else 'FALTA' end
union all
select 'Migración 005 — bucket de portadas',
       case when exists (select 1 from storage.buckets where id = 'book-covers')
            then 'OK' else 'FALTA' end
union all
select 'Migración 005 — bucket de notas de voz',
       case when exists (select 1 from storage.buckets where id = 'voice-notes')
            then 'OK' else 'FALTA' end
union all
select 'Migración 005 — funciones de descubrimiento',
       case when exists (select 1 from pg_proc where proname = 'other_clubs_activity')
        and exists (select 1 from pg_proc where proname = 'popular_books')
            then 'OK' else 'FALTA' end
union all
select 'Migración 005 — tabla editorial con contenido',
       case when exists (select 1 from information_schema.tables where table_name = 'editorial_items')
            then 'OK' else 'FALTA' end
union all
select 'Migración 008 — Recursos sin categoría Autor',
       case when not exists (select 1 from public.editorial_items where category = 'Autor')
        and exists (select 1 from information_schema.check_constraints where constraint_name = 'editorial_items_category_check' and check_clause not like '%Autor%')
            then 'OK' else 'FALTA' end;
