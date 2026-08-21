import { orderChapters, chapterDisplayLabel } from '@/lib/orderChapters';

// Con más de este número de capítulos los pips se vuelven ilegibles: cae a
// una barra continua (igual que cuando el progreso se registró por página,
// donde no hay un capítulo puntual que resaltar).
const PIP_LIMIT = 40;

// Todo lo que necesita el héroe para mostrar "en qué vas": la etiqueta de
// progreso, la unidad ("24 capítulos") y los pips (o la barra continua).
// Una sola función para que el héroe real y la vista previa del editor de
// encuadre calculen exactamente lo mismo a partir de los mismos datos.
export function computeHeroProgress({ chapters, volumes, myProgress, percent }) {
  const list = chapters ?? [];
  const ordered = orderChapters(list, volumes ?? []);
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

  const unit = totalChapters > 0 ? `${totalChapters} ${totalChapters === 1 ? 'capítulo' : 'capítulos'}` : null;

  let pips = { type: 'bar', percent: percent ?? 0 };
  if (currentChapter && totalChapters > 0 && totalChapters <= PIP_LIMIT) {
    const nowIndex = ordered.findIndex((c) => c.id === currentChapter.id);
    pips = { type: 'pips', total: totalChapters, nowIndex: nowIndex === -1 ? 0 : nowIndex };
  }

  return { progressMeta, unit, pips, totalChapters };
}
