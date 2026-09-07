'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/requireUser';
import { friendlyDbError } from '@/lib/friendlyError';

const MAX_COVER_BYTES = 5 * 1024 * 1024; // mismo límite que el bucket (migración 046).
const COVER_EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function isFile(value) {
  return value && typeof value !== 'string' && typeof value.size === 'number';
}

// "Empezaste"/"Terminaste" (formulario, <input type="date">) son
// opcionales — llegan como "" cuando se dejan en blanco, no como null;
// hay que normalizar eso antes de mandarlas a una columna date.
function readOptionalDate(formData, field) {
  return formData.get(field)?.toString().trim() || null;
}

// Ambas son opcionales, pero si están las dos, terminar no puede ser
// antes de empezar — mismo chequeo en addPersonalBook y updatePersonalBook.
function validateDateOrder(startedAt, finishedAt) {
  if (startedAt && finishedAt && finishedAt < startedAt) {
    return 'La fecha en la que terminaste no puede ser antes de la que empezaste.';
  }
  return null;
}

// Agrega a mano un libro leído fuera de un club — "Mi biblioteca". La
// portada es opcional (ya viene recortada del lado del navegador, con
// CoverCropModal, igual que la portada de un libro de club); sin portada
// queda igual que un libro de club sin portada: color sólido + título.
// Empezaste/Terminaste (migración 047) también son opcionales — sin
// fecha de fin, el libro cuenta como que se sigue leyendo (no entra en
// el Recuento de ningún año hasta que se le ponga una).
export async function addPersonalBook(prevState, formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const title = formData.get('title')?.toString().trim();
  const author = formData.get('author')?.toString().trim() || null;
  const cover = formData.get('cover');
  const startedAt = readOptionalDate(formData, 'startedAt');
  const finishedAt = readOptionalDate(formData, 'finishedAt');

  if (!title) return { error: 'Escribe el título del libro.' };
  const dateError = validateDateOrder(startedAt, finishedAt);
  if (dateError) return { error: dateError };

  let coverUrl = null;
  if (isFile(cover) && cover.size > 0) {
    if (cover.size > MAX_COVER_BYTES) return { error: 'La portada no puede pesar más de 5 MB.' };
    const extension = COVER_EXTENSIONS[cover.type];
    if (!extension) return { error: 'La portada tiene que ser JPG, PNG o WEBP.' };

    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('personal-book-covers')
      .upload(path, cover, { contentType: cover.type });
    if (uploadError) return { error: friendlyDbError(uploadError) };

    const { data: { publicUrl } } = supabase.storage.from('personal-book-covers').getPublicUrl(path);
    coverUrl = publicUrl;
  }

  const { error } = await supabase.from('personal_books').insert({
    profile_id: user.id,
    title,
    author,
    cover_url: coverUrl,
    started_at: startedAt,
    finished_at: finishedAt,
  });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/perfil');
  revalidatePath('/perfil/biblioteca');
  return { error: null };
}

// Edita un libro agregado a mano — título, autor y fechas. La portada
// queda como está (no se puede reemplazar desde acá): mismo criterio que
// updatePost (posts.js), que tampoco deja reemplazar la imagen, solo el
// texto — mantiene el editor simple, sin repetir todo el flujo de
// recorte para un cambio que en general es "se me pasó poner la fecha".
export async function updatePersonalBook(prevState, formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const bookId = formData.get('bookId')?.toString();
  const title = formData.get('title')?.toString().trim();
  const author = formData.get('author')?.toString().trim() || null;
  const startedAt = readOptionalDate(formData, 'startedAt');
  const finishedAt = readOptionalDate(formData, 'finishedAt');

  if (!bookId) return { error: 'Falta el libro.' };
  if (!title) return { error: 'Escribe el título del libro.' };
  const dateError = validateDateOrder(startedAt, finishedAt);
  if (dateError) return { error: dateError };

  const { error } = await supabase
    .from('personal_books')
    .update({ title, author, started_at: startedAt, finished_at: finishedAt })
    .eq('id', bookId)
    .eq('profile_id', user.id);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/perfil');
  revalidatePath('/perfil/biblioteca');
  return { error: null };
}

// Quita un libro agregado a mano — solo esos: uno que viene de una reseña
// de club se maneja desde el club, no acá (BibliotecaScreen ya solo ofrece
// el botón de borrar para source === 'personal'; esto es el cinturón y
// tirantes del lado del servidor, scopeado a profile_id = auth.uid()).
export async function deletePersonalBook(bookId) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!bookId) return { error: 'Falta el libro.' };

  const { data: book } = await supabase
    .from('personal_books')
    .select('cover_url')
    .eq('id', bookId)
    .eq('profile_id', user.id)
    .maybeSingle();

  const { error } = await supabase
    .from('personal_books')
    .delete()
    .eq('id', bookId)
    .eq('profile_id', user.id);
  if (error) return { error: friendlyDbError(error) };

  const path = book?.cover_url?.split('/personal-book-covers/')[1];
  if (path) {
    await supabase.storage.from('personal-book-covers').remove([path]);
  }

  revalidatePath('/perfil');
  revalidatePath('/perfil/biblioteca');
  return { error: null };
}
