import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { USERNAME_COOKIE } from '@/lib/username';

// Rutas donde no tiene sentido exigir un username antes de seguir: el login
// en sí, la propia pantalla de elegirlo (evita el loop), y el intercambio de
// código de Google, que todavía no tiene sesión armada.
const EXEMPT_PATHS = ['/login', '/elegir-usuario', '/auth/callback'];

function isExempt(pathname) {
  return EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Refreshes the Supabase auth session on every request so server components
// always see a valid (non-expired) session. Called from src/middleware.js.
export async function updateSession(request) {
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

  // "Elegí tu usuario" (migración 017) — obligatorio para cualquier cuenta
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
