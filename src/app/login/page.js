import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/LoginForm';
import { safeNext } from '@/lib/safeNext';
import { getEnabledProviders } from '@/lib/authProviders';

export const metadata = { title: 'Entrar · Libris' };

export default async function LoginPage({ searchParams }) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(safeNext(next));

  const providers = await getEnabledProviders();

  return <LoginForm next={safeNext(next)} googleEnabled={providers.google === true} />;
}
