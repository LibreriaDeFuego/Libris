'use server';

import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { friendlyAuthError } from '@/lib/friendlyError';
import { safeNext } from '@/lib/safeNext';
import { isValidUsername, normalizeUsername, USERNAME_HELP, USERNAME_COOKIE } from '@/lib/username';

// Origen real de la request: en Vercel llega por x-forwarded-*, en local por host.
async function requestOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

export async function signIn(prevState, formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const next = safeNext(formData.get('next'));
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendlyAuthError(error) };

  redirect(next);
}

export async function signUp(prevState, formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const displayName = formData.get('displayName');
  const username = normalizeUsername(formData.get('username'));
  const next = safeNext(formData.get('next'));
  const supabase = await createClient();

  if (!isValidUsername(username)) return { error: USERNAME_HELP };

  // Chequeo previo para dar un mensaje claro antes de intentar crear la
  // cuenta — la unicidad real la impone la base (índice único), esto es
  // solo para no hacerle escribir todo el formulario de nuevo si ya está
  // tomado.
  const { data: available } = await supabase.rpc('is_username_available', { check_username: username });
  if (available === false) return { error: 'Ese nombre de usuario ya está en uso.' };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, username } },
  });
  if (error) {
    // Si dos personas mandan el mismo username al mismo tiempo, el chequeo
    // de arriba no alcanza — este es el mensaje para esa carrera rarísima.
    if (error.message?.includes('duplicate key') || error.message?.includes('username')) {
      return { error: 'Ese nombre de usuario ya está en uso.' };
    }
    return { error: friendlyAuthError(error) };
  }

  // Con "Confirm email" activado (default de Supabase) signUp no devuelve
  // sesión: la cuenta existe pero recién queda usable al abrir el link del
  // mail. Sin este chequeo redirigíamos a "/" y el usuario rebotaba al login
  // sin ninguna explicación.
  if (!data.session) return { error: null, needsConfirmation: true };

  const cookieStore = await cookies();
  cookieStore.set(USERNAME_COOKIE, '1', { path: '/', maxAge: 60 * 60 * 24 * 365 });

  redirect(next);
}

// Login con Google. Supabase devuelve la URL de consentimiento y redirigimos
// ahí; al volver, /auth/callback canjea el ?code= por la sesión.
export async function signInWithGoogle(prevState, formData) {
  const next = safeNext(formData.get('next'));
  const supabase = await createClient();
  const origin = await requestOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: friendlyAuthError(error) };
  if (!data?.url) return { error: 'No pudimos abrir el login de Google.' };

  redirect(data.url);
}

// Pide el mail de "restablecer contraseña" — Supabase siempre devuelve
// éxito acá, exista o no una cuenta con ese correo (para no filtrar qué
// emails están registrados), así que el mensaje de vuelta es el mismo en
// los dos casos. El link del mail apunta a /auth/callback, que ya sabe
// canjear el code/token y mandar a "next" — acá next es la pantalla
// donde se escribe la contraseña nueva.
export async function requestPasswordReset(prevState, formData) {
  const email = formData.get('email')?.toString().trim();
  if (!email) return { error: 'Escribe tu correo.' };

  const supabase = await createClient();
  const origin = await requestOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/restablecer-contrasena')}`,
  });
  if (error) return { error: friendlyAuthError(error) };

  return { error: null, sent: true };
}

// Pone la contraseña nueva — solo funciona con la sesión de recuperación
// que deja /auth/callback al canjear el link del mail (restablecer-
// contrasena/page.js ya chequea que exista esa sesión antes de mostrar
// este formulario).
export async function updatePassword(prevState, formData) {
  const password = formData.get('password')?.toString();
  if (!password || password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendlyAuthError(error) };

  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
