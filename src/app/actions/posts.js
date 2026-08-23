'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/requireUser';
import { friendlyDbError } from '@/lib/friendlyError';

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB — de sobra: el recorte ya la deja liviana.
const PHOTO_EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function isFile(value) {
  return value && typeof value !== 'string' && typeof value.size === 'number';
}

// Publica una foto de lo que se está leyendo en la Actividad del propio
// perfil. Sube la imagen (ya recortada y comprimida del lado del navegador)
// al bucket "post-photos", en la carpeta propia, y crea la fila en "posts".
export async function createPost(prevState, formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const file = formData.get('file');
  const caption = formData.get('caption')?.toString().trim() || null;

  if (!isFile(file) || file.size === 0) return { error: 'Elige una foto.' };
  if (file.size > MAX_PHOTO_BYTES) return { error: 'La foto no puede pesar más de 8 MB.' };

  const extension = PHOTO_EXTENSIONS[file.type];
  if (!extension) return { error: 'La foto tiene que ser JPG, PNG o WEBP.' };

  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('post-photos')
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = supabase.storage.from('post-photos').getPublicUrl(path);

  const { error } = await supabase.from('posts').insert({
    profile_id: user.id,
    image_url: publicUrl,
    caption,
  });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  revalidatePath('/perfil');
  return { error: null };
}
