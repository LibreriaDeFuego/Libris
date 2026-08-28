-- Libris — migración 026: editar el texto de tu propia foto.
--
-- "posts" ya tenía política de borrar (migración 016) pero no de editar —
-- se agrega, para el texto (caption) que acompaña la foto. La foto en sí
-- no se reemplaza desde acá (para cambiarla, conviene borrar y volver a
-- publicar) — mismo criterio que la reseña final, donde la portada tampoco
-- se puede reemplazar, solo el texto.

create policy "cada quien edita el texto de sus propias fotos"
  on public.posts for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
