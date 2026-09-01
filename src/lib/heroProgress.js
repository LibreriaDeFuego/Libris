import { chapterDisplayLabel } from '@/lib/orderChapters';

// Todo lo que necesita el héroe para mostrar "en qué vas": la etiqueta de
// progreso (capítulo actual, página, o cuántos capítulos tiene el libro).
// Antes también armaba pips (un punto por capítulo) para la barra de
// progreso cuando había pocos capítulos — se sacó: la barra siempre es
// continua ahora, sin importar cómo se registre el progreso.
export function computeHeroProgress({ chapters, myProgress }) {
  const list = chapters ?? [];
  const totalChapters = list.length;
  const currentChapter = myProgress?.chapter_id
    ? list.find((c) => c.id === myProgress.chapter_id) ?? null
    : null;

  let progressMeta;
  if (currentChapter) {
    progressMeta = chapterDisplayLabel(currentChapter);
  } else if (myProgress?.current_page != null && myProgress?.total_pages) {
    progressMeta = `Pág. ${myProgress.current_page} de ${myProgress.total_pages}`;
  } else if (totalChapters > 0) {
    progressMeta = `${totalChapters} ${totalChapters === 1 ? 'capítulo' : 'capítulos'}`;
  } else {
    progressMeta = 'Sin capítulos todavía';
  }

  return { progressMeta };
}
