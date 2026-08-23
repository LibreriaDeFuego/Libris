-- Libris — migración 017: nombre de usuario único (@usuario).
--
-- Cada perfil tiene ahora, además del nombre para mostrar, un nombre de
-- usuario propio y único — sirve para distinguir a dos personas con el
-- mismo nombre en el buscador y en el perfil. Las cuentas que ya existen
-- quedan con username = null a propósito: no se les asigna uno
-- automático sin avisar. La próxima vez que entren, la app los manda a
-- elegir el suyo antes de dejarlos seguir (ver /elegir-usuario).

alter table public.profiles add column if not exists username text;

alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;

-- Chequeo de disponibilidad que se puede llamar SIN sesión (durante el
-- registro, antes de que exista una cuenta) — RLS de "profiles" no deja
-- leer sin estar logueado, así que esta función (que solo devuelve
-- true/false, nada de la tabla) es la única forma segura de responder
-- "disponible" sin exponer el resto de los perfiles.
create or replace function public.is_username_available(check_username text)
returns boolean
language sql security definer stable set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where username = lower(check_username)
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

-- El registro ahora manda también el username elegido (signUp, en
-- login/actions.js) — el trigger que crea el perfil lo guarda junto con el
-- nombre para mostrar. Las cuentas creadas con Google no mandan username
-- (Google no lo pide) — quedan null, igual que las cuentas viejas, y pasan
-- por el mismo /elegir-usuario en su primer ingreso.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$$;
