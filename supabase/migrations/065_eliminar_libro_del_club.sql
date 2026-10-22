-- Libris — migración 065: un administrador puede eliminar un libro del
-- club.
--
-- club_books nunca tuvo policy de DELETE — hacía falta para poder sacar
-- un libro agregado por error (título mal escrito, duplicado, lo que
-- sea). Borra en cascada todo lo que cuelga de él: capítulos, volúmenes,
-- progreso de lectura, comentarios y preguntas de capítulo — todas esas
-- tablas ya referencian club_books con "on delete cascade" desde que se
-- crearon (ver schema.sql y migraciones 009/053/055). El libro en sí (la
-- fila de "books") NO se borra — puede estar en uso de otro club.
drop policy if exists "administradores borran libros del club" on public.club_books;
create policy "administradores borran libros del club"
  on public.club_books for delete to authenticated
  using (public.is_club_admin(club_id));
