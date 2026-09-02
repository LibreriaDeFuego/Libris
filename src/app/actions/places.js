'use server';

// Autocompletado de direcciones para "Próxima reunión" (PreferenciasScreen),
// vía la búsqueda pública de Nominatim (OpenStreetMap) — sin API key, mismo
// espíritu que googleMapsUrl() en meetingFormat.js: no hacía falta meterse
// con la API de Google (billing, cuota) solo para sugerir direcciones
// mientras se escribe. Nominatim pide un User-Agent propio y como máximo
// ~1 solicitud por segundo; el cliente debouncea antes de llamar a esto,
// así que en el uso normal de la app queda lejos de ese límite.
export async function searchPlaces(query) {
  const q = query?.toString().trim();
  if (!q || q.length < 3) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Libris-app/1.0 (club de lectura; sin contacto público)' },
    });
    if (!res.ok) return [];
    const results = await res.json();
    return results.map((item) => ({ id: String(item.place_id), label: item.display_name }));
  } catch {
    // Sin conexión, Nominatim caído, etc. — quien escribe puede seguir
    // tipeando la dirección a mano, el campo no depende de esto.
    return [];
  }
}
