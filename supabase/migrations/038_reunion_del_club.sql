-- Fecha y lugar de la próxima reunión del club. "Lugar" admite dos
-- modalidades: un link (Zoom, Meet...) o un lugar físico (dirección o
-- nombre de local, del que se arma un link a Google Maps del lado del
-- cliente — no hace falta guardar coordenadas ni pedir una API key).
--
-- meeting_at es "timestamp" sin huso horario a propósito, mismo criterio
-- que ya usa el resto de la app para fechas (ver formatRelativeTime.js /
-- utcDateString): lo que la persona administradora escribe en el input
-- datetime-local se guarda tal cual y se muestra tal cual, sin convertir
-- entre husos — más simple, y server RLS no depende de esta columna.
alter table public.clubs
  add column if not exists meeting_at timestamp,
  add column if not exists meeting_mode text check (meeting_mode in ('link', 'lugar')),
  add column if not exists meeting_link text,
  add column if not exists meeting_place text;

-- Sin política nueva: la de "los administradores editan su club"
-- (migración 009) ya cubre cualquier columna de la fila, y "members read
-- their clubs" ya deja leer la fila entera a cualquier integrante.
