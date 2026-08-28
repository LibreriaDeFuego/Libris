'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/requireUser';
import { friendlyDbError } from '@/lib/friendlyError';
import { orderChapters } from '@/lib/orderChapters';
import { cookies } from 'next/headers';
import { ACTIVE_CLUB_COOKIE } from '@/lib/activeClub';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const MAX_CHAPTERS = 300;

// El formulario manda "publico", "solicitud" o "privado".
const VISIBILITY_TO_JOIN_MODE = { publico: 'open', solicitud: 'request', privado: 'invite' };

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
    return { error: 'Completa el nombre del club, el título y el autor.' };
  }

  const parsedChapters = parseInt(formData.get('chapterCount')?.toString() ?? '', 10);
  const chapterCount = Number.isFinite(parsedChapters)
    ? Math.min(Math.max(parsedChapters, 1), MAX_CHAPTERS)
    : 1;

  // Sin elección explícita, el club queda privado — más seguro que exponerlo
  // por accidente.
  const visibility = formData.get('visibility')?.toString();
  const joinMode = VISIBILITY_TO_JOIN_MODE[visibility] ?? 'invite';

  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .insert({ name: clubName, created_by: user.id, join_mode: joinMode, is_private: joinMode !== 'open' })
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
    if (error.code === '23505') return { error: `Ya existe el capítulo ${number} ${volumeId ? 'en ese volumen' : 'sin volumen asignado'}.` };
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
    if (error.code === '23505') return { error: `Ya existe otro capítulo con ese número ${volumeId ? 'en ese volumen' : 'sin volumen asignado'}.` };
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
  if (!clubBookId || !name) return { error: 'Ponle un nombre al volumen.' };

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
  if (!volumeId || !name) return { error: 'Ponle un nombre al volumen.' };

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
  if (!clubId) return { error: 'Pega el link de invitación o el ID del club.' };
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
    if (error) return { error: 'No pudimos unirte — revisa que el link o el ID sean correctos.' };
  }

  await setActiveClubCookie(clubId);
  revalidatePath('/', 'layout');
  redirect('/');
}

// Postularse a un club "con solicitud" (privado, pero listado en
// Descubrir). Si ya te habían rechazado, volver a postular reactiva la
// solicitud como pendiente — lo impone la política de RLS.
export async function requestToJoin(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const clubId = formData.get('clubId')?.toString();
  const message = formData.get('message')?.toString().trim() || null;
  if (!clubId) return { error: 'Falta el club.' };

  const { error } = await supabase
    .from('club_join_requests')
    .upsert(
      { club_id: clubId, profile_id: user.id, message, status: 'pending', responded_at: null },
      { onConflict: 'club_id,profile_id' }
    );
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/descubrir');
  return { error: null };
}

// El administrador aprueba o rechaza una solicitud. Aprobar suma a la
// persona al club en un segundo paso — la política de club_members solo
// deja sumar a alguien con una solicitud ya aprobada.
export async function respondToJoinRequest(formData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const requestId = formData.get('requestId')?.toString();
  const decision = formData.get('decision')?.toString();
  if (!requestId) return { error: 'Falta la solicitud.' };
  if (decision !== 'approve' && decision !== 'reject') return { error: 'Decisión inválida.' };

  const status = decision === 'approve' ? 'approved' : 'rejected';
  const { data: request, error: updateError } = await supabase
    .from('club_join_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('club_id, profile_id')
    .single();
  if (updateError) return { error: friendlyDbError(updateError) };

  if (decision === 'approve') {
    const { error: memberError } = await supabase
      .from('club_members')
      .insert({ club_id: request.club_id, profile_id: request.profile_id, role: 'member' });
    if (memberError) return { error: friendlyDbError(memberError) };
  }

  revalidatePath('/', 'layout');
  return { error: null };
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
  // Ausente = sin cambios de visibilidad.
  const visibility = formData.get('visibility')?.toString();

  if (!clubId) return { error: 'Falta el club.' };
  if (!clubName) return { error: 'El club necesita un nombre.' };

  const clubChanges = { name: clubName };
  if (VISIBILITY_TO_JOIN_MODE[visibility]) {
    clubChanges.join_mode = VISIBILITY_TO_JOIN_MODE[visibility];
    clubChanges.is_private = visibility !== 'publico';
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

// Actualiza el progreso del usuario en el libro activo de un club. Tres
// formas de registrarlo, porque cada quien puede tener una edición distinta
// del mismo libro:
//   - "chapter": elige un capítulo de la lista. El % de la barra sale de en
//     qué lugar de la lista está ese capítulo (los capítulos son iguales
//     para todos, aunque cambie la paginación de cada edición).
//   - "page": página actual y total de páginas de SU edición. El % sale de
//     esa proporción, propia de cada persona.
//   - "finished": declara el libro terminado — 100%, y guarda "finished_at"
//     (dispara, del lado del cliente, el formulario de la reseña final).
//     Para no romper el "hay que haber un capítulo o una página" que ya
//     exige la base, se ancla al último capítulo si el libro tiene, o a la
//     página total ya registrada si no.
export async function updateProgress(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const clubBookId = formData.get('clubBookId')?.toString();
  const mode = formData.get('mode')?.toString();
  const reaction = formData.get('reaction') || null;
  if (!clubBookId) return { error: 'Falta el libro del club.' };

  let chapterId = null;
  let currentPage = null;
  let totalPages = null;
  let percent;
  let finishedAt = null;

  if (mode === 'page') {
    currentPage = parseInt(formData.get('currentPage')?.toString() ?? '', 10);
    totalPages = parseInt(formData.get('totalPages')?.toString() ?? '', 10);
    if (!Number.isFinite(totalPages) || totalPages < 1) return { error: 'Indica el total de páginas de tu edición.' };
    if (!Number.isFinite(currentPage) || currentPage < 0) return { error: 'Indica en qué página vas.' };
    if (currentPage > totalPages) return { error: 'La página no puede ser mayor que el total.' };
    percent = Math.round((currentPage / totalPages) * 100);
  } else if (mode === 'finished') {
    const [{ data: chapters }, { data: volumes }, { data: existing }] = await Promise.all([
      supabase.from('chapters').select('id, number, volume_id').eq('club_book_id', clubBookId),
      supabase.from('volumes').select('id, name, position').eq('club_book_id', clubBookId),
      supabase.from('reading_progress').select('total_pages').eq('club_book_id', clubBookId).eq('profile_id', user.id).maybeSingle(),
    ]);
    const ordered = orderChapters(chapters ?? [], volumes ?? []);
    if (ordered.length > 0) {
      chapterId = ordered[ordered.length - 1].id;
    } else if (existing?.total_pages) {
      currentPage = existing.total_pages;
      totalPages = existing.total_pages;
    } else {
      return { error: 'Registra en qué página vas antes de marcarlo como terminado.' };
    }
    percent = 100;
    finishedAt = new Date().toISOString();
  } else {
    chapterId = formData.get('chapterId')?.toString();
    if (!chapterId) return { error: 'Elige un capítulo.' };

    const [{ data: chapters }, { data: volumes }] = await Promise.all([
      supabase.from('chapters').select('id, number, volume_id').eq('club_book_id', clubBookId),
      supabase.from('volumes').select('id, name, position').eq('club_book_id', clubBookId),
    ]);
    const ordered = orderChapters(chapters ?? [], volumes ?? []);
    const index = ordered.findIndex((c) => c.id === chapterId);
    if (index === -1 || ordered.length === 0) return { error: 'Ese capítulo no existe.' };
    percent = Math.round(((index + 1) / ordered.length) * 100);
  }

  const payload = { club_book_id: clubBookId, profile_id: user.id, chapter_id: chapterId, current_page: currentPage, total_pages: totalPages, percent, reaction };
  if (finishedAt) payload.finished_at = finishedAt;

  const { error } = await supabase
    .from('reading_progress')
    .upsert(payload, { onConflict: 'club_book_id,profile_id' });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null, finished: mode === 'finished' };
}

// Estilos válidos para la tarjeta de una cita — deben coincidir con el
// CHECK de comments.quote_style (migración 019) y con QUOTE_STYLES en
// src/lib/quoteCard.js.
const VALID_QUOTE_STYLES = ['cover', 'dark', 'editorial'];
const MAX_QUOTE_IMAGE_BYTES = 8 * 1024 * 1024; // de sobra: el JPEG que arma quoteCard.js pesa mucho menos.

function isFile(value) {
  return value && typeof value !== 'string' && typeof value.size === 'number';
}

// Publica un comentario (texto o cita destacada) en el libro activo de un
// club, o en un capítulo puntual si se manda chapterId. Si es una cita, se
// guarda el estilo visual elegido y —si el navegador pudo armarla— la
// imagen ya dibujada en ese estilo (bucket "quote-cards"), para que el feed
// muestre la tarjeta real en vez de recrearla con el tratamiento genérico.
export async function postComment(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const clubBookId = formData.get('clubBookId');
  const chapterId = formData.get('chapterId')?.toString() || null;
  const kind = formData.get('kind') || 'text';
  const body = formData.get('body')?.toString().trim();
  const isSpoiler = formData.get('isSpoiler') === 'on';
  const quoteStyleRaw = formData.get('quoteStyle')?.toString() || null;
  const quoteStyle = kind === 'quote' && VALID_QUOTE_STYLES.includes(quoteStyleRaw) ? quoteStyleRaw : null;
  if (!body) return { error: 'Escribe algo antes de publicar.' };

  // La imagen es un "mejor esfuerzo": si no llega, o falla la subida, la
  // cita se publica igual — solo que el feed la va a mostrar con el
  // tratamiento genérico (portada + texto), como las citas de antes.
  let quoteImageUrl = null;
  const quoteImage = formData.get('quoteImage');
  if (quoteStyle && isFile(quoteImage) && quoteImage.size > 0 && quoteImage.size <= MAX_QUOTE_IMAGE_BYTES && quoteImage.type === 'image/jpeg') {
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('quote-cards')
      .upload(path, quoteImage, { contentType: 'image/jpeg' });
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('quote-cards').getPublicUrl(path);
      quoteImageUrl = publicUrl;
    }
  }

  const { error } = await supabase.from('comments').insert({
    club_book_id: clubBookId,
    chapter_id: chapterId,
    profile_id: user.id,
    kind,
    body,
    is_spoiler: isSpoiler,
    quote_style: quoteStyle,
    quote_image_url: quoteImageUrl,
  });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null, quoteStyle, quoteImageUrl };
}

// Edita el texto (y opcionalmente el estilo) de tu propia cita — migración
// 027. Si tenía una imagen guardada, el navegador vuelve a dibujar la
// tarjeta con el texto nuevo (mismo renderQuoteCard que al publicar) y acá
// se reemplaza el archivo viejo en Storage, para que no queden dos
// versiones (una con el texto de antes) dando vueltas.
export async function updateQuote(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const commentId = formData.get('commentId')?.toString();
  const body = formData.get('body')?.toString().trim();
  const isSpoiler = formData.get('isSpoiler') === 'on';
  const quoteStyleRaw = formData.get('quoteStyle')?.toString() || null;
  const quoteStyle = VALID_QUOTE_STYLES.includes(quoteStyleRaw) ? quoteStyleRaw : null;
  if (!commentId) return { error: 'Falta la cita.' };
  if (!body) return { error: 'Escribe algo antes de guardar.' };

  const { data: existing } = await supabase
    .from('comments')
    .select('quote_image_url')
    .eq('id', commentId)
    .eq('profile_id', user.id)
    .eq('kind', 'quote')
    .maybeSingle();

  // Mismo "mejor esfuerzo" que al publicar: si la imagen nueva no llega o
  // falla la subida, se guarda el texto/estilo igual, solo que sin imagen
  // (el feed cae al tratamiento genérico).
  let quoteImageUrl = null;
  const quoteImage = formData.get('quoteImage');
  if (quoteStyle && isFile(quoteImage) && quoteImage.size > 0 && quoteImage.size <= MAX_QUOTE_IMAGE_BYTES && quoteImage.type === 'image/jpeg') {
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('quote-cards')
      .upload(path, quoteImage, { contentType: 'image/jpeg' });
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('quote-cards').getPublicUrl(path);
      quoteImageUrl = publicUrl;
    }
  }

  const { error } = await supabase
    .from('comments')
    .update({ body, is_spoiler: isSpoiler, quote_style: quoteStyle, quote_image_url: quoteImageUrl })
    .eq('id', commentId)
    .eq('profile_id', user.id)
    .eq('kind', 'quote');
  if (error) return { error: friendlyDbError(error) };

  // La imagen vieja queda huérfana si no se limpia — se borra recién acá,
  // después de guardar bien la fila (mejor un archivo de más colgado si algo
  // falla antes, que perder la referencia a uno que sigue en uso).
  const oldPath = existing?.quote_image_url?.split('/quote-cards/')[1];
  if (oldPath) {
    await supabase.storage.from('quote-cards').remove([oldPath]);
  }

  revalidatePath('/', 'layout');
  return { error: null, quoteStyle, quoteImageUrl };
}

// Borra tu propia cita — la fila y, si tenía imagen guardada, también el
// archivo en Storage (mismo criterio que las fotos: acá la cita es dueña de
// un único archivo propio, no compartido con nada más).
export async function deleteQuote(commentId) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!commentId) return { error: 'Falta la cita.' };

  const { data: existing } = await supabase
    .from('comments')
    .select('quote_image_url')
    .eq('id', commentId)
    .eq('profile_id', user.id)
    .eq('kind', 'quote')
    .maybeSingle();

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('profile_id', user.id)
    .eq('kind', 'quote');
  if (error) return { error: friendlyDbError(error) };

  const path = existing?.quote_image_url?.split('/quote-cards/')[1];
  if (path) {
    await supabase.storage.from('quote-cards').remove([path]);
  }

  revalidatePath('/', 'layout');
  return { error: null };
}

// Publica (o actualiza, si ya existía una) la reseña final de un libro —
// título + texto, siempre del libro entero (chapter_id null). Es un
// comentario más (kind = 'review'), lo dispara declarar el libro como
// terminado en Actualizar progreso. Si "reviewId" llega, es una edición de
// la reseña que esa persona ya había publicado para este libro (una por
// persona por libro, por convención de la propia UI — no hay constraint en
// la base que lo obligue, así que técnicamente se podría duplicar a mano).
export async function postBookReview(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const clubBookId = formData.get('clubBookId')?.toString();
  const reviewId = formData.get('reviewId')?.toString() || null;
  const title = formData.get('title')?.toString().trim();
  const body = formData.get('body')?.toString().trim() || null;
  const isSpoiler = formData.get('isSpoiler') === 'on';
  if (!clubBookId) return { error: 'Falta el libro del club.' };
  if (!title) return { error: 'Ponle un título a tu reseña.' };

  const row = { club_book_id: clubBookId, chapter_id: null, profile_id: user.id, kind: 'review', title, body, is_spoiler: isSpoiler };

  const { error } = reviewId
    ? await supabase.from('comments').update(row).eq('id', reviewId).eq('profile_id', user.id)
    : await supabase.from('comments').insert(row);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}

// Borra tu propia reseña final. "eq('profile_id', user.id)" es cinturón y
// tirantes — la política de RLS (migración 024) ya lo exige, esto solo
// evita una consulta que de entrada no puede tocar nada.
export async function deleteBookReview(reviewId) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!reviewId) return { error: 'Falta la reseña.' };

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', reviewId)
    .eq('profile_id', user.id)
    .eq('kind', 'review');
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}
