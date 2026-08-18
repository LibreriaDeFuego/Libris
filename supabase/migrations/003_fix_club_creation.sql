-- Libris — migración 003: permitir que quien crea un club pueda leerlo.
-- Correr DESPUÉS de 002_app_additions.sql, una sola vez.
--
-- Por qué: al crear un club hacemos INSERT ... RETURNING id, y Postgres exige
-- que la fila devuelta también pase la política de SELECT. La política vieja
-- pedía ser miembro del club, pero la membresía se inserta un paso después,
-- así que la creación fallaba siempre.

drop policy if exists "members read their clubs" on public.clubs;

create policy "members and creator read their clubs"
  on public.clubs for select
  using (public.is_club_member(id) or created_by = auth.uid());
