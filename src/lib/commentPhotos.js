// Las fotos que se pueden adjuntar a un comentario de capítulo (migración
// 041, carrusel en la 042) viven en un bucket PRIVADO ("comment-photos")
// — es una conversación de adentro de un club, mismo criterio que ya usan
// las notas de voz (voice-notes). Por eso cada fila de "recent_activity"/
// "profile_activity"/la consulta directa a "comments" trae "image_urls"
// como un arreglo de PATHS, no de URLs — hay que firmarlos del lado del
// servidor antes de mandarlos al navegador, en cualquier lugar donde un
// comentario pueda llegar con sus fotos: Comentarios del club, y también
// Inicio/Perfil si ese comentario se compartió al feed.
export async function signCommentImageUrls(supabase, rows) {
  const list = rows ?? [];
  const allPaths = list.flatMap((r) => (Array.isArray(r.image_urls) ? r.image_urls : []));
  if (allPaths.length === 0) return list;

  const { data: signed } = await supabase.storage.from('comment-photos').createSignedUrls(allPaths, 60 * 60);
  const signedByPath = new Map();
  for (const entry of signed ?? []) {
    if (entry.signedUrl) signedByPath.set(entry.path, entry.signedUrl);
  }
  return list.map((r) => (
    Array.isArray(r.image_urls) && r.image_urls.length > 0
      ? { ...r, image_urls: r.image_urls.map((p) => signedByPath.get(p)).filter(Boolean) }
      : r
  ));
}
