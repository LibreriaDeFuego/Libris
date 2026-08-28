-- Libris — migración 028: editar o borrar tus propios comentarios de
-- capítulo y notas de voz.
--
-- Las políticas de las migraciones 025/027 dejaron editar/borrar limitado
-- a kind in ('review', 'quote'). Comentarios de capítulo (kind = 'text')
-- y notas de voz (kind = 'voice') quedaron afuera hasta ahora, a propósito
-- — para las notas de voz hacía falta poder limpiar el archivo de audio en
-- Storage al borrar, que es justo lo que agrega deleteVoiceComment
-- (src/app/actions/media.js). Comentarios de texto no tienen archivo
-- propio, así que no había nada que resolver ahí más que sumar la acción.
--
-- Con esto los cuatro tipos de comentario quedan editables/borrables por
-- su dueño — se listan igual los cuatro kind explícitamente (en vez de
-- sacar la condición del todo) para que un tipo nuevo el día de mañana no
-- quede editable "de arrastre" sin una decisión a propósito.

drop policy if exists "cada quien edita su propia reseña o cita" on public.comments;
create policy "cada quien edita sus propios comentarios"
  on public.comments for update to authenticated
  using (profile_id = auth.uid() and kind in ('review', 'quote', 'text', 'voice'))
  with check (profile_id = auth.uid() and kind in ('review', 'quote', 'text', 'voice'));

drop policy if exists "cada quien borra su propia reseña o cita" on public.comments;
create policy "cada quien borra sus propios comentarios"
  on public.comments for delete to authenticated
  using (profile_id = auth.uid() and kind in ('review', 'quote', 'text', 'voice'));
