'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/requireUser';
import { friendlyDbError } from '@/lib/friendlyError';

// Reenvía (o deja de reenviar) la publicación de OTRA persona a tu propio
// feed — migración 039. Distinto de toggleShareToFeed (clubs.js), que solo
// te deja compartir tu propio comentario/nota de voz: esto es al revés,
// no hace falta ser dueño del contenido. "kind" dice en qué columna va el
// id: 'comment' cubre reseñas, citas y comentarios/notas de voz que su
// autor ya compartió; 'post' cubre fotos. Qué se puede repostear (solo lo
// que ya califica para el feed) lo valida la política de RLS de insert en
// "reposts", no acá — mismo criterio liviano que ya usan los "me gusta".
export async function toggleRepost(kind, id) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!id || (kind !== 'comment' && kind !== 'post')) return { error: 'Falta la publicación.' };

  const column = kind === 'comment' ? 'comment_id' : 'post_id';
  const { data: existing } = await supabase
    .from('reposts')
    .select('id')
    .eq(column, id)
    .eq('profile_id', user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from('reposts').delete().eq('id', existing.id)
    : await supabase.from('reposts').insert({ [column]: id, profile_id: user.id });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath('/', 'layout');
  revalidatePath('/perfil');
  return { error: null };
}
