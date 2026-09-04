import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs } from '@/lib/activeClub';
import { getProfileData } from '@/lib/profileData';
import { PerfilScreen } from '@/screens/PerfilScreen.jsx';

export const metadata = { title: 'Perfil · Libris' };

export default async function Page({ params }) {
  const { profileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Este link se comparte hacia afuera (menú "Compartir perfil") — igual que
  // /unirse/[clubId], volvemos acá después de loguearse/registrarse.
  if (!user) redirect(`/login?next=/perfil/${profileId}`);

  const [clubs, data] = await Promise.all([
    getMyClubs(supabase, user.id),
    getProfileData(supabase, user.id, profileId),
  ]);
  if (!data.profile) notFound();

  return (
    <PerfilScreen
      profile={data.profile}
      isOwn={data.isOwn}
      isFollowing={data.isFollowing}
      stats={data.stats}
      activity={data.activity}
      myClubIds={new Set(clubs.map((c) => c.id))}
      myProfileId={user.id}
    />
  );
}
