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

// Edita el texto de tu propia foto (migración 026). La imagen queda como
// está — no se reemplaza acá, mismo criterio que la reseña final.
export async function updatePost(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const postId = formData.get('postId')?.toString();
  const caption = formData.get('caption')?.toString().trim() || null;
  if (!postId) return { error: 'Falta la publicación.' };

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
// Storage, para no dejarlo huérfano. "post-photos" es público, así que la
// URL guardada ya trae el path completo después de "/post-photos/".
export async function deletePost(postId) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!postId) return { error: 'Falta la publicación.' };

  const { data: post } = await supabase
    .from('posts')
    .select('image_url')
    .eq('id', postId)
    .eq('profile_id', user.id)
    .maybeSingle();

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('profile_id', user.id);
  if (error) return { error: friendlyDbError(error) };

  const path = post?.image_url?.split('/post-photos/')[1];
  if (path) {
    await supabase.storage.from('post-photos').remove([path]);
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
export async function postPhotoComment(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const postId = formData.get('postId')?.toString();
  const body = formData.get('body')?.toString().trim();
  if (!postId) return { error: 'Falta la foto.' };
  if (!body) return { error: 'Escribe algo antes de comentar.' };

  const { error } = await supabase.from('post_comments').insert({
    post_id: postId,
    profile_id: user.id,
    body,
  });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}
