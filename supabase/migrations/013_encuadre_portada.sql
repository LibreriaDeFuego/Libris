-- Libris — migración 013: encuadre de portada para el héroe A2.
--
-- cover_crop: el recuadro que decide qué parte de la portada se ve en el
-- héroe, guardado como 4 números normalizados (0–1) respecto del tamaño
-- natural de la imagen — no como transform en píxeles, para que sirva para
-- el héroe, miniaturas o cualquier tamaño futuro sin recortar el archivo:
--   { x, y, w, h }
-- cover_has_title: la tapa ya trae el título impreso, así que el héroe no
-- lo vuelve a escribir encima. Default true — la mayoría de las tapas
-- reales ya lo traen.
alter table public.books add column if not exists cover_crop jsonb;
alter table public.books add column if not exists cover_has_title boolean not null default true;

-- El editor de encuadre vive en el panel de administradores; alineamos la
-- política de books con eso (antes cualquier miembro podía editar el libro,
-- de una etapa anterior a que existiera el rol de administrador).
drop policy if exists "miembros actualizan los libros de su club" on public.books;
create policy "administradores actualizan los libros de su club"
  on public.books for update to authenticated
  using (exists (
    select 1 from public.club_books cb
    where cb.book_id = books.id and public.is_club_admin(cb.club_id)
  ));
