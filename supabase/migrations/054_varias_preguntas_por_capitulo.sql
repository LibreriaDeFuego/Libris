-- Libris — migración 054: un capítulo puede tener varias preguntas, no
-- solo una.
--
-- La v1 (migración 053) limitaba cada capítulo a UNA sola pregunta
-- (chapter_id era unique en chapter_questions) — un admin no podía, por
-- ejemplo, tener una encuesta Y una trivia en el mismo capítulo, tenía
-- que elegir una sola. Se saca esa restricción.
--
-- El nombre "chapter_questions_chapter_id_key" es el que Postgres le puso
-- solo al declarar "unique" como constraint de columna (convención
-- "<tabla>_<columna>_key") — no hay que haberlo elegido a mano para
-- poder borrarlo por nombre.
alter table public.chapter_questions drop constraint if exists chapter_questions_chapter_id_key;

-- Sin el unique ya no queda ningún índice sobre chapter_id — se agrega
-- uno común: getChapterQuestions (clubs.js) filtra por ahí en cada
-- capítulo que se marca como el actual.
create index if not exists chapter_questions_chapter_id_idx on public.chapter_questions(chapter_id);
