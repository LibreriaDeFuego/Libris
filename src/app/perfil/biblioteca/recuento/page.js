import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLibraryData } from '@/lib/profileData';
import { RecuentoScreen } from '@/screens/RecuentoScreen.jsx';

export const metadata = { title: 'Recuento del año · Libris' };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const data = await getLibraryData(supabase, user.id, user.id);
  if (!data.profile) notFound();

  return (
    <RecuentoScreen
      profile={data.profile}
      isOwn={data.isOwn}
      booksRead={data.booksRead}
    />
  );
}
