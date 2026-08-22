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
            then 'OK' else 'FALTA' end
union all
select 'Migración 009 — función is_club_admin',
       case when exists (select 1 from pg_proc where proname = 'is_club_admin')
            then 'OK' else 'FALTA' end
union all
select 'Migración 009 — tope de 3 administradores (trigger)',
       case when exists (select 1 from pg_trigger where tgname = 'trg_max_admins')
            then 'OK' else 'FALTA' end
union all
select 'Migración 009 — protección contra quedarse sin administradores',
       case when exists (select 1 from pg_trigger where tgname = 'trg_prevent_last_admin_leaving')
        and exists (select 1 from pg_trigger where tgname = 'trg_prevent_last_admin_demotion')
            then 'OK' else 'FALTA' end
union all
select 'Migración 009 — tabla de volúmenes',
       case when exists (select 1 from information_schema.tables where table_name = 'volumes')
            then 'OK' else 'FALTA' end
union all
select 'Migración 009 — política: administradores crean capítulos',
       case when exists (select 1 from pg_policies where tablename = 'chapters' and policyname = 'administradores crean capítulos en su club')
            then 'OK' else 'FALTA' end
union all
select 'Migración 009 — ya no quedan roles "owner"',
       case when not exists (select 1 from public.club_members where role = 'owner')
            then 'OK' else 'FALTA' end
union all
select 'Migración 010 — número de capítulo único por volumen',
       case when exists (select 1 from pg_indexes where tablename = 'chapters' and indexname = 'chapters_number_por_volumen')
        and exists (select 1 from pg_indexes where tablename = 'chapters' and indexname = 'chapters_number_sin_volumen')
            then 'OK' else 'FALTA' end
union all
select 'Migración 011 — progreso por página',
       case when exists (select 1 from information_schema.columns where table_name = 'reading_progress' and column_name = 'current_page')
        and exists (select 1 from information_schema.columns where table_name = 'reading_progress' and column_name = 'total_pages')
            then 'OK' else 'FALTA' end
union all
select 'Migración 012 — mensajes en español neutro',
       case when exists (select 1 from pg_proc where proname = 'prevent_last_admin_leaving' and prosrc not like '%Nombrá%')
        and not exists (select 1 from public.editorial_items where body like '%che, esto me voló%')
            then 'OK' else 'FALTA' end
union all
select 'Migración 013 — encuadre de portada',
       case when exists (select 1 from information_schema.columns where table_name = 'books' and column_name = 'cover_crop')
        and exists (select 1 from information_schema.columns where table_name = 'books' and column_name = 'cover_has_title')
        and exists (select 1 from pg_policies where tablename = 'books' and policyname = 'administradores actualizan los libros de su club')
            then 'OK' else 'FALTA' end
union all
select 'Migración 014 — join_mode en clubs',
       case when exists (select 1 from information_schema.columns where table_name = 'clubs' and column_name = 'join_mode')
            then 'OK' else 'FALTA' end
union all
select 'Migración 014 — tabla de solicitudes',
       case when exists (select 1 from information_schema.tables where table_name = 'club_join_requests')
            then 'OK' else 'FALTA' end
union all
select 'Migración 014 — política: administradores suman con solicitud aprobada',
       case when exists (select 1 from pg_policies where tablename = 'club_members' and policyname = 'administradores suman gente con solicitud aprobada')
            then 'OK' else 'FALTA' end
union all
select 'Migración 014 — discover_public_clubs incluye join_mode',
       case when exists (
              select 1 from information_schema.routines
              where routine_name = 'discover_public_clubs' and data_type = 'record'
            ) and exists (
              select 1 from pg_proc where proname = 'discover_public_clubs' and prosrc like '%join_mode%'
            )
            then 'OK' else 'FALTA' end
union all
select 'Migración 015 — bio en profiles',
       case when exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'bio')
            then 'OK' else 'FALTA' end
union all
select 'Migración 015 — bucket de avatares',
       case when exists (select 1 from storage.buckets where id = 'avatars')
            then 'OK' else 'FALTA' end
union all
select 'Migración 015 — tabla de seguidores',
       case when exists (select 1 from information_schema.tables where table_name = 'follows')
            then 'OK' else 'FALTA' end
union all
select 'Migración 015 — función profile_activity',
       case when exists (select 1 from pg_proc where proname = 'profile_activity')
            then 'OK' else 'FALTA' end
union all
select 'Migración 015 — función profile_stats',
       case when exists (select 1 from pg_proc where proname = 'profile_stats')
            then 'OK' else 'FALTA' end;
