'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const MAX_CHAPTERS = 300;

async function requireUser(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

function chapterRows(clubBookId, from, count) {
  return Array.from({ length: count }, (_, i) => ({
    club_book_id: clubBookId,
    number: from + i,
    label: `Cap. ${from + i}`,
  }));
}

// Crea un club nuevo con su primer libro y sus capítulos, y hace socio (owner)
// al que lo crea. No es atómico (son varios inserts) — aceptable para un MVP;
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

  const parsedChapters = parseInt(formData.get('chapterCount')?.toString() ?? '', 10);
  const chapterCount = Number.isFinite(parsedChapters)
    ? Math.min(Math.max(parsedChapters, 1), MAX_CHAPTERS)
    : 1;

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
    .insert(chapterRows(clubBook.id, 1, chapterCount));
  if (chapterError) return { error: chapterError.message };

  revalidatePath('/');
  redirect('/');
}

// Agrega el capítulo siguiente al libro activo (el chip "+ Nuevo" del modal de
// progreso). Los capítulos se definen sobre la marcha, como en el brief.
export async function addChapter(formData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const clubBookId = formData.get('clubBookId');
  if (!clubBookId) return { error: 'Falta el libro del club.' };

  const { data: last } = await supabase
    .from('chapters')
    .select('number')
    .eq('club_book_id', clubBookId)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = (last?.number ?? 0) + 1;
  if (nextNumber > MAX_CHAPTERS) {
    return { error: `El máximo es ${MAX_CHAPTERS} capítulos.` };
  }

  const { data: chapter, error } = await supabase
    .from('chapters')
    .insert({ club_book_id: clubBookId, number: nextNumber, label: `Cap. ${nextNumber}` })
    .select('id, number, label')
    .single();
  if (error) return { error: error.message };

  revalidatePath('/');
  return { error: null, chapter };
}

// Unirse pegando un link de invitación o el ID del club (acepta las dos cosas).
export async function joinClub(prevState, formData) {
  const raw = formData.get('clubId')?.toString() ?? '';
  const clubId = raw.match(UUID_RE)?.[0];
  if (!clubId) return { error: 'Pegá el link de invitación o el ID del club.' };
  return joinClubId(clubId);
}

// Unirse desde la pantalla de invitación, donde el club ya viene identificado.
export async function joinClubFromInvite(prevState, formData) {
  const clubId = formData.get('clubId')?.toString();
  if (!clubId) return { error: 'Invitación inválida.' };
  return joinClubId(clubId);
}

async function joinClubId(clubId) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: existing } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('club_id', clubId)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from('club_members')
      .insert({ club_id: clubId, profile_id: user.id, role: 'member' });
    if (error) return { error: 'No pudimos unirte — revisá que el link o el ID sean correctos.' };
  }

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
