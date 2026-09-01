import { formatRelativeTime } from '@/lib/formatRelativeTime';

// "kind" que trae notifications_feed (migración 037) -> el texto y el
// link de cada notificación. Todas hablan de algo TUYO (tu comentario, tu
// foto) porque la función ya filtra por auth.uid() del lado del servidor.
function describe(n) {
  switch (n.kind) {
    case 'follow':
      return { text: `${n.actor_name} empezó a seguirte`, href: `/perfil/${n.actor_id}` };
    case 'like_comment':
      return {
        text: `A ${n.actor_name} le gustó lo que escribiste en ${n.club_name}`,
        href: n.chapter_id ? `/club/${n.club_id}/comentarios?capitulo=${n.chapter_id}` : `/club/${n.club_id}/comentarios`,
      };
    case 'like_post':
      return { text: `A ${n.actor_name} le gustó tu foto`, href: '/perfil' };
    case 'reply':
      return {
        text: `${n.actor_name} te respondió en ${n.club_name}`,
        href: n.chapter_id ? `/club/${n.club_id}/comentarios?capitulo=${n.chapter_id}` : `/club/${n.club_id}/comentarios`,
      };
    case 'post_comment':
      return { text: `${n.actor_name} comentó tu foto`, href: '/perfil' };
    default:
      return { text: n.actor_name, href: '/perfil' };
  }
}

// Trae las notificaciones (`notifications_feed`, security definer — ya
// filtra por auth.uid() del lado del servidor) y las prepara para
// mostrar: texto + link armados, y cuáles son nuevas desde la última vez
// que la persona abrió la campana (`profiles.notifications_seen_at`).
export async function getNotifications(supabase, userId, limitCount = 30) {
  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase.rpc('notifications_feed', { limit_count: limitCount }),
    supabase.from('profiles').select('notifications_seen_at').eq('id', userId).maybeSingle(),
  ]);

  const seenAt = profile?.notifications_seen_at ? new Date(profile.notifications_seen_at).getTime() : 0;

  const notifications = (rows ?? []).map((n) => {
    const { text, href } = describe(n);
    return {
      id: `${n.kind}-${n.source_id}`,
      kind: n.kind,
      text,
      href,
      actorAvatarUrl: n.actor_avatar_url,
      actorName: n.actor_name,
      preview: n.preview,
      relativeTime: formatRelativeTime(n.created_at),
      isNew: new Date(n.created_at).getTime() > seenAt,
    };
  });

  return { notifications, hasUnread: notifications.some((n) => n.isNew) };
}
