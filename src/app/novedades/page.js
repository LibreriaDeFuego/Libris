import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NovedadesScreen } from '@/screens/NovedadesScreen.jsx';

export const metadata = { title: 'Novedades · Libris' };

// Novedades es el feed editorial: los artículos que se van publicando
// (guías, recomendaciones de autoras, cursos), ordenados del más nuevo al
// más viejo. La actividad de los clubes (comentarios, progreso, otros
// clubes leyendo lo mismo) vive ahora en cada club, no acá.
export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: items } = await supabase
    .from('editorial_items')
    .select('id, category, title, subtitle, body, image_url, link_url, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  return <NovedadesScreen items={items ?? []} />;
}
