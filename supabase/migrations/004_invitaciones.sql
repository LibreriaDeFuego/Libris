-- Libris — migración 004: datos mínimos del club para la pantalla de invitación.
-- Correr DESPUÉS de 003_fix_club_creation.sql, una sola vez.
--
-- Por qué: quien abre un link de invitación todavía no es miembro, así que RLS
-- le impide leer la fila del club y la pantalla no podría decirle a qué club lo
-- están invitando. Esta función corre como security definer y expone SOLO
-- nombre, cantidad de miembros y libro activo, y únicamente a quien ya conoce
-- el UUID del club (que funciona como token de invitación).

create or replace function public.club_invite_info(target_club_id uuid)
returns table (name text, member_count bigint, book_title text)
language sql
security definer
stable
set search_path = public
as $$
  select c.name,
         (select count(*) from club_members m where m.club_id = c.id),
         (select b.title
            from club_books cb
            join books b on b.id = cb.book_id
           where cb.club_id = c.id and cb.is_active
           limit 1)
    from clubs c
   where c.id = target_club_id;
$$;

revoke all on function public.club_invite_info(uuid) from public;
grant execute on function public.club_invite_info(uuid) to authenticated;
