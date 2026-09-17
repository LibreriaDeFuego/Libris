-- Libris — migración 056: un administrador puede empezar un libro nuevo
-- para el club — hasta acá, el club quedaba pegado para siempre al primer
-- libro que se eligió al crearlo (`createClub`, único lugar que insertaba
-- en club_books). No había ninguna forma de decir "ya terminamos este,
-- ahora leemos otro" sin, literalmente, crear un club nuevo de cero.
--
-- El libro que se deja se ARCHIVA (is_active = false) — sus comentarios,
-- progreso de cada persona y preguntas de capítulo quedan guardados tal
-- cual en la base, nada se borra — pero dejan de verse en Tu camino y
-- Comentarios del club apenas arranca el nuevo (hoy no hay ninguna
-- pantalla para volver a ver un libro "viejo" del club).
--
-- Todo escrito para poder volver a correrse sin romper (drop policy if
-- exists antes de cada create policy) — mismo criterio que el resto de
-- las migraciones recientes.

-- ============================================================
-- club_books nunca tuvo policy de UPDATE — hacía falta para poder
-- desactivar el libro que se deja.
-- ============================================================
drop policy if exists "administradores cierran y abren libros del club" on public.club_books;
create policy "administradores cierran y abren libros del club"
  on public.club_books for update to authenticated
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

-- ============================================================
-- La policy de INSERT de la migración 002 dejaba a CUALQUIER miembro
-- crear un club_books — nadie lo explotó nunca porque la app no tenía
-- ningún botón para esto, pero ahora que sí lo tiene, conviene que quede
-- tan restringida como el resto de las acciones de administrador (mismo
-- criterio que ya sigue "Gestionar capítulos", editar el club, etc.).
-- ============================================================
drop policy if exists "members create club_books in their clubs" on public.club_books;
drop policy if exists "administradores crean libros nuevos en su club" on public.club_books;
create policy "administradores crean libros nuevos en su club"
  on public.club_books for insert to authenticated
  with check (public.is_club_admin(club_id));
