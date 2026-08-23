'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { joinClubFromInvite, requestToJoin } from '@/app/actions/clubs';
import { Button } from '@/design-system/components/core/Button.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Textarea } from '@/design-system/components/forms/Textarea.jsx';

// Chip "Abierto" / "Con solicitud" junto al nombre del club.
function JoinModeChip({ joinMode }) {
  const isOpen = joinMode === 'open';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', fontSize: 'var(--fs-2xs)', fontWeight: 700,
        color: isOpen ? 'var(--success-700)' : 'var(--gold-700)',
        background: isOpen ? 'var(--success-bg)' : 'var(--gold-100)',
        borderRadius: 999, padding: '2px 8px',
      }}
    >
      {isOpen ? 'Abierto' : 'Con solicitud'}
    </span>
  );
}

function OpenJoinButton({ clubId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleJoin() {
    const formData = new FormData();
    formData.set('clubId', clubId);
    startTransition(async () => {
      const result = await joinClubFromInvite(null, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={handleJoin} disabled={pending} type="button">
        {pending ? 'Uniéndote…' : 'Unirme'}
      </Button>
      {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

// Club "con solicitud": botón "Postularme" que despliega un mensaje
// opcional, o el estado ya resuelto (solicitud enviada).
function RequestJoinButton({ clubId, initialStatus }) {
  const [status, setStatus] = useState(initialStatus); // null | 'pending'
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  if (status === 'pending') {
    return (
      <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        Solicitud enviada
      </span>
    );
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(true)}>
        Postularme
      </Button>
    );
  }

  function send() {
    const formData = new FormData();
    formData.set('clubId', clubId);
    formData.set('message', message);
    setError(null);
    startTransition(async () => {
      const result = await requestToJoin(formData);
      if (result?.error) setError(result.error);
      else {
        setStatus('pending');
        setOpen(false);
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 8 }}>
      <Textarea
        placeholder="Cuéntale al club por qué quieres sumarte (opcional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)} disabled={pending}>
          Cancelar
        </Button>
        <Button variant="primary" size="sm" type="button" onClick={send} disabled={pending}>
          {pending ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-2xs)' }}>{error}</div>}
    </div>
  );
}

export function OtrosClubesScreen({ clubs }) {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 18px 24px' }}>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático de /public, no una foto de contenido */}
        <img src="/logo-libris.png" alt="Libris" style={{ height: 26, width: 'auto', display: 'block', marginBottom: 14 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconButton aria-label="Volver" onClick={() => router.push('/')}><Icon name="arrow-left" size={18} /></IconButton>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Descubrir clubes
          </div>
        </div>
      </div>
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: -12 }}>
        Clubes abiertos, y clubes privados que reciben solicitudes para sumarte. El resto no aparece acá.
      </div>

      {clubs.length === 0 ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '24px 0', textAlign: 'center' }}>
          Todavía no hay clubes para unirse.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clubs.map((club) => {
            const isOpen = club.join_mode === 'open';
            return (
              <div
                key={club.id}
                style={{
                  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
                  background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)', padding: 12, boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Avatar name={club.name} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{club.name}</div>
                    <JoinModeChip joinMode={club.join_mode} />
                  </div>
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)' }}>
                    {club.member_count} {Number(club.member_count) === 1 ? 'miembro' : 'miembros'}
                    {club.book_title ? ` · leyendo ${club.book_title}` : ''}
                  </div>
                </div>
                {isOpen ? (
                  <OpenJoinButton clubId={club.id} />
                ) : (
                  <RequestJoinButton
                    clubId={club.id}
                    initialStatus={club.my_request_status === 'pending' ? 'pending' : null}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
