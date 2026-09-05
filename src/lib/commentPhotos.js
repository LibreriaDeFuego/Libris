// La foto que se puede adjuntar a un comentario de capítulo (migración
// 041) vive en un bucket PRIVADO ("comment-photos") — es una conversación
// de adentro de un club, mismo criterio que ya usan las notas de voz
// (voice-notes). Por eso "comments.image_url" guarda el PATH del archivo,
// no una URL pública: hay que firmarla del lado del servidor antes de
// mandarla al navegador, en cualquier lugar donde un comentario pueda
// llegar con su foto — Comentarios del club, y también Inicio/Perfil si
// ese comentario se compartió al feed con una foto puesta.
//
// Recibe cualquier arreglo de filas con un campo "image_url" (paths, no
// URLs) y devuelve una copia con esos paths reemplazados por su URL
// firmada — sin tocar las filas que no tengan imagen.
export async function signCommentImageUrls(supabase, rows) {
  const list = rows ?? [];
  const paths = list.filter((r) => r.image_url).map((r) => r.image_url);
  if (paths.length === 0) return list;

  const { data: signed } = await supabase.storage.from('comment-photos').createSignedUrls(paths, 60 * 60);
  const signedByPath = new Map();
  for (const entry of signed ?? []) {
    if (entry.signedUrl) signedByPath.set(entry.path, entry.signedUrl);
  }
  return list.map((r) => (r.image_url ? { ...r, image_url: signedByPath.get(r.image_url) ?? null } : r));
}
