'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/requireUser';
import { friendlyDbError } from '@/lib/friendlyError';

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB — de sobra para una foto recortada; un GIF entra justo.
// GIF — migración 039: a diferencia de jpeg/png/webp, no pasa por el
// recorte del navegador (el recuadro de PhotoCropModal usa <canvas>, que
// solo puede dibujar un frame — recortar un GIF ahí lo dejaría animado por
// dentro pero estático al mostrarlo). PostComposer lo sube tal cual llegó.
const PHOTO_EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

// Nota de voz de un post (migración 052) — mismo tope y formatos que ya usa
// una nota de voz de club (media.js, MAX_AUDIO_BYTES/AUDIO_EXTENSIONS): 2 MB
// de sobra para los 90 segundos a 32 kbps que ya limita VoiceRecorder.
const MAX_VOICE_BYTES = 2 * 1024 * 1024;
const VOICE_EXTENSIONS = {
  'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg', 'audio/wav': 'wav',
};

function isFile(value) {
  return value && typeof value !== 'string' && typeof value.size === 'number';
}

// Publica algo en la Actividad del propio perfil — texto, una foto de lo
// que se está leyendo, una nota de voz (migración 052), o cualquier
// combinación con el texto (solo la foto y la voz son excluyentes entre sí:
// el compositor de Perfil las ofrece como pestañas de tipo distintas, no
// hay forma de adjuntar las dos a la vez). Si hay foto, ya viene recortada
// y comprimida del lado del navegador. "post-voice-notes" es un bucket
// PÚBLICO (a diferencia de "voice-notes", el de club) — un post ya es
// visible para cualquier usuario autenticado, así que se guarda la URL
// pública directa, igual que image_url, sin necesidad de firmar nada al
// leerla.
export async function createPost(prevState, formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const file = formData.get('file');
  const caption = formData.get('caption')?.toString().trim() || null;
  // audio/duration/transcript: mismos nombres de campo que ya usa
  // postVoiceComment (media.js) — VoiceRecorder es el mismo componente en
  // los dos casos, así arma el FormData una sola vez sin distinguir quién
  // lo va a leer.
  const audio = formData.get('audio');
  const voiceDuration = Number(formData.get('duration'));
  const voiceTranscript = formData.get('transcript')?.toString().trim() || null;
  const hasFile = isFile(file) && file.size > 0;
  const hasAudio = isFile(audio) && audio.size > 0;

  if (!hasFile && !hasAudio && !caption) return { error: 'Escribe algo, agrega una foto o graba una nota de voz antes de publicar.' };

  let imageUrl = null;
  if (hasFile) {
    if (file.size > MAX_PHOTO_BYTES) return { error: 'La foto no puede pesar más de 8 MB.' };

    const extension = PHOTO_EXTENSIONS[file.type];
    if (!extension) return { error: 'La foto tiene que ser JPG, PNG o WEBP.' };

    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('post-photos')
      .upload(path, file, { contentType: file.type });
    if (uploadError) return { error: friendlyDbError(uploadError) };

    const { data: { publicUrl } } = supabase.storage.from('post-photos').getPublicUrl(path);
    imageUrl = publicUrl;
  }

  let voiceUrl = null;
  if (hasAudio) {
    if (audio.size > MAX_VOICE_BYTES) return { error: 'La nota de voz es demasiado larga.' };

    const baseType = audio.type.split(';')[0];
    const extension = VOICE_EXTENSIONS[baseType];
    if (!extension) return { error: 'Formato de audio no soportado.' };

    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('post-voice-notes')
      .upload(path, audio, { contentType: baseType });
    if (uploadError) return { error: friendlyDbError(uploadError) };

    const { data: { publicUrl } } = supabase.storage.from('post-voice-notes').getPublicUrl(path);
    voiceUrl = publicUrl;
  }

  const { error } = await supabase.from('posts').insert({
    profile_id: user.id,
    image_url: imageUrl,
    caption,
    voice_url: voiceUrl,
    voice_transcript: hasAudio ? voiceTranscript : null,
    voice_duration_seconds: hasAudio && Number.isFinite(voiceDuration) ? Math.round(voiceDuration) : null,
  });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  revalidatePath('/perfil');
  return { error: null };
}

// Edita el texto de tu propia foto (migración 026). La imagen queda como
// está — no se reemplaza acá, mismo criterio que la reseña final.
export async function updatePost(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const postId = formData.get('postId')?.toString();
  const caption = formData.get('caption')?.toString().trim() || null;
  if (!postId) return { error: 'Falta la publicación.' };

  // Una publicación de solo texto (migración 049, sin foto) o de solo voz
  // (migración 052, sin foto tampoco) no puede quedarse sin caption
  // tampoco — la base lo rechazaría igual (posts_content_check), pero acá
  // se valida antes para dar un mensaje claro en vez del genérico de
  // friendlyDbError.
  if (!caption) {
    const { data: existing } = await supabase.from('posts').select('image_url, voice_url').eq('id', postId).maybeSingle();
    if (existing && !existing.image_url && !existing.voice_url) return { error: 'Escribe algo antes de guardar.' };
  }

  const { error } = await supabase
    .from('posts')
    .update({ caption })
    .eq('id', postId)
    .eq('profile_id', user.id);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}

// Borra tu propia foto — la fila y, a diferencia de la reseña (donde no
// hay archivo propio: la portada es del libro), también el archivo en
// Storage, para no dejarlo huérfano. "post-photos"/"post-voice-notes" son
// públicos, así que la URL guardada ya trae el path completo después de
// "/<bucket>/".
export async function deletePost(postId) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!postId) return { error: 'Falta la publicación.' };

  const { data: post } = await supabase
    .from('posts')
    .select('image_url, voice_url')
    .eq('id', postId)
    .eq('profile_id', user.id)
    .maybeSingle();

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('profile_id', user.id);
  if (error) return { error: friendlyDbError(error) };

  const photoPath = post?.image_url?.split('/post-photos/')[1];
  if (photoPath) {
    await supabase.storage.from('post-photos').remove([photoPath]);
  }
  const voicePath = post?.voice_url?.split('/post-voice-notes/')[1];
  if (voicePath) {
    await supabase.storage.from('post-voice-notes').remove([voicePath]);
  }

  revalidatePath('/', 'layout');
  return { error: null };
}

// "Me gusta" en una foto — migración 029. Mismo toggle que toggleCommentLike
// (clubs.js), sobre post_likes en vez de comment_likes.
export async function togglePostLike(postId) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!postId) return { error: 'Falta la foto.' };

  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('profile_id', user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from('post_likes').delete().eq('id', existing.id)
    : await supabase.from('post_likes').insert({ post_id: postId, profile_id: user.id });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}

// Comenta una foto — migración 033. Tabla aparte ("post_comments"), no una
// fila más en "comments": esa exige un club_book_id que una foto no tiene.
// Lista plana, sin responder a un comentario puntual ni su propio "me
// gusta" — más simple a propósito que el hilo de reseñas/citas.
//
// "repostId" (opcional, migración 040): igual que en postReply — si el
// comentario se escribió desde el repost de la foto de otra persona, queda
// scopeado a ESE repost, no aparece en la foto original. La política de
// insert (repost_id is not null → can_comment_on_repost) exige que el
// repost exista y sea visible.
export async function postPhotoComment(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const postId = formData.get('postId')?.toString();
  const body = formData.get('body')?.toString().trim();
  const repostId = formData.get('repostId')?.toString() || null;
  if (!postId) return { error: 'Falta la foto.' };
  if (!body) return { error: 'Escribe algo antes de comentar.' };

  const { error } = await supabase.from('post_comments').insert({
    post_id: postId,
    profile_id: user.id,
    body,
    repost_id: repostId,
  });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}
