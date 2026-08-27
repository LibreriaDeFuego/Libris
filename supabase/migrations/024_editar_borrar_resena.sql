-- Libris — migración 024: editar o borrar tu propia reseña final.
--
-- Hasta ahora "comments" no tenía política de update ni de delete —
-- nadie podía tocar lo que ya había publicado. Se agrega para quien es
-- dueño del comentario (cualquier kind, no solo reseñas — la política es
-- general; por ahora la UI solo ofrece editar/borrar reseñas, kind =
-- 'review', desde el menú de 3 puntos junto al nombre de quien publicó).

create policy "cada quien edita sus propios comentarios"
  on public.comments for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "cada quien borra sus propios comentarios"
  on public.comments for delete to authenticated
  using (profile_id = auth.uid());
