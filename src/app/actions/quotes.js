'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/requireUser';
import { friendlyDbError } from '@/lib/friendlyError';

// Citas destacadas del PERFIL (migración 049) — a diferencia de las citas
// de club (comments.kind = 'quote', clubs.js), estas no cuelgan de ningún
// club_book_id: se citan desde la barra de "compartir" del perfil, sin
// estar mirando ningún libro puntual. Alcance elegido a propósito, más
// chico que una cita de club: se puede publicar/borrar/dar "me gusta",
// pero no tiene hilo de respuestas ni se puede repostear todavía.

// Estética propia de la cita ADENTRO de la app (migración 050) — deben
// coincidir con los CHECK de profile_quotes.card_style/card_color y con
// CARD_STYLES/CARD_COLORS en src/lib/quoteFeedCard.js.
const VALID_CARD_STYLES = ['comilla', 'franja', 'centrado', 'papel'];
const VALID_CARD_COLORS = ['blanco', 'crema', 'coral', 'dorado', 'noche'];

// Los libros que se pueden citar: los de tus clubes (cualquiera, no
// necesariamente terminado) más los que agregaste a mano en Mi Biblioteca
// — ver profile_quotable_books.
export async function getQuotableBooks() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data, error } = await supabase.rpc('profile_quotable_books', { target_profile_id: user.id });
  if (error) return { books: [], error: friendlyDbError(error) };
  return { books: data ?? [], error: null };
}

export async function createProfileQuote(prevState, formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const bookTitle = formData.get('bookTitle')?.toString().trim();
  const bookAuthor = formData.get('bookAuthor')?.toString().trim() || null;
  const bookCoverUrl = formData.get('bookCoverUrl')?.toString().trim() || null;
  const quoteText = formData.get('quoteText')?.toString().trim();
  const cardStyleRaw = formData.get('cardStyle')?.toString() || null;
  const cardColorRaw = formData.get('cardColor')?.toString() || null;
  const cardStyle = VALID_CARD_STYLES.includes(cardStyleRaw) ? cardStyleRaw : null;
  const cardColor = VALID_CARD_COLORS.includes(cardColorRaw) ? cardColorRaw : null;

  if (!bookTitle) return { error: 'Elige un libro.' };
  if (!quoteText) return { error: 'Escribe la cita.' };

  const { error } = await supabase.from('profile_quotes').insert({
    profile_id: user.id,
    book_title: bookTitle,
    book_author: bookAuthor,
    book_cover_url: bookCoverUrl,
    quote_text: quoteText,
    card_style: cardStyle,
    card_color: cardColor,
  });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}

// Solo se puede borrar — no hay edición todavía (mismo criterio que se
// eligió para el resto de esta primera versión: alcance chico).
export async function deleteProfileQuote(quoteId) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!quoteId) return { error: 'Falta la cita.' };

  const { error } = await supabase
    .from('profile_quotes')
    .delete()
    .eq('id', quoteId)
    .eq('profile_id', user.id);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}

// "Me gusta" en una cita del perfil — mismo toggle que togglePostLike
// (posts.js) / toggleCommentLike (clubs.js), sobre profile_quote_likes.
export async function toggleQuoteLike(quoteId) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!quoteId) return { error: 'Falta la cita.' };

  const { data: existing } = await supabase
    .from('profile_quote_likes')
    .select('id')
    .eq('quote_id', quoteId)
    .eq('profile_id', user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from('profile_quote_likes').delete().eq('id', existing.id)
    : await supabase.from('profile_quote_likes').insert({ quote_id: quoteId, profile_id: user.id });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null };
}
