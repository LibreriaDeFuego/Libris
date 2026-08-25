import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingScreen } from '@/screens/OnboardingScreen.jsx';

export const metadata = { title: 'Nuevo club · Libris' };

// Misma pantalla que el onboarding, pero alcanzable cuando el usuario ya
// pertenece a otros clubes: multi-club necesita una puerta de entrada extra.
// ?modo=unirme la abre directo en la pestaña "Unirme a un club" — la usa el
// atajo de "Unirme con un link" en la hoja de Mis clubes.
export default async function Page({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { modo } = await searchParams;
  const initialMode = modo === 'unirme' ? 'Unirme a un club' : 'Crear club';

  return <OnboardingScreen showBack initialMode={initialMode} />;
}
