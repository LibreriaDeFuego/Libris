'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/requireUser';
import { friendlyDbError } from '@/lib/friendlyError';

// Empezar a seguir a alguien. No se puede seguir a uno mismo — RLS ya lo
// impide (el check de la tabla), pero lo validamos antes para un mensaje claro.
export async function followProfile(formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const profileId = formData.get('profileId')?.toString();
  if (!profileId) return { error: 'Falta el perfil.' };
  if (profileId === user.id) return { error: 'No te podés seguir a vos mismo.' };

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

// Editar el propio perfil: nombre y bio. La foto se sube aparte
// (uploadAvatar, en actions/media.js) porque implica Storage.
export async function updateProfile(prevState, formData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const displayName = formData.get('displayName')?.toString().trim();
  const bio = formData.get('bio')?.toString().trim() || null;
  if (!displayName) return { error: 'Necesitás un nombre.' };

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, bio })
    .eq('id', user.id);
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  return { error: null, saved: true };
}
