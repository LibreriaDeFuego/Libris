import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/LoginForm';
import { safeNext } from '@/lib/safeNext';

export const metadata = { title: 'Entrar · Libris' };

export default async function LoginPage({ searchParams }) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(safeNext(next));

  return <LoginForm next={safeNext(next)} />;
}
