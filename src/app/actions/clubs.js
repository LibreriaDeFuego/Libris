'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/requireUser';
import { friendlyDbError } from '@/lib/friendlyError';
import { cookies } from 'next/headers';
import { ACTIVE_CLUB_COOKIE } from '@/lib/activeClub';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const MAX_CHAPTERS = 300;

// Busca un libro por título y autor sin distinguir mayúsculas ni espacios de
// más; si no existe, lo crea. Devuelve { id } o { error }.
async function findOrCreateBook(supabase, title, author) {
  const { data: existing } = await supabase
    .from('books')
    .select('id')
    .ilike('title', title)
    .ilike('author', author)
    .limit(1)
    .maybeSingle();
  if (existing) return { id: existing.id };

  const { data: created, error } = await supabase
    .from('books')
    .insert({ title, author })
    .select('id')
    .single();
  if (error) return { error: error.message };
  return { id: created.id };
}

function chapterRows(clubBookId, from, count) {
  return Array.from({ length: count }, (_, i) => ({
    club_book_id: clubBookId,
    number: from + i,
    label: `Cap. ${from + i}`,
  }));
}

// Crea un club nuevo con su primer libro y sus capítulos, y hace administrador
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

  // Quien crea el club es su primer administrador — puede nombrar hasta 2 más.
  const { error: memberError } = await supabase
    .from('club_members')
    .insert({ club_id: club.id, profile_id: user.id, role: 'admin' });
  if (memberError) return { error: memberError.message };

  // Reutilizamos el libro si ya existe con el mismo título y autor. Sin esto,
  // dos clubes leyendo "Rayuela" quedarían apuntando a dos filas distintas y
  // el descubrimiento social ("otros clubes leyendo lo mismo") nunca cruzaría.
  const book = await findOrCreateBook(supabase, bookTitle, bookAuthor);
  if (book.error) return { error: book.error };

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

  await setActiveClubCookie(club.id);
  revalidatePath('/', 'layout');
  redirect('/');
}

// Agrega un capítulo al libro activo. Solo administradores (lo impone RLS).
// Sin volumen ni número explícitos (el chip "+ Nuevo" del modal de progreso),
// sigue la numeración simple de siempre. Con volumen y/o número (la pantalla
// de Gestionar capítulos), permite armar capítulos agrupados con numeración
// propia — por ejemplo, un segundo libro que arranca de nuevo en el 1.
export async function addChapter(formData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const clubBookId = formData.get('clubBookId')?.toString();
  if (!clubBookId) return { error: 'Falta el libro del club.' };

  const volumeId = formData.get('volumeId')?.toString() || null;
  const title = formData.get('title')?.toString().trim() || null;
  const explicitNumber = formData.get('number')?.toString().trim();

  let number;
  if (explicitNumber) {
    number = parseInt(explicitNumber, 10);
    if (!Number.isFinite(number) || number < 1) return { error: 'El número de capítulo no es válido.' };
  } else {
    const { data: last } = await supabase
      .from('chapters')
      .select('number')
      .eq('club_book_id', clubBookId)
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle();
    number = (last?.number ?? 0) + 1;
  }
  if (number > MAX_CHAPTERS) return { error: `El máximo es ${MAX_CHAPTERS} capítulos.` };

  const { data: chapter, error } = await supabase
    .from('chapters')
    .insert({ club_book_id: clubBookId, number, title, volume_id: volumeId, label: `Cap. ${number}` })
    .select('id, number, title, label, volume_id')
    .single();
  if (error) {
    if (error.code === '23505') return { error: `Ya existe el capítulo ${number} en este libro.` };
    return { error: friendlyDbError(error) };
  }

  revalidatePath('/', 'layout');
  return { error: null, chapter };
}

// Cambia el nombre, el número y/o el volumen de un capítulo ya creado.
// Solo administradores.
export async function renameChapter(formData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const chapterId = formData.get('chapterId')?.toString();
  if (!chapterId) return { error: 'Falta el capítulo.' };

  const title = formData.get('title')?.toString().trim() || null;
  const volumeId = formData.get('volumeId')?.toString() || null;
  const numberRaw = formData.get('number')?.toString().trim();

  const changes = { title, volume_id: volumeId };
  if (numberRaw) {
    const number = parseInt(numberRaw, 10);
    if (!Number.isFinite(number) || number < 1) return { error: 'El número de capítulo no es válido.' };
    changes.number = number;
  }

  const { error } = await supabase.from('chapters').update(changes).eq('id', chapterId);
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe otro capítulo con ese número en este libro.' };
    return { error: friendlyDbError(error) };
  }

  revalidatePath('/', 'layout');
  return { error: null };
}

// Crea un volumen nuevo (p. ej. "Libro 2" o "2027") al final de la lista.
// Solo administradores.
export async function createVolume(formData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const clubBookId = formData.get('clubBookId')?.toString();
  const name = formData.get('name')?.toString().trim();
  if (!clubBookId || !name) return { error: 'Ponele un nombre al volumen.' };

  const { data: last } = await supabase
    .from('volumes')
    .select('position')
    .eq('club_book_id', clubBookId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? 0) + 1;

  const { data: volume, error } = await supabase
    .from('volumes')
    .insert({ club_book_id: clubBookId, name, position })
    .select('id, name, position')
    .single();
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null, volume };
}

// Cambia el nombre de un volumen. Solo administradores.
export async function renameVolume(formData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const volumeId = formData.get('volumeId')?.toString();
  const name = formData.get('name')?.toString().trim();
  if (!volumeId || !name) return { error: 'Ponele un nombre al volumen.' };

  const { error } = await supabase.from('volumes').update({ name }).eq('id', volumeId);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}

// Nombra administrador a otro miembro del club (máximo 3 en total, lo impone
// un trigger en la base). Solo administradores pueden hacerlo.
export async function promoteAdmin(formData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const clubId = formData.get('clubId')?.toString();
  const profileId = formData.get('profileId')?.toString();
  if (!clubId || !profileId) return { error: 'Faltan datos.' };

  const { error } = await supabase
    .from('club_members')
    .update({ role: 'admin' })
    .eq('club_id', clubId)
    .eq('profile_id', profileId);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}

// Le saca el rol de administrador a alguien (no puede dejar al club sin
// ninguno, lo impone un trigger en la base). Solo administradores.
export async function demoteAdmin(formData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const clubId = formData.get('clubId')?.toString();
  const profileId = formData.get('profileId')?.toString();
  if (!clubId || !profileId) return { error: 'Faltan datos.' };

  const { error } = await supabase
    .from('club_members')
    .update({ role: 'member' })
    .eq('club_id', clubId)
    .eq('profile_id', profileId);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
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

async function setActiveClubCookie(clubId) {
  const store = await cookies();
  store.set(ACTIVE_CLUB_COOKIE, clubId, {
    path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax',
  });
}

// Cambia el club que se está viendo. Con multi-club, la elección se guarda en
// una cookie para que las tres pestañas muestren el mismo club.
export async function selectClub(formData) {
  const clubId = formData.get('clubId')?.toString();
  if (!clubId) return { error: 'Falta el club.' };
  await setActiveClubCookie(clubId);
  revalidatePath('/', 'layout');
  return { error: null };
}

// Salir de un club. Si era el club activo, la cookie queda apuntando a uno
// inexistente y getActiveClub cae al primero que quede.
export async function leaveClub(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const clubId = formData.get('clubId')?.toString();
  if (!clubId) return { error: 'Falta el club.' };

  const { error } = await supabase
    .from('club_members')
    .delete()
    .eq('club_id', clubId)
    .eq('profile_id', user.id);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  redirect('/');
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

  await setActiveClubCookie(clubId);
  revalidatePath('/', 'layout');
  redirect('/');
}

// Preferencias del club: nombre, visibilidad y datos del libro en curso.
// Solo los administradores pueden guardar (lo impone la política de RLS).
export async function updateClubPreferences(prevState, formData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const clubId = formData.get('clubId')?.toString();
  const bookId = formData.get('bookId')?.toString();
  const clubName = formData.get('clubName')?.toString().trim();
  const bookTitle = formData.get('bookTitle')?.toString().trim();
  const bookAuthor = formData.get('bookAuthor')?.toString().trim();
  // El formulario manda "publico" o "privado"; ausente = sin cambios.
  const visibility = formData.get('visibility')?.toString();

  if (!clubId) return { error: 'Falta el club.' };
  if (!clubName) return { error: 'El club necesita un nombre.' };

  const clubChanges = { name: clubName };
  if (visibility === 'publico' || visibility === 'privado') {
    clubChanges.is_private = visibility === 'privado';
  }

  const { error: clubError } = await supabase.from('clubs').update(clubChanges).eq('id', clubId);
  if (clubError) return { error: friendlyDbError(clubError) };

  if (bookId && bookTitle && bookAuthor) {
    const { error: bookError } = await supabase
      .from('books')
      .update({ title: bookTitle, author: bookAuthor })
      .eq('id', bookId);
    if (bookError) return { error: friendlyDbError(bookError) };
  }

  revalidatePath('/', 'layout');
  return { error: null, saved: true };
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

// Publica un comentario (texto o cita destacada) en el libro activo de un
// club, o en un capítulo puntual si se manda chapterId.
export async function postComment(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const clubBookId = formData.get('clubBookId');
  const chapterId = formData.get('chapterId')?.toString() || null;
  const kind = formData.get('kind') || 'text';
  const body = formData.get('body')?.toString().trim();
  const isSpoiler = formData.get('isSpoiler') === 'on';
  if (!body) return { error: 'Escribí algo antes de publicar.' };

  const { error } = await supabase.from('comments').insert({
    club_book_id: clubBookId,
    chapter_id: chapterId,
    profile_id: user.id,
    kind,
    body,
    is_spoiler: isSpoiler,
  });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}
