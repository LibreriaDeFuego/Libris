-- Libris — migración 060: un club puede leer varios libros a la vez, y
-- ninguno se cierra solo.
--
-- Hasta acá, "empezar un libro nuevo" (migración 056) ARCHIVABA el libro
-- que se dejaba (is_active = false) — apenas arrancaba el nuevo, el viejo
-- dejaba de poder comentarse o marcar progreso (solo quedaba una vista de
-- solo lectura, migración 058). Se pidió lo contrario: que un libro nunca
-- se cierre por las suyas, y que un club pueda tener más de uno "en
-- curso" a la vez (alguien quiere leer dos cosas en paralelo).
--
-- La solución es separar dos preguntas que `is_active` venía contestando
-- juntas:
--   - ¿Se puede seguir participando? → sigue siendo `is_active`. Ahora
--     puede haber VARIAS filas en true a la vez por club (antes, como
--     mucho una) — se vuelve false únicamente si alguien archiva el libro
--     a mano (todavía no hay botón para eso; se deja preparado).
--   - ¿Es el libro que se destaca? (la tarjeta de "Mis clubes de
--     lectura", lo que abre por default "Tu camino") → columna nueva,
--     `is_principal`. Como mucho una fila en true por club — eso sí se
--     seguía necesitando, para no romper ninguna pantalla que asume "el"
--     libro del club.
--
-- Con esto, los libros existentes NO cambian de comportamiento: el que
-- hoy es is_active = true pasa a ser además is_principal = true (sigue
-- siendo "el" libro del club); los que ya estaban archivados
-- (is_active = false) se quedan exactamente igual — is_principal en
-- false, is_active en false, la vista de solo lectura de la migración
-- 058 los sigue mostrando tal cual.

alter table public.club_books add column if not exists is_principal boolean not null default false;

update public.club_books set is_principal = true where is_active = true;

-- A lo sumo un libro principal por club — mismo criterio que ya regía
-- is_active antes de esta migración, pero ahora puesto como constraint de
-- verdad (antes solo lo cuidaba el código de la app).
create unique index if not exists club_books_un_solo_principal_por_club
  on public.club_books (club_id)
  where is_principal;

-- Nada que tocar en las policies de UPDATE/INSERT de club_books (migración
-- 056) — siguen restringidas a administradores del club, y esa sigue
-- siendo la regla correcta tanto para mover is_principal como para, el
-- día de mañana, archivar un libro a mano.
