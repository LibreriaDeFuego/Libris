-- Libris — migración 025: limitar editar/borrar a la reseña final.
--
-- La migración 024 dejó la política general: cualquier comentario
-- (de capítulo, cita, nota de voz) quedaba editable/borrable por su
-- dueño, no solo la reseña final. Eso no correspondía — lo que se pidió
-- y se armó (menú de 3 puntos, PostMenu.jsx) es solo para la reseña,
-- kind = 'review'. El resto no tiene todavía ni la UI ni la limpieza de
-- Storage que haría falta (borrar una cita borraría también su imagen
-- guardada; borrar una nota de voz, su audio) — se deja pendiente,
-- a propósito, para cuando se pida explícitamente.

drop policy if exists "cada quien edita sus propios comentarios" on public.comments;
create policy "cada quien edita su propia reseña"
  on public.comments for update to authenticated
  using (profile_id = auth.uid() and kind = 'review')
  with check (profile_id = auth.uid() and kind = 'review');

drop policy if exists "cada quien borra sus propios comentarios" on public.comments;
create policy "cada quien borra su propia reseña"
  on public.comments for delete to authenticated
  using (profile_id = auth.uid() and kind = 'review');
