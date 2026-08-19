'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/requireUser';

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
  if (!isFile(file) || file.size === 0) return { error: 'Elegí una imagen.' };
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
  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/descubrir');
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
    profile_id: user.id,
    kind: 'voice',
    voice_url: path,
    voice_transcript: transcript,
    voice_duration_seconds: Number.isFinite(duration) ? Math.round(duration) : null,
    is_spoiler: isSpoiler,
  });
  if (error) return { error: error.message };

  revalidatePath('/club/comentarios');
  revalidatePath('/');
  return { error: null };
}
