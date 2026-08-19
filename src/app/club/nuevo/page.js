import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingScreen } from '@/screens/OnboardingScreen.jsx';

export const metadata = { title: 'Nuevo club · Libris' };

// Misma pantalla que el onboarding, pero alcanzable cuando el usuario ya
// pertenece a otros clubes: multi-club necesita una puerta de entrada extra.
export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <OnboardingScreen showBack />;
}
