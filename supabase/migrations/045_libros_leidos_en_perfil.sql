-- Libris — migración 045: "Libros leídos" en el Perfil — la estantería
-- nueva que se ve como fondo, detrás del avatar (mockup aprobado en el
-- chat, artifact "Perfil y Estantería").
--
-- Necesita una lista real de libros TERMINADOS por la persona — no
-- alcanza con "book_count" (profile_stats, migración 015), que cuenta
-- libros con CUALQUIER progreso registrado (reading_progress), estén
-- terminados o no. La señal correcta de "terminé este libro" ya existe:
-- un comentario kind='review' (la reseña final, solo se puede dejar
-- después de marcar el último capítulo y tocar el nodo de FIN — ver
-- postBookReview en clubs.js). Un review por club_book_id; si la misma
-- persona leyó el mismo libro en dos clubes distintos, cuenta una vez
-- (se queda con la reseña más reciente para la fecha a mostrar).
--
-- Misma regla de visibilidad que profile_activity/profile_stats: tus
-- propias reseñas siempre se ven (target_profile_id = auth.uid()), las
-- de otra persona solo si el club es sin invitación o sos miembro.
create function public.profile_books_read(target_profile_id uuid, limit_count int default 30)
returns table (book_id uuid, title text, author text, cover_url text, reviewed_at timestamptz)
language sql security definer stable set search_path = public
as $$
  select book_id, title, author, cover_url, reviewed_at from (
    select distinct on (b.id)
           b.id as book_id, b.title, b.author, b.cover_url, c.created_at as reviewed_at
      from comments c
      join club_books cb on cb.id = c.club_book_id
      join clubs cl on cl.id = cb.club_id
      join books b on b.id = cb.book_id
     where c.profile_id = target_profile_id
       and c.kind = 'review'
       and (
         target_profile_id = auth.uid()
         or cl.join_mode <> 'invite'
         or exists (select 1 from club_members m where m.club_id = cl.id and m.profile_id = auth.uid())
       )
     order by b.id, c.created_at desc
  ) distinct_books
  order by reviewed_at desc
  limit limit_count;
$$;

revoke all on function public.profile_books_read(uuid, int) from public;
grant execute on function public.profile_books_read(uuid, int) to authenticated;
