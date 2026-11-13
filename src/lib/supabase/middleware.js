import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { USERNAME_COOKIE } from '@/lib/username';

// Rutas donde no tiene sentido exigir un username antes de seguir: el login
// en sí, la propia pantalla de elegirlo (evita el loop), el intercambio de
// código de Google/recuperación de contraseña (todavía no tiene sesión
// armada), y poner la contraseña nueva — esa pantalla ya trae su propia
// sesión de recuperación, no tiene sentido interrumpirla pidiendo un
// username primero.
const EXEMPT_PATHS = ['/login', '/elegir-usuario', '/auth/callback', '/restablecer-contrasena'];

function isExempt(pathname) {
  return EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// La app vive en dos dominios sin que uno redirija al otro: libris.cl (el
// real — assetlinks.json, la app de Android, todo apunta ahí) y el alias
// que pone Vercel solo, libris-relea.vercel.app. Las cookies de sesión
// quedan atadas al dominio donde se inició sesión — entrar alguna vez por
// uno y otras por el otro deja dos sesiones separadas que se "olvidan"
// entre sí.
//
// Un intento anterior de esto redirigía CUALQUIER pedido al dominio
// equivocado, sin importar el método — y eso rompía el login de verdad:
// tocar "Entrar" dispara una Server Action (un POST a la propia página,
// con una referencia a esa acción atada al dominio donde se sirvió el
// formulario). Redirigir ESE pedido a mitad de camino hacia otro origen
// hace que el navegador lo descarte — se veía como si el login
// "rebotara" sin motivo. Por eso esto solo redirige GET (navegación de
// verdad, entrar a una página): para cuando eso pase, el formulario de
// login YA se sirvió desde libris.cl, así que el POST de "Entrar" nunca
// necesita cruzar de dominio — nace y muere ahí mismo.
const NON_CANONICAL_HOSTS = ['libris-relea.vercel.app'];
const CANONICAL_HOST = 'libris.cl';

// Refreshes the Supabase auth session on every request so server components
// always see a valid (non-expired) session. Called from src/middleware.js.
export async function updateSession(request) {
  const host = request.headers.get('host');
  if (request.method === 'GET' && host && NON_CANONICAL_HOSTS.includes(host)) {
    const url = request.nextUrl.clone();
    url.protocol = 'https';
    url.host = CANONICAL_HOST;
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  // Do not remove — refreshes the session and is required for the cookies
  // above to actually get written back to the response.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // "Elige tu usuario" (migración 017) — obligatorio para cualquier cuenta
  // sin username todavía: las creadas antes de que existiera este campo, o
  // por Google (que no lo pide). Una cookie evita consultar la base en cada
  // request una vez que ya se sabe que la cuenta tiene uno.
  if (user && !isExempt(pathname) && !request.cookies.get(USERNAME_COOKIE)) {
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();
    if (profile?.username) {
      supabaseResponse.cookies.set(USERNAME_COOKIE, '1', { path: '/', maxAge: 60 * 60 * 24 * 365 });
    } else {
      const url = request.nextUrl.clone();
      url.pathname = '/elegir-usuario';
      url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
