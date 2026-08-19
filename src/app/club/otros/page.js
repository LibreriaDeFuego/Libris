import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs } from '@/lib/activeClub';
import { OtrosClubesScreen } from '@/screens/OtrosClubesScreen.jsx';

export const metadata = { title: 'Descubrir clubes · Libris' };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [myClubs, { data: publicClubs }] = await Promise.all([
    getMyClubs(supabase, user.id),
    supabase.rpc('discover_public_clubs', { limit_count: 50 }),
  ]);

  const myClubIds = new Set(myClubs.map((c) => c.id));
  const clubs = (publicClubs ?? []).filter((c) => !myClubIds.has(c.id));

  return <OtrosClubesScreen clubs={clubs} />;
}
