-- Libris — migración 002: completa lo que la app necesita para funcionar
-- de punta a punta (faltaba en el esquema inicial).
-- Correr DESPUÉS de supabase/schema.sql, una sola vez.

-- ============================================================
-- Crear el perfil automáticamente cuando alguien se registra
-- (auth.signUp no toca public.profiles por sí solo)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Políticas de INSERT que faltaban (books/club_books/chapters no
-- tenían ninguna, así que RLS las bloqueaba por completo)
-- ============================================================
create policy "authenticated users create books"
  on public.books for insert
  with check (auth.role() = 'authenticated');

create policy "members create club_books in their clubs"
  on public.club_books for insert
  with check (public.is_club_member(club_id));

create policy "members create chapters in their clubs"
  on public.chapters for insert
  with check (exists (
    select 1 from public.club_books cb
    where cb.id = club_book_id and public.is_club_member(cb.club_id)
  ));

-- ============================================================
-- Endurece el insert de reading_progress: además de ser el dueño
-- de la fila, hay que ser miembro del club dueño de ese club_book.
-- ============================================================
drop policy if exists "users manage their own progress" on public.reading_progress;
create policy "users create progress in clubs they belong to"
  on public.reading_progress for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.club_books cb
      where cb.id = club_book_id and public.is_club_member(cb.club_id)
    )
  );
