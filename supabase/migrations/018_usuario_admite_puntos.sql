-- Libris — migración 018: el nombre de usuario también admite puntos.
--
-- La migración 017 solo dejaba letras, números y guion bajo. Se agrega el
-- punto (para nombres como "nico.ferreyra"), sin permitir que el username
-- empiece, termine, o tenga dos puntos seguidos — evita cosas como
-- ".nico" o "nico..ferreyra". El mismo patrón vive en el código
-- (src/lib/username.js) para validar antes de llegar a la base.

alter table public.profiles drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^(?!.*\.\.)[a-z0-9_][a-z0-9_.]{1,18}[a-z0-9_]$');
