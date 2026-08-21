-- Libris — migración 012: pasar a español latinoamericano neutro (sin
-- voseo) los textos que quedaron con entonación argentina en la base:
-- los mensajes de los triggers de administradores (migración 009) y el
-- contenido editorial sembrado por la migración 005.

update public.editorial_items
set body = replace(
  replace(body, 'Elegí un primer libro corto', 'Elige un primer libro corto'),
  '"che, esto me voló la cabeza"', '"esto me voló la cabeza"'
)
where title = 'Cómo armar un club de lectura';

create or replace function public.prevent_last_admin_leaving()
returns trigger
language plpgsql
as $$
declare
  remaining_admins int;
  remaining_members int;
begin
  if old.role = 'admin' then
    select count(*) into remaining_admins from public.club_members
      where club_id = old.club_id and role = 'admin' and profile_id <> old.profile_id;
    if remaining_admins = 0 then
      select count(*) into remaining_members from public.club_members
        where club_id = old.club_id and profile_id <> old.profile_id;
      if remaining_members > 0 then
        raise exception 'Este club se quedaría sin administradores. Nombra a otro administrador antes de salir.';
      end if;
    end if;
  end if;
  return old;
end;
$$;

create or replace function public.prevent_last_admin_demotion()
returns trigger
language plpgsql
as $$
declare
  remaining_admins int;
  remaining_members int;
begin
  if old.role = 'admin' and new.role <> 'admin' then
    select count(*) into remaining_admins from public.club_members
      where club_id = old.club_id and role = 'admin' and profile_id <> old.profile_id;
    if remaining_admins = 0 then
      select count(*) into remaining_members from public.club_members
        where club_id = old.club_id and profile_id <> old.profile_id;
      if remaining_members > 0 then
        raise exception 'Este club se quedaría sin administradores. Nombra a otro administrador antes de sacarle el rol a este.';
      end if;
    end if;
  end if;
  return new;
end;
$$;
