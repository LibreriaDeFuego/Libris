-- Libris — migración 027: editar o borrar tu propia cita.
--
-- Las políticas de la migración 025 dejaron editar/borrar limitado a
-- kind = 'review'. Se amplían acá a kind = 'quote' también — ahora sí
-- correspondía, porque updateQuote/deleteQuote (src/app/actions/clubs.js)
-- ya limpian la imagen guardada en Storage al editar o borrar, que era
-- justo lo que faltaba para habilitarlo con seguridad. Comentarios de
-- capítulo y notas de voz siguen sin editar/borrar, a propósito.

drop policy if exists "cada quien edita su propia reseña" on public.comments;
create policy "cada quien edita su propia reseña o cita"
  on public.comments for update to authenticated
  using (profile_id = auth.uid() and kind in ('review', 'quote'))
  with check (profile_id = auth.uid() and kind in ('review', 'quote'));

drop policy if exists "cada quien borra su propia reseña" on public.comments;
create policy "cada quien borra su propia reseña o cita"
  on public.comments for delete to authenticated
  using (profile_id = auth.uid() and kind in ('review', 'quote'));
