import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyClubs, getActiveClubBook } from '@/lib/activeClub';
import { ComentariosScreen } from '@/screens/ComentariosScreen.jsx';

export const metadata = { title: 'Comentarios · Libris' };

export default async function Page({ params, searchParams }) {
  const { clubId } = await params;
  const { capitulo } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clubs = await getMyClubs(supabase, user.id);
  const club = clubs.find((c) => c.id === clubId);
  if (!club) notFound();

  const clubBook = await getActiveClubBook(supabase, clubId);
  if (!clubBook) redirect(`/club/${clubId}`);

  const [{ data: comments }, { data: chapters }, { data: volumes }, { data: me }] = await Promise.all([
    supabase
      .from('comments')
      .select('id, kind, title, body, is_spoiler, created_at, profile_id, chapter_id, parent_comment_id, reply_to_id, shared_to_feed, voice_url, voice_transcript, voice_duration_seconds, quote_style, quote_image_url, profiles(display_name)')
      .eq('club_book_id', clubBook.id)
      .order('created_at', { ascending: false }),
    supabase.from('chapters').select('id, number, title, label, volume_id').eq('club_book_id', clubBook.id).order('number'),
    supabase.from('volumes').select('id, name, position').eq('club_book_id', clubBook.id).order('position'),
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
  ]);

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

  // Los likes se traen aparte y se mezclan acá — más simple que sumarlos
  // adentro de esta consulta directa a "comments" (a diferencia de Inicio y
  // Perfil, que ya los traen listos desde recent_activity/profile_activity).
  const commentIds = (comments ?? []).map((c) => c.id);
  const { data: likeRows } = commentIds.length > 0
    ? await supabase.from('comment_likes').select('comment_id, profile_id').in('comment_id', commentIds)
    : { data: [] };
  const likesByComment = new Map();
  for (const row of likeRows ?? []) {
    const entry = likesByComment.get(row.comment_id) ?? { count: 0, likedByMe: false };
    entry.count += 1;
    if (row.profile_id === user.id) entry.likedByMe = true;
    likesByComment.set(row.comment_id, entry);
  }

  const withAudio = (comments ?? []).map((c) => ({
    ...c,
    audio_url: c.voice_url ? signedByPath.get(c.voice_url) ?? null : null,
    like_count: likesByComment.get(c.id)?.count ?? 0,
    liked_by_me: likesByComment.get(c.id)?.likedByMe ?? false,
  }));

  return (
    <ComentariosScreen
      clubBookId={clubBook.id}
      comments={withAudio}
      chapters={chapters ?? []}
      volumes={volumes ?? []}
      book={clubBook.books}
      clubName={club.name}
      myDisplayName={me?.display_name ?? null}
      myProfileId={user.id}
      initialChapterId={capitulo ?? null}
    />
  );
}
