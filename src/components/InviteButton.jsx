'use client';

import { useState } from 'react';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';

export function InviteButton({ clubId }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = `${window.location.origin}/unirse/${clubId}`;

    // En el celular abre el menú nativo de compartir (WhatsApp, etc.); si el
    // usuario lo cancela no hacemos nada más.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Libris', text: 'Sumate a mi club de lectura', url });
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copiá este link y compartilo:', url);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <IconButton aria-label="Invitar gente al club" onClick={handleClick}>
        <Icon name="user-plus" size={18} />
      </IconButton>
      {copied && (
        <div
          role="status"
          style={{
            position: 'absolute', top: '110%', right: 0, whiteSpace: 'nowrap',
            background: 'var(--neutral-900)', color: 'var(--text-on-accent)',
            fontSize: 'var(--fs-2xs)', fontWeight: 600, padding: '6px 10px',
            borderRadius: 'var(--radius-md)', zIndex: 5,
          }}
        >
          ¡Link copiado!
        </div>
      )}
    </div>
  );
}
