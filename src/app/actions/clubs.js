'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireUser(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

// Crea un club nuevo con un primer libro y capítulo, y hace socio (owner) al
// que lo crea. No es atómico (son varios inserts) — aceptable para un MVP;
// si un paso falla, el club queda a medio armar y el usuario puede reintentar
// desde el onboarding (todavía no tiene libro activo => vuelve a ver el form).
export async function createClub(prevState, formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const clubName = formData.get('clubName')?.toString().trim();
  const bookTitle = formData.get('bookTitle')?.toString().trim();
  const bookAuthor = formData.get('bookAuthor')?.toString().trim();
  if (!clubName || !bookTitle || !bookAuthor) {
    return { error: 'Completá el nombre del club, el título y el autor.' };
  }

  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .insert({ name: clubName, created_by: user.id })
    .select('id')
    .single();
  if (clubError) return { error: clubError.message };

  const { error: memberError } = await supabase
    .from('club_members')
    .insert({ club_id: club.id, profile_id: user.id, role: 'owner' });
  if (memberError) return { error: memberError.message };

  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert({ title: bookTitle, author: bookAuthor })
    .select('id')
    .single();
  if (bookError) return { error: bookError.message };

  const { data: clubBook, error: clubBookError } = await supabase
    .from('club_books')
    .insert({ club_id: club.id, book_id: book.id, is_active: true })
    .select('id')
    .single();
  if (clubBookError) return { error: clubBookError.message };

  const { error: chapterError } = await supabase
    .from('chapters')
    .insert({ club_book_id: clubBook.id, number: 1, label: 'Cap. 1' });
  if (chapterError) return { error: chapterError.message };

  revalidatePath('/');
  redirect('/');
}

// Unirse a un club existente pegando su ID (comparten el link/código quienes
// ya están adentro — no hay un directorio público de clubes).
export async function joinClub(prevState, formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const clubId = formData.get('clubId')?.toString().trim();
  if (!clubId) return { error: 'Pegá el ID del club al que te invitaron.' };

  const { error } = await supabase
    .from('club_members')
    .insert({ club_id: clubId, profile_id: user.id, role: 'member' });
  if (error) return { error: 'No pudimos unirte — revisá que el ID del club sea correcto.' };

  revalidatePath('/');
  redirect('/');
}

// Actualiza el progreso del usuario en el libro activo de un club.
export async function updateProgress(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const clubBookId = formData.get('clubBookId');
  const chapterId = formData.get('chapterId');
  const percent = Number(formData.get('percent'));
  const reaction = formData.get('reaction') || null;

  const { error } = await supabase
    .from('reading_progress')
    .upsert(
      { club_book_id: clubBookId, profile_id: user.id, chapter_id: chapterId, percent, reaction },
      { onConflict: 'club_book_id,profile_id' }
    );
  if (error) return { error: error.message };

  revalidatePath('/');
  return { error: null };
}

// Publica un comentario (texto o cita destacada) en el libro activo de un club.
export async function postComment(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const clubBookId = formData.get('clubBookId');
  const kind = formData.get('kind') || 'text';
  const body = formData.get('body')?.toString().trim();
  const isSpoiler = formData.get('isSpoiler') === 'on';
  if (!body) return { error: 'Escribí algo antes de publicar.' };

  const { error } = await supabase.from('comments').insert({
    club_book_id: clubBookId,
    profile_id: user.id,
    kind,
    body,
    is_spoiler: isSpoiler,
  });
  if (error) return { error: error.message };

  revalidatePath('/club/comentarios');
  return { error: null };
}
