'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/requireUser';
import { friendlyDbError } from '@/lib/friendlyError';

const MAX_COVER_BYTES = 5 * 1024 * 1024;   // 5 MB
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;  // 10 MB (~10 min de voz comprimida)

const COVER_EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const AUDIO_EXTENSIONS = {
  'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg', 'audio/wav': 'wav',
};

function isFile(value) {
  return value && typeof value !== 'string' && typeof value.size === 'number';
}

// Sube la portada del libro y la deja apuntada en books.cover_url. El bucket
// es público, así que alcanza con guardar la URL.
export async function uploadBookCover(prevState, formData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const bookId = formData.get('bookId')?.toString();
  const file = formData.get('file');
  if (!bookId) return { error: 'Falta el libro.' };
  if (!isFile(file) || file.size === 0) return { error: 'Elige una imagen.' };
  if (file.size > MAX_COVER_BYTES) return { error: 'La imagen no puede pesar más de 5 MB.' };

  const extension = COVER_EXTENSIONS[file.type];
  if (!extension) return { error: 'La portada tiene que ser JPG, PNG o WEBP.' };

  const path = `${bookId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('book-covers')
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = supabase.storage.from('book-covers').getPublicUrl(path);

  const { error } = await supabase.from('books').update({ cover_url: publicUrl }).eq('id', bookId);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  revalidatePath('/recursos');
  return { error: null };
}

// Sube la foto de perfil a la carpeta propia del bucket ("<user_id>/…") y la
// deja apuntada en profiles.avatar_url. El bucket es público, igual que el
// de portadas — una foto de perfil no es información sensible.
export async function uploadAvatar(prevState, formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const file = formData.get('file');
  if (!isFile(file) || file.size === 0) return { error: 'Elige una imagen.' };
  if (file.size > MAX_COVER_BYTES) return { error: 'La imagen no puede pesar más de 5 MB.' };

  const extension = COVER_EXTENSIONS[file.type];
  if (!extension) return { error: 'La foto tiene que ser JPG, PNG o WEBP.' };

  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

  const { error } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}

// Publica una nota de voz. El audio va a un bucket privado bajo la carpeta del
// libro del club: esa carpeta es lo que usa la política de Storage para
// verificar que quien escucha sea miembro. Guardamos el path (no una URL),
// porque cada reproducción necesita una URL firmada.
export async function postVoiceComment(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const clubBookId = formData.get('clubBookId')?.toString();
  const chapterId = formData.get('chapterId')?.toString() || null;
  const audio = formData.get('audio');
  const duration = Number(formData.get('duration'));
  const transcript = formData.get('transcript')?.toString().trim() || null;
  const isSpoiler = formData.get('isSpoiler') === 'on';

  if (!clubBookId) return { error: 'Falta el libro del club.' };
  if (!isFile(audio) || audio.size === 0) return { error: 'No se grabó nada.' };
  if (audio.size > MAX_AUDIO_BYTES) return { error: 'La nota de voz es demasiado larga.' };

  const baseType = audio.type.split(';')[0];
  const extension = AUDIO_EXTENSIONS[baseType];
  if (!extension) return { error: 'Formato de audio no soportado.' };

  const path = `${clubBookId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('voice-notes')
    .upload(path, audio, { contentType: baseType });
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from('comments').insert({
    club_book_id: clubBookId,
    chapter_id: chapterId,
    profile_id: user.id,
    kind: 'voice',
    voice_url: path,
    voice_transcript: transcript,
    voice_duration_seconds: Number.isFinite(duration) ? Math.round(duration) : null,
    is_spoiler: isSpoiler,
  });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}

// Edita tu propia nota de voz — migración 028. Solo la transcripción y el
// spoiler; el audio en sí no se reemplaza desde acá (para eso conviene
// borrar y grabar otra).
export async function updateVoiceComment(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const commentId = formData.get('commentId')?.toString();
  const transcript = formData.get('transcript')?.toString().trim() || null;
  const isSpoiler = formData.get('isSpoiler') === 'on';
  if (!commentId) return { error: 'Falta la nota de voz.' };

  const { error } = await supabase
    .from('comments')
    .update({ voice_transcript: transcript, is_spoiler: isSpoiler })
    .eq('id', commentId)
    .eq('profile_id', user.id)
    .eq('kind', 'voice');
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}

// Borra tu propia nota de voz — la fila y también el archivo en Storage
// (bucket privado "voice-notes"); acá "voice_url" ya es el path guardado
// directamente (no una URL pública), a diferencia de fotos y citas.
export async function deleteVoiceComment(commentId) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!commentId) return { error: 'Falta la nota de voz.' };

  const { data: existing } = await supabase
    .from('comments')
    .select('voice_url')
    .eq('id', commentId)
    .eq('profile_id', user.id)
    .eq('kind', 'voice')
    .maybeSingle();

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('profile_id', user.id)
    .eq('kind', 'voice');
  if (error) return { error: friendlyDbError(error) };

  if (existing?.voice_url) {
    await supabase.storage.from('voice-notes').remove([existing.voice_url]);
  }

  revalidatePath('/', 'layout');
  return { error: null };
}
