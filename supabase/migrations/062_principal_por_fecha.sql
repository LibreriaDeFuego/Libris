-- Libris — migración 062: el libro principal pasa a CALCULARSE, no a
-- guardarse.
--
-- Desde la migración 060, is_principal era un flag que solo se movía a
-- mano: al crear un libro con "pasa a ser el principal" (o, después, con
-- "Hacer principal" en Preferencias — ya sacado de la app). Eso dejaba la
-- puerta abierta a que quedara desincronizado con la realidad — un libro
-- nuevo podía no terminar marcado si ese paso aparte fallaba, o si corría
-- contra una base donde la migración 060 nunca se había aplicado — y
-- nada lo corregía solo.
--
-- Se pidió explícitamente que esa elección deje de existir: "el último
-- libro que se agrega es el principal, y punto". Eso ya no es un estado
-- que haya que mover a mano, es una REGLA sobre la fecha de ingreso
-- (started_at, que club_books ya tenía desde siempre, migración 002). El
-- principal de un club pasa a ser, siempre, el libro ACTIVO con el
-- started_at más reciente — se calcula al leer (getPrincipalClubBook,
-- getClubOtherBooks), no se guarda más.
drop index if exists public.club_books_un_solo_principal_por_club;
alter table public.club_books drop column if exists is_principal;
