-- Libris — migración 035: racha de lectura por libro de club.
--
-- Cuántos días seguidos venís marcando progreso en ESTE libro de ESTE club
-- (no es una racha global de la cuenta — coincide con lo que ya se
-- muestra junto al progreso de ese libro puntual). Se calcula en el
-- servidor, en updateProgress (src/app/actions/clubs.js), comparando
-- last_activity_date contra la fecha de hoy en UTC:
--   - primera vez, o el último registro fue hace 2+ días → streak_count = 1
--   - el último registro fue ayer → streak_count += 1
--   - el último registro ya fue hoy → no cambia (no se cuenta dos veces el mismo día)
--
-- No hace falta una tabla de historial aparte: alcanza con guardar el
-- conteo corrido y la última fecha, un valor más en la fila que ya existe
-- por persona y libro.

alter table public.reading_progress add column if not exists streak_count int not null default 0;
alter table public.reading_progress add column if not exists last_activity_date date;
