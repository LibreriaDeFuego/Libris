import { buildClubActivity } from '@/lib/clubActivity';

// Todo lo que necesitan "Tu camino" y "Actividad del club" para un club
// puntual, más allá del libro activo (que ya se resuelve aparte con
// getActiveClubBook). Lo usa /club/[clubId] al entrar a un club.
export async function getClubHeroExtras(supabase, { clubId, clubBookId, userId, isAdmin }) {
  if (!clubBookId) {
    return { chapters: [], volumes: [], myProgress: null, myReview: null, activity: [], pendingRequestCount: 0 };
  }

  const [
    { data: chapters },
    { data: volumes },
    { data: myProgress },
    { data: myReview },
    { count: pendingRequestCount },
    { data: recentComments },
    { data: recentReviews },
  ] = await Promise.all([
    supabase.from('chapters').select('id, number, title, label, volume_id').eq('club_book_id', clubBookId).order('number'),
    supabase.from('volumes').select('id, name, position').eq('club_book_id', clubBookId).order('position'),
    supabase
      .from('reading_progress')
      .select('chapter_id, percent, reaction, current_page, total_pages, streak_count')
      .eq('club_book_id', clubBookId)
      .eq('profile_id', userId)
      .maybeSingle(),
    supabase
      .from('comments')
      .select('id, title, body, is_spoiler')
      .eq('club_book_id', clubBookId)
      .eq('profile_id', userId)
      .eq('kind', 'review')
      .maybeSingle(),
    isAdmin
      ? supabase.from('club_join_requests').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'pending')
      : Promise.resolve({ count: 0 }),
    supabase
      .from('comments')
      .select('id, chapter_id, created_at, profile_id, profiles(display_name, avatar_url)')
      .eq('club_book_id', clubBookId)
      .is('parent_comment_id', null)
      .neq('kind', 'review')
      .order('created_at', { ascending: false })
      .limit(24),
    supabase
      .from('comments')
      .select('id, created_at, profile_id, profiles(display_name, avatar_url)')
      .eq('club_book_id', clubBookId)
      .eq('kind', 'review')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const chaptersById = new Map((chapters ?? []).map((c) => [c.id, c]));
  const activity = buildClubActivity({ comments: recentComments, reviews: recentReviews, chaptersById });

  return {
    chapters: chapters ?? [],
    volumes: volumes ?? [],
    myProgress: myProgress ?? null,
    myReview: myReview ?? null,
    activity,
    pendingRequestCount: pendingRequestCount ?? 0,
  };
}

// Versión liviana de lo de arriba: solo lo que hace falta para calcular el
// % y el capítulo actual (computeHeroProgress, en src/lib/heroProgress.js)
// — la usa "Mis clubes de lectura" para la tarjeta de cada club, sin traer
// reseña, actividad ni solicitudes pendientes, que ahí no se muestran.
export async function getClubProgressSummary(supabase, { clubBookId, userId }) {
  if (!clubBookId) return { chapters: [], volumes: [], myProgress: null };

  const [{ data: chapters }, { data: volumes }, { data: myProgress }] = await Promise.all([
    supabase.from('chapters').select('id, number, title, label, volume_id').eq('club_book_id', clubBookId).order('number'),
    supabase.from('volumes').select('id, name, position').eq('club_book_id', clubBookId).order('position'),
    supabase
      .from('reading_progress')
      .select('chapter_id, percent, current_page, total_pages')
      .eq('club_book_id', clubBookId)
      .eq('profile_id', userId)
      .maybeSingle(),
  ]);

  return { chapters: chapters ?? [], volumes: volumes ?? [], myProgress: myProgress ?? null };
}

// Cuántos comentarios (sin contar reseñas) tiene cada capítulo — para la
// pastilla de "Comentarios" en Tu camino (ChapterPath). Trae chapter_id +
// kind (+ si ese comentario tiene fotos) de cada fila y cuenta acá mismo:
// no hay forma de pedirle a Supabase un GROUP BY sin una función RPC
// aparte, y para un libro esto es liviano (unas pocas columnas, sin texto
// ni joins de más — comment_photos(id) solo para saber si hay alguna,
// no cuántas).
//
// El total sigue siendo el mismo de siempre (todo tipo salvo reseña); acá
// se suma, por capítulo, si ADEMÁS hay alguna nota de voz y/o algún
// comentario de texto con foto/GIF — la pastilla (SideExtras, ChapterPath)
// los muestra como íconos junto al total, sin desglosar cuántos hay de
// cada uno.
//
// "repost_id is null" (migración 040) — sin este filtro, un comentario
// que alguien dejó en el REPOST de una cita de este club (que vive
// scopeado a ese repost, no al club) se sumaría acá igual, inflando el
// número que ve todo el club por algo que en realidad pasó en el feed de
// otra persona.
export async function getChapterCommentCounts(supabase, clubBookId) {
  if (!clubBookId) return {};

  const { data } = await supabase
    .from('comments')
    .select('chapter_id, kind, comment_photos(id)')
    .eq('club_book_id', clubBookId)
    .not('chapter_id', 'is', null)
    .neq('kind', 'review')
    .is('repost_id', null);

  const counts = {};
  for (const row of data ?? []) {
    const entry = counts[row.chapter_id] ?? { total: 0, hasVoice: false, hasPhoto: false };
    entry.total += 1;
    if (row.kind === 'voice') entry.hasVoice = true;
    if (Array.isArray(row.comment_photos) && row.comment_photos.length > 0) entry.hasPhoto = true;
    counts[row.chapter_id] = entry;
  }
  return counts;
}

// Preguntas de capítulo (migraciones 053/054): qué capítulos tienen, para
// ESTE usuario, alguna pregunta armada — para el distintivo que ChapterPath
// dibuja sobre el nodo (mockup "Ordenar el capítulo cargado", opción
// elegida: un solo circulito fijo, sin sumar ninguna fila nueva al
// camino). Trae TODAS las preguntas del libro de una sola vez, igual que
// getChapterCommentCounts — evita un viaje al servidor por cada capítulo
// del camino.
//
// Separado en dos listas, no una sola: "pending" (todavía hay algo sin
// responder ahí — el distintivo se ve sólido, invita a entrar) y
// "answered" (ya respondiste TODAS las de ese capítulo — el distintivo
// queda apagado, pero se sigue viendo para poder volver a entrar y ver qué
// contestaron los demás; antes desaparecía del todo al responder, y no
// había forma de volver a abrirlo). Un capítulo con alguna pendiente Y
// alguna ya respondida cuenta como "pending" nada más — todavía hay algo
// por hacer ahí, entrar muestra las dos igual (mezcladas, en el mismo
// orden de siempre).
export async function getChaptersWithQuestions(supabase, clubBookId, userId) {
  if (!clubBookId) return { pending: [], answered: [] };

  const { data: questions } = await supabase
    .from('chapter_questions')
    .select('id, chapter_id')
    .eq('club_book_id', clubBookId);
  if (!questions || questions.length === 0) return { pending: [], answered: [] };

  const { data: myAnswers } = await supabase
    .from('chapter_question_answers')
    .select('question_id')
    .eq('profile_id', userId)
    .in('question_id', questions.map((q) => q.id));
  const answeredIds = new Set((myAnswers ?? []).map((a) => a.question_id));

  const pending = new Set();
  const answered = new Set();
  for (const q of questions) {
    if (answeredIds.has(q.id)) answered.add(q.chapter_id);
    else pending.add(q.chapter_id);
  }
  for (const chapterId of pending) answered.delete(chapterId);

  return { pending: [...pending], answered: [...answered] };
}
