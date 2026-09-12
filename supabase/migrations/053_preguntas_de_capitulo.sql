-- Libris — migración 053: preguntas de capítulo (encuesta / pregunta
-- abierta / trivia) que arma el administrador del club.
--
-- Un administrador arma, para un capítulo puntual, una de tres cosas:
--   - "poll"   (encuesta): opciones fijas, sin respuesta correcta.
--   - "open"   (pregunta abierta): texto libre.
--   - "trivia" (trivia): opciones fijas, una de ellas marcada como correcta.
-- Se dispara sola cuando alguien marca ESE capítulo como el que está
-- leyendo (mismo momento que ya muestra el toast "Listo, vas por el Cap.
-- N", en ChapterPath) — no hay ninguna otra forma de llegar a ella. Todo
-- el club ve el resultado agregado una vez que responde.
--
-- v1, a propósito acotada: un capítulo tiene como máximo UNA pregunta
-- (unique en chapter_id) — si el admin quiere otra, edita o borra la que
-- ya había. Sin edición de la propia respuesta una vez enviada (el
-- constraint de unicidad en chapter_question_answers ya lo impide).

-- ============================================================
-- 1. chapter_questions — la pregunta en sí, atada a un capítulo.
-- ============================================================
create table public.chapter_questions (
  id uuid primary key default gen_random_uuid(),
  club_book_id uuid not null references public.club_books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade unique,
  created_by uuid not null references public.profiles(id),
  kind text not null check (kind in ('poll', 'open', 'trivia')),
  prompt text not null,
  -- "options" solo tiene sentido en poll/trivia (mínimo 2); "open" no
  -- lleva ninguna. "correct_option_index" solo en trivia, y tiene que
  -- apuntar a una opción real.
  options text[],
  correct_option_index int,
  created_at timestamptz not null default now(),
  constraint chapter_questions_shape_check check (
    (kind = 'open' and options is null and correct_option_index is null)
    or (kind = 'poll' and options is not null and array_length(options, 1) >= 2 and correct_option_index is null)
    or (kind = 'trivia' and options is not null and array_length(options, 1) >= 2
        and correct_option_index is not null
        and correct_option_index >= 0 and correct_option_index < array_length(options, 1))
  )
);

alter table public.chapter_questions enable row level security;

create policy "miembros ven las preguntas de su club"
  on public.chapter_questions for select to authenticated
  using (exists (
    select 1 from public.club_books cb
    where cb.id = chapter_questions.club_book_id and public.is_club_member(cb.club_id)
  ));

create policy "administradores arman preguntas de capítulo"
  on public.chapter_questions for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.club_books cb
      join public.club_members m on m.club_id = cb.club_id
      where cb.id = chapter_questions.club_book_id and m.profile_id = auth.uid() and m.role = 'admin'
    )
  );

create policy "administradores editan preguntas de capítulo"
  on public.chapter_questions for update to authenticated
  using (exists (
    select 1 from public.club_books cb
    join public.club_members m on m.club_id = cb.club_id
    where cb.id = chapter_questions.club_book_id and m.profile_id = auth.uid() and m.role = 'admin'
  ));

create policy "administradores borran preguntas de capítulo"
  on public.chapter_questions for delete to authenticated
  using (exists (
    select 1 from public.club_books cb
    join public.club_members m on m.club_id = cb.club_id
    where cb.id = chapter_questions.club_book_id and m.profile_id = auth.uid() and m.role = 'admin'
  ));

-- ============================================================
-- 2. chapter_question_answers — una fila por persona que respondió.
--    "option_index" para poll/trivia, "body" para open — exactamente
--    uno de los dos, nunca los dos ni ninguno. Única por
--    (question_id, profile_id): no se puede responder dos veces.
-- ============================================================
create table public.chapter_question_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.chapter_questions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  option_index int,
  body text,
  created_at timestamptz not null default now(),
  unique (question_id, profile_id),
  constraint chapter_question_answers_shape_check check (
    (option_index is not null and body is null) or (option_index is null and body is not null)
  )
);

create index chapter_question_answers_question_id_idx on public.chapter_question_answers(question_id);

alter table public.chapter_question_answers enable row level security;

-- Cualquier miembro del club ve todas las respuestas (no solo la propia):
-- así se arma el resultado agregado — % de cada opción, o la lista de
-- respuestas abiertas de todo el club.
create policy "miembros ven las respuestas de su club"
  on public.chapter_question_answers for select to authenticated
  using (exists (
    select 1 from public.chapter_questions q
    join public.club_books cb on cb.id = q.club_book_id
    where q.id = chapter_question_answers.question_id and public.is_club_member(cb.club_id)
  ));

create policy "cada quien responde una vez por pregunta"
  on public.chapter_question_answers for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.chapter_questions q
      join public.club_books cb on cb.id = q.club_book_id
      where q.id = chapter_question_answers.question_id and public.is_club_member(cb.club_id)
    )
  );
