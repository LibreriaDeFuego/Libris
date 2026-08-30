// Los capítulos se muestran agrupados por volumen (en el orden en que se
// crearon los volúmenes), y los que no están en ningún volumen van al final,
// ordenados por su número. Si el club nunca creó un volumen, esto da
// exactamente el mismo orden plano de siempre.
export function orderChapters(chapters, volumes) {
  const byNumber = (a, b) => a.number - b.number;
  const volumeIds = new Set((volumes ?? []).map((v) => v.id));
  const sortedVolumes = [...(volumes ?? [])].sort((a, b) => a.position - b.position);

  const result = [];
  for (const volume of sortedVolumes) {
    result.push(...chapters.filter((c) => c.volume_id === volume.id).sort(byNumber));
  }
  result.push(...chapters.filter((c) => !c.volume_id || !volumeIds.has(c.volume_id)).sort(byNumber));
  return result;
}

// Agrupa los capítulos por volumen para mostrarlos con su encabezado.
// Devuelve [{ volume: {id, name, position} | null, chapters: [...] }].
export function groupChaptersByVolume(chapters, volumes) {
  const byNumber = (a, b) => a.number - b.number;
  const volumeIds = new Set((volumes ?? []).map((v) => v.id));
  const sortedVolumes = [...(volumes ?? [])].sort((a, b) => a.position - b.position);

  const groups = sortedVolumes.map((volume) => ({
    volume,
    chapters: chapters.filter((c) => c.volume_id === volume.id).sort(byNumber),
  }));

  const unassigned = chapters.filter((c) => !c.volume_id || !volumeIds.has(c.volume_id)).sort(byNumber);
  if (unassigned.length > 0) groups.push({ volume: null, chapters: unassigned });

  return groups;
}

// "Cap. 1. El inicio" si tiene nombre propio, o el label viejo ("Cap. 1")
// para los capítulos que nunca se renombraron.
export function chapterDisplayLabel(chapter) {
  if (chapter.title) return `Cap. ${chapter.number}. ${chapter.title}`;
  return chapter.label ?? `Cap. ${chapter.number}`;
}

// Versión corta, sin el título propio — para los chips de navegación rápida
// del héroe del club, donde el título completo no entra.
export function chapterShortLabel(chapter) {
  return chapter.label ?? `Cap. ${chapter.number}`;
}
