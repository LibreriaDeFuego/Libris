-- Libris — migración 043: arregla la política de Storage que dejaba sin
-- leer NINGUNA foto de comentario, aunque la subida funcionara bien.
--
-- La política de SELECT que agregó la migración 042 (para ampliar la
-- visibilidad a "club sin invitación, o sos miembro", mismo criterio que
-- recent_activity) se armó así:
--
--   exists (
--     select 1 from public.club_books cb
--     join public.clubs cl on cl.id = cb.club_id
--     where cb.id::text = (storage.foldername(name))[1]
--       and (cl.join_mode <> 'invite' or public.is_club_member(cl.id))
--   )
--
-- El "name" de storage.foldername(name) debía ser el nombre del ARCHIVO
-- (name de storage.objects, la fila que la política evalúa). Pero adentro
-- de ese "exists" también hay una tabla "clubs cl", que TAMBIÉN tiene una
-- columna "name" (el nombre del club) — y Postgres, sin ninguna
-- ambigüedad ni error, resuelve ese "name" suelto hacia la tabla más
-- cercana en el FROM del subquery: cl.name, no storage.objects.name.
--
-- Entonces la política terminaba comparando "cb.id" contra un pedazo del
-- NOMBRE DEL CLUB en vez de contra la carpeta real del archivo — algo que
-- nunca iba a coincidir con ningún club_book_id real. Resultado: la
-- política siempre daba falso, y createSignedUrls fallaba para
-- absolutamente todas las fotos ("Either the object does not exist or
-- you do not have access to it") aunque la subida (que usa la política
-- de INSERT, sin este join a "clubs", sin esta ambigüedad) funcionara
-- perfecto.
--
-- El arreglo: calificar explícitamente "storage.objects.name" para que no
-- quede ninguna duda de a qué tabla se refiere.

drop policy if exists "cualquiera con acceso al club ve las fotos de sus comentarios" on storage.objects;
create policy "cualquiera con acceso al club ve las fotos de sus comentarios"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'comment-photos'
    and exists (
      select 1 from public.club_books cb
      join public.clubs cl on cl.id = cb.club_id
      where cb.id::text = (storage.foldername(storage.objects.name))[1]
        and (cl.join_mode <> 'invite' or public.is_club_member(cl.id))
    )
  );
