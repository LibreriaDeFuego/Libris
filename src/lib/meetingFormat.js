// meeting_at llega de Supabase como "timestamp" sin huso ("2026-03-12T19:00:00")
// — new Date() lo interpreta como hora local del navegador, que es
// justamente lo que queremos: lo que la persona administradora escribió es
// lo que todos ven, sin conversión de husos (mismo criterio que
// formatRelativeTime.js).
export function formatMeetingDate(value) {
  const date = new Date(value);
  const dateLabel = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeLabel = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dateLabel.charAt(0).toUpperCase()}${dateLabel.slice(1)}, ${timeLabel}`;
}

// Un link a Google Maps armado con lo que se escribió como lugar — sin API
// key ni mapa embebido, solo la búsqueda pública de Maps.
export function googleMapsUrl(place) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}
