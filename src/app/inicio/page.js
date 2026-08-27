import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs } from '@/lib/activeClub';
import { InicioScreen } from '@/screens/InicioScreen.jsx';

export const metadata = { title: 'Inicio · Libris' };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [myClubs, { data: activity }] = await Promise.all([
    getMyClubs(supabase, user.id),
    supabase.rpc('recent_activity', { limit_count: 30 }),
  ]);

  const myClubIds = new Set(myClubs.map((c) => c.id));

  return <InicioScreen activity={activity ?? []} myClubIds={myClubIds} myProfileId={user.id} />;
}
