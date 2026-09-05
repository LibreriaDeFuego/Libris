import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs } from '@/lib/activeClub';
import { getNotifications } from '@/lib/notifications';
import { signCommentImageUrls } from '@/lib/commentPhotos';
import { InicioScreen } from '@/screens/InicioScreen.jsx';

export const metadata = { title: 'Inicio · Libris' };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [myClubs, { data: activity }, { notifications, hasUnread }] = await Promise.all([
    getMyClubs(supabase, user.id),
    supabase.rpc('recent_activity', { limit_count: 30 }),
    getNotifications(supabase, user.id),
  ]);

  const myClubIds = new Set(myClubs.map((c) => c.id));
  // Un comentario compartido a Inicio con una foto adjunta trae, todavía,
  // el path guardado (bucket privado "comment-photos") — se firma acá.
  const signedActivity = await signCommentImageUrls(supabase, activity ?? []);

  return (
    <InicioScreen
      activity={signedActivity}
      myClubIds={myClubIds}
      myProfileId={user.id}
      notifications={notifications}
      hasUnread={hasUnread}
    />
  );
}
