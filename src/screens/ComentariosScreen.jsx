'use client';

import { useRouter } from 'next/navigation';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Blockquote } from '@/design-system/components/content/Blockquote.jsx';
import { SpoilerBlock } from '@/design-system/components/content/SpoilerBlock.jsx';
import { NewCommentForm } from '@/components/NewCommentForm';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

export function ComentariosScreen({ clubBookId, comments }) {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => router.back()}><Icon name="arrow-left" size={18} /></IconButton>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>Comentarios</div>
      </div>

      <NewCommentForm clubBookId={clubBookId} />

      {comments.map((c) => {
        const name = c.profiles?.display_name ?? 'Alguien';
        const meta = formatRelativeTime(c.created_at);
        return (
          <div key={c.id} style={{ display: 'flex', gap: 10 }}>
            <Avatar name={name} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                {name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {meta}</span>
              </div>
              {c.is_spoiler ? (
                <div style={{ marginTop: 6 }}><SpoilerBlock><p style={{ margin: 0 }}>{c.body}</p></SpoilerBlock></div>
              ) : c.kind === 'quote' ? (
                <div style={{ marginTop: 6 }}><Blockquote>{c.body}</Blockquote></div>
              ) : (
                <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)', lineHeight: 'var(--lh-normal)', margin: '4px 0 0' }}>{c.body}</p>
              )}
            </div>
          </div>
        );
      })}

      {comments.length === 0 && (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '20px 0', textAlign: 'center' }}>
          Sé el primero en comentar.
        </div>
      )}
    </div>
  );
}
