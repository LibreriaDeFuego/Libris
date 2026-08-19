import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DescubrirScreen } from '@/screens/DescubrirScreen.jsx';

export const metadata = { title: 'Descubrir · Libris' };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: items }, { data: books }] = await Promise.all([
    supabase
      .from('editorial_items')
      .select('id, category, title, subtitle, body, image_url, link_url')
      .eq('is_published', true)
      .order('published_at', { ascending: false }),
    // Los libros de otros clubes son invisibles para RLS; esta función
    // security definer devuelve solo título, autor, portada y cuántos clubes.
    supabase.rpc('popular_books', { limit_count: 12 }),
  ]);

  return <DescubrirScreen items={items ?? []} books={books ?? []} />;
}
