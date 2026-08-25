'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Chip } from '@/design-system/components/core/Chip.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Blockquote } from '@/design-system/components/content/Blockquote.jsx';
import { SpoilerBlock } from '@/design-system/components/content/SpoilerBlock.jsx';
import { VoiceNotePlayer } from '@/design-system/components/content/VoiceNotePlayer.jsx';
import { NewCommentForm } from '@/components/NewCommentForm';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { DownloadQuoteImageButton } from '@/components/DownloadQuoteImageButton';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { orderChapters, chapterDisplayLabel } from '@/lib/orderChapters';

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function CommentBody({ comment, book, clubName }) {
  if (comment.kind === 'voice') {
    return (
      <VoiceNotePlayer
        src={comment.audio_url ?? undefined}
        duration={formatDuration(comment.voice_duration_seconds)}
        transcript={comment.voice_transcript ?? undefined}
      />
    );
  }
  if (comment.kind === 'quote') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Blockquote>{comment.body}</Blockquote>
        {comment.quote_style && (
          <DownloadQuoteImageButton
            style={comment.quote_style}
            quoteText={comment.body}
            book={book}
            clubName={clubName}
            personName={comment.profiles?.display_name}
            imageUrl={comment.quote_image_url}
          />
        )}
      </div>
    );
  }
  return (
    <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)', lineHeight: 'var(--lh-normal)', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
      {comment.body}
    </p>
  );
}

export function ComentariosScreen({ clubBookId, comments, chapters, volumes, book, clubName, myDisplayName }) {
  const router = useRouter();
  const orderedChapters = useMemo(() => orderChapters(chapters ?? [], volumes ?? []), [chapters, volumes]);
  const [chapterId, setChapterId] = useState(null); // null = comentarios generales del libro

  const visibleComments = comments.filter((c) => (c.chapter_id ?? null) === chapterId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => router.back()}><Icon name="arrow-left" size={18} /></IconButton>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>Comentarios</div>
      </div>

      {orderedChapters.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', overflowX: 'auto' }}>
          <Chip selected={chapterId === null} onClick={() => setChapterId(null)}>General del libro</Chip>
          {orderedChapters.map((c) => (
            <Chip key={c.id} selected={chapterId === c.id} onClick={() => setChapterId(c.id)}>{chapterDisplayLabel(c)}</Chip>
          ))}
        </div>
      )}

      <NewCommentForm clubBookId={clubBookId} chapterId={chapterId} book={book} clubName={clubName} personName={myDisplayName} />
      <VoiceRecorder clubBookId={clubBookId} chapterId={chapterId} />

      {visibleComments.map((comment) => {
        const name = comment.profiles?.display_name ?? 'Alguien';
        return (
          <div key={comment.id} style={{ display: 'flex', gap: 10 }}>
            <Avatar name={name} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                {name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {formatRelativeTime(comment.created_at)}</span>
              </div>
              <div style={{ marginTop: comment.kind === 'text' ? 0 : 6 }}>
                {comment.is_spoiler ? (
                  <SpoilerBlock><CommentBody comment={comment} book={book} clubName={clubName} /></SpoilerBlock>
                ) : (
                  <CommentBody comment={comment} book={book} clubName={clubName} />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {visibleComments.length === 0 && (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '20px 0', textAlign: 'center' }}>
          {chapterId === null ? 'Sé el primero en comentar el libro.' : 'Sé el primero en comentar este capítulo.'}
        </div>
      )}
    </div>
  );
}
