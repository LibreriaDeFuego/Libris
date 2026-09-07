import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLibraryData } from '@/lib/profileData';
import { RecuentoScreen } from '@/screens/RecuentoScreen.jsx';

export const metadata = { title: 'Recuento del año · Libris' };

export default async function Page({ params }) {
  const { profileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Mismo criterio que /perfil/[profileId]/biblioteca: se puede compartir
  // hacia afuera, volvemos acá después de loguearse/registrarse.
  if (!user) redirect(`/login?next=/perfil/${profileId}/biblioteca/recuento`);

  const data = await getLibraryData(supabase, user.id, profileId);
  if (!data.profile) notFound();

  return (
    <RecuentoScreen
      profile={data.profile}
      isOwn={data.isOwn}
      booksRead={data.booksRead}
    />
  );
}
