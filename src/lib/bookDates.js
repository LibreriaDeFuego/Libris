// Fechas de lectura de un libro en "Mi biblioteca" (profile_books_read,
// migración 047) — llegan como "YYYY-MM-DD" (columna date, sin hora).
// new Date("YYYY-MM-DD") lo interpreta como medianoche UTC; en un huso
// negativo (Chile y el resto de Latinoamérica) eso muestra el día
// anterior. Se arma la fecha en hora LOCAL a mano para no correrse.
function parseDateOnly(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatBookDate(value) {
  const date = parseDateOnly(value);
  if (!date) return null;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

// El texto bajo la portada, en Mi Biblioteca: rango si hay las dos
// fechas, "Empezado ..." si todavía no hay fecha de fin (se sigue
// leyendo), "Terminado ..." si por lo que sea solo se cargó esa, o nada
// si no hay ninguna (un libro de club sin datos de progreso, o uno
// agregado a mano sin fechas puestas).
export function formatDateRange(startedAt, finishedAt) {
  if (startedAt && finishedAt) return `${formatBookDate(startedAt)} – ${formatBookDate(finishedAt)}`;
  if (finishedAt) return `Terminado ${formatBookDate(finishedAt)}`;
  if (startedAt) return `Empezado ${formatBookDate(startedAt)}`;
  return null;
}

// El año a agrupar para el Recuento — el de la fecha de fin (el mismo
// criterio que usa Goodreads para su "Year in Books": un libro cuenta
// para el año en que se terminó, no en el que se empezó).
export function finishedYear(book) {
  if (!book.finished_at) return null;
  return parseDateOnly(book.finished_at).getFullYear();
}
