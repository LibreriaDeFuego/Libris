import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveClub, getActiveClubBook } from '@/lib/activeClub';
import { ComentariosScreen } from '@/screens/ComentariosScreen.jsx';

export const metadata = { title: 'Comentarios · Libris' };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { active } = await getActiveClub(supabase, user.id);
  if (!active) redirect('/');
  const clubBook = await getActiveClubBook(supabase, active.id);
  if (!clubBook) redirect('/');

  const { data: comments } = await supabase
    .from('comments')
    .select('id, kind, body, is_spoiler, created_at, profile_id, voice_url, voice_transcript, voice_duration_seconds, profiles(display_name)')
    .eq('club_book_id', clubBook.id)
    .order('created_at', { ascending: false });

  // El bucket de audio es privado: cada nota necesita una URL firmada, que
  // solo se genera si la política de Storage confirma la membresía.
  const voicePaths = (comments ?? []).filter((c) => c.kind === 'voice' && c.voice_url).map((c) => c.voice_url);
  const signedByPath = new Map();
  if (voicePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('voice-notes')
      .createSignedUrls(voicePaths, 60 * 60);
    for (const entry of signed ?? []) {
      if (entry.signedUrl) signedByPath.set(entry.path, entry.signedUrl);
    }
  }

  const withAudio = (comments ?? []).map((c) => ({
    ...c,
    audio_url: c.voice_url ? signedByPath.get(c.voice_url) ?? null : null,
  }));

  return <ComentariosScreen clubBookId={clubBook.id} comments={withAudio} />;
}
