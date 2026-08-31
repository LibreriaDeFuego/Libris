import { formatRelativeTime } from '@/lib/formatRelativeTime';

// Arma la lista chica de "Actividad del club": junta comentarios recientes
// del mismo capítulo (varias personas comentando ahí cuentan como una sola
// tarjeta, con el nombre de la primera y "y N más") y reseñas finales (cada
// una su propia tarjeta — terminar el libro es un hito personal, no se
// agrupa). La más reciente primero.
//
// comments/reviews ya vienen ordenados por created_at desc y acotados
// (page.js pide los últimos N) — es una ventana de "lo más reciente", no
// "todo lo que pasó alguna vez en este capítulo".
export function buildClubActivity({ comments, reviews, chaptersById, limit = 4 }) {
  const groups = new Map(); // chapter_id (o 'general') -> { chapterId, authors: Map(profile_id -> {name, avatarUrl}), latest }

  for (const c of comments ?? []) {
    const key = c.chapter_id ?? 'general';
    if (!groups.has(key)) {
      groups.set(key, { chapterId: c.chapter_id, authors: new Map(), latest: c.created_at });
    }
    const group = groups.get(key);
    if (!group.authors.has(c.profile_id)) {
      group.authors.set(c.profile_id, { name: c.profiles?.display_name ?? 'Alguien', avatarUrl: c.profiles?.avatar_url ?? null });
    }
    if (c.created_at > group.latest) group.latest = c.created_at;
  }

  const commentItems = Array.from(groups.values()).map((group) => {
    const authors = Array.from(group.authors.values());
    const chapterNumber = group.chapterId ? chaptersById?.get(group.chapterId)?.number : null;
    const where = chapterNumber ? `el Capítulo ${chapterNumber}` : 'el libro';
    const label = authors.length === 1
      ? `${authors[0].name} comentó ${where}`
      : `${authors[0].name} y ${authors.length - 1} más comentaron ${where}`;
    return { key: `comments-${group.chapterId ?? 'general'}`, label, createdAt: group.latest, authors: authors.slice(0, 2), chapterId: group.chapterId ?? null };
  });

  const reviewItems = (reviews ?? []).map((r) => ({
    key: `review-${r.id}`,
    label: `${r.profiles?.display_name ?? 'Alguien'} terminó el libro y dejó su reseña`,
    createdAt: r.created_at,
    authors: [{ name: r.profiles?.display_name ?? 'Alguien', avatarUrl: r.profiles?.avatar_url ?? null }],
  }));

  return [...commentItems, ...reviewItems]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .map((item) => ({ ...item, relativeTime: formatRelativeTime(item.createdAt) }));
}
