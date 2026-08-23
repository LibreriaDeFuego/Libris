'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/requireUser';
import { friendlyDbError } from '@/lib/friendlyError';
import { isValidUsername, normalizeUsername, USERNAME_HELP, USERNAME_COOKIE } from '@/lib/username';

// Una vez que el perfil tiene username, el middleware ya no necesita
// consultar la base para saberlo en cada request — le alcanza con esta
// cookie. Un año de duración: si se borra (o es un browser nuevo), el
// middleware vuelve a chequear contra la base una vez y la deja puesta de nuevo.
async function markUsernameSet() {
  const cookieStore = await cookies();
  cookieStore.set(USERNAME_COOKIE, '1', { path: '/', maxAge: 60 * 60 * 24 * 365 });
}

// Empezar a seguir a alguien. No se puede seguir a uno mismo — RLS ya lo
// impide (el check de la tabla), pero lo validamos antes para un mensaje claro.
export async function followProfile(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const profileId = formData.get('profileId')?.toString();
  if (!profileId) return { error: 'Falta el perfil.' };
  if (profileId === user.id) return { error: 'No puedes seguirte a ti mismo.' };

  const { error } = await supabase.from('follows').insert({ follower_id: user.id, followed_id: profileId });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/perfil');
  return { error: null };
}

// Dejar de seguir.
export async function unfollowProfile(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const profileId = formData.get('profileId')?.toString();
  if (!profileId) return { error: 'Falta el perfil.' };

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('followed_id', profileId);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/perfil');
  return { error: null };
}

// Editar el propio perfil: nombre, usuario y bio. La foto se sube aparte
// (uploadAvatar, en actions/media.js) porque implica Storage.
export async function updateProfile(prevState, formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const displayName = formData.get('displayName')?.toString().trim();
  const bio = formData.get('bio')?.toString().trim() || null;
  const username = normalizeUsername(formData.get('username'));
  if (!displayName) return { error: 'Necesitas un nombre.' };
  if (!isValidUsername(username)) return { error: USERNAME_HELP };

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, bio, username })
    .eq('id', user.id);
  if (error) {
    if (error.code === '23505') return { error: 'Ese nombre de usuario ya está en uso.' };
    return { error: friendlyDbError(error) };
  }

  await markUsernameSet();
  revalidatePath('/', 'layout');
  return { error: null, saved: true };
}

// Elegir el nombre de usuario por primera vez — la pantalla obligatoria
// que ven las cuentas creadas antes de que existiera este campo
// (/elegir-usuario). Después de esto pueden seguir usando la app.
export async function setUsername(prevState, formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const username = normalizeUsername(formData.get('username'));
  if (!isValidUsername(username)) return { error: USERNAME_HELP };

  const { error } = await supabase.from('profiles').update({ username }).eq('id', user.id);
  if (error) {
    if (error.code === '23505') return { error: 'Ese nombre de usuario ya está en uso.' };
    return { error: friendlyDbError(error) };
  }

  await markUsernameSet();
  revalidatePath('/', 'layout');
  return { error: null, saved: true };
}
