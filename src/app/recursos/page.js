import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DescubrirScreen } from '@/screens/DescubrirScreen.jsx';

export const metadata = { title: 'Recursos · Libris' };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: items } = await supabase
    .from('editorial_items')
    .select('id, category, title, subtitle, body, image_url, link_url')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  return <DescubrirScreen items={items ?? []} />;
}
