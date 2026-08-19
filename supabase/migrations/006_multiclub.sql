-- Libris — migración 006: permitir salir de un club.
-- Correr DESPUÉS de 005, una sola vez.
--
-- Con multi-club un usuario puede pertenecer a varios clubes, así que también
-- necesita poder irse de uno. Solo puede borrar su propia membresía.

create policy "los usuarios pueden salir de un club"
  on public.club_members for delete to authenticated
  using (profile_id = auth.uid());
