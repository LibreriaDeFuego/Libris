'use client';

import { useRouter } from 'next/navigation';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Blockquote } from '@/design-system/components/content/Blockquote.jsx';
import { VoiceNotePlayer } from '@/design-system/components/content/VoiceNotePlayer.jsx';
import { SpoilerBlock } from '@/design-system/components/content/SpoilerBlock.jsx';

// TODO: reemplazar por los comentarios reales del capítulo/club.
const COMMENTS = [
  { name: 'Julián Pérez', meta: 'Cap. 13 · hace 1 h', type: 'text', body: 'La parte del faro me dejó pensando toda la noche. No esperaba que Elena tomara esa decisión.' },
  { name: 'Martina Solís', meta: 'Cap. 14 · hace 2 h', type: 'quote', body: 'Un libro que se lee de un tirón.' },
  { name: 'Cande Ibarra', meta: 'Cap. 14 · hace 4 h', type: 'voice', duration: '0:38', transcript: 'Che, este capítulo me voló la cabeza, sobre todo el final con Elena en el muelle.' },
  { name: 'Nico Duarte', meta: 'Cap. 16 · hace 5 h', type: 'spoiler', body: 'Al final del capítulo 16, el faro se derrumba y Elena decide quedarse en el pueblo.' },
];

export function ComentariosScreen() {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => router.back()}><Icon name="arrow-left" size={18} /></IconButton>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>Comentarios</div>
      </div>

      {COMMENTS.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 10 }}>
          <Avatar name={c.name} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {c.name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {c.meta}</span>
            </div>
            {c.type === 'text' && (
              <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text-primary)', lineHeight: 'var(--lh-normal)', margin: '4px 0 0' }}>{c.body}</p>
            )}
            {c.type === 'quote' && (
              <div style={{ marginTop: 6 }}><Blockquote>{c.body}</Blockquote></div>
            )}
            {c.type === 'voice' && (
              <div style={{ marginTop: 6 }}><VoiceNotePlayer duration={c.duration} transcript={c.transcript} /></div>
            )}
            {c.type === 'spoiler' && (
              <div style={{ marginTop: 6 }}><SpoilerBlock><p style={{ margin: 0 }}>{c.body}</p></SpoilerBlock></div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
