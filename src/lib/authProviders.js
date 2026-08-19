// Pregunta a Supabase qué proveedores de login están habilitados en el
// proyecto. Sirve para mostrar el botón de Google solo cuando está realmente
// configurado: si lo mostráramos siempre, tocarlo daría error hasta terminar
// el alta en Google Cloud Console.
export async function getEnabledProviders() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      // 60s: al activar un proveedor en Supabase el botón aparece casi
      // enseguida, sin pegarle a /settings en cada request.
      next: { revalidate: 60 },
    });
    if (!res.ok) return {};
    const settings = await res.json();
    return settings?.external ?? {};
  } catch {
    // Si Supabase no responde, degradamos a solo email/contraseña.
    return {};
  }
}
