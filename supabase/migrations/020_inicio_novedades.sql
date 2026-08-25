-- Libris — migración 020: pestaña Inicio, novedades de todos los usuarios.
--
-- Vuelve un feed general (la vieja "Novedades" se había sacado de la app
-- por quedar redundante con Recursos) — pero esta vez es actividad real de
-- la gente, no contenido editorial: por ahora, citas destacadas y fotos de
-- lo que están leyendo. Más adelante se suman otros tipos (comentarios,
-- notas de voz, "empezó a leer tal libro") extendiendo esta misma función,
-- con el mismo patrón de DROP + CREATE que ya usan profile_activity.
--
-- A diferencia de profile_activity (que es la actividad de UN perfil), acá
-- es de todos — mismo criterio de visibilidad de club que ya existe: las
-- citas de un club abierto o "con solicitud" se ven siempre; las de un club
-- privado (invite) solo si sos miembro. Las fotos son públicas siempre
-- (mismo criterio que ya tenían en profile_activity).

create function public.recent_activity(limit_count int default 30)
returns table (
  id uuid, kind text, body text, created_at timestamptz,
  profile_id uuid, display_name text, avatar_url text,
  club_id uuid, club_name text,
  book_title text, book_author text, book_cover_url text,
  photo_url text, quote_style text
)
language sql security definer stable set search_path = public
as $$
  select id, kind, body, created_at, profile_id, display_name, avatar_url,
         club_id, club_name, book_title, book_author, book_cover_url, photo_url, quote_style
    from (
      select c.id, 'quote'::text as kind, c.body, c.created_at,
             c.profile_id, p.display_name, p.avatar_url,
             cl.id as club_id, cl.name as club_name,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover_url,
             null::text as photo_url, c.quote_style
        from comments c
        join profiles p on p.id = c.profile_id
        join club_books cb on cb.id = c.club_book_id
        join clubs cl on cl.id = cb.club_id
        join books b on b.id = cb.book_id
       where c.kind = 'quote'
         and not c.is_spoiler
         and (
           cl.join_mode <> 'invite'
           or exists (select 1 from club_members m where m.club_id = cl.id and m.profile_id = auth.uid())
         )
      union all
      select po.id, 'photo'::text as kind, po.caption as body, po.created_at,
             po.profile_id, p.display_name, p.avatar_url,
             null::uuid as club_id, null::text as club_name,
             null::text as book_title, null::text as book_author, null::text as book_cover_url,
             po.image_url as photo_url, null::text as quote_style
        from posts po
        join profiles p on p.id = po.profile_id
    ) combined
   order by created_at desc
   limit limit_count;
$$;

revoke all on function public.recent_activity(int) from public;
grant execute on function public.recent_activity(int) to authenticated;
