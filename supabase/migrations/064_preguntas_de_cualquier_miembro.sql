-- Libris — migración 064: cualquier miembro puede armar preguntas de
-- capítulo, no solo los administradores.
--
-- Hasta acá (migración 053), armar una pregunta era privilegio de
-- administradores — "Gestionar capítulos" y el broche "+" de Tu camino
-- solo le mostraban la pestaña "Pregunta" a quien tuviera ese rol. Se
-- pidió abrirlo a cualquier miembro del club.
--
-- Quien arma una pregunta puede editarla o borrarla después (antes,
-- un administrador podía editar/borrar cualquiera, pero nadie más podía
-- tocar las suyas); un administrador sigue pudiendo editar o borrar
-- CUALQUIER pregunta del club además de las propias — mismo criterio de
-- moderación que ya rige comentarios.

drop policy if exists "administradores arman preguntas de capítulo" on public.chapter_questions;
create policy "miembros arman preguntas de capítulo"
  on public.chapter_questions for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.club_books cb
      where cb.id = chapter_questions.club_book_id and public.is_club_member(cb.club_id)
    )
  );

drop policy if exists "administradores editan preguntas de capítulo" on public.chapter_questions;
create policy "quien armó la pregunta o un administrador la editan"
  on public.chapter_questions for update to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.club_books cb
      join public.club_members m on m.club_id = cb.club_id
      where cb.id = chapter_questions.club_book_id and m.profile_id = auth.uid() and m.role = 'admin'
    )
  );

drop policy if exists "administradores borran preguntas de capítulo" on public.chapter_questions;
create policy "quien armó la pregunta o un administrador la borran"
  on public.chapter_questions for delete to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.club_books cb
      join public.club_members m on m.club_id = cb.club_id
      where cb.id = chapter_questions.club_book_id and m.profile_id = auth.uid() and m.role = 'admin'
    )
  );
