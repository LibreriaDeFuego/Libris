'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Avatar } from '@/design-system/components/core/Avatar.jsx';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { markNotificationsSeen } from '@/app/actions/profile';

// La campana de notificaciones de Inicio — arriba a la derecha, como en
// Instagram, pero con un libro en vez de un corazón (acá no hay "me
// gusta" como ícono de marca, y un libro habla más de Libris). El punto
// rojo se apaga al abrir la lista, no notificación por notificación —
// mismo criterio que ya usa Instagram con el suyo.
export function NotificationsButton({ notifications, hasUnread }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(hasUnread);
  const [, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
    if (unread) {
      setUnread(false);
      startTransition(() => markNotificationsSeen());
    }
  }

  return (
    <>
      <div style={{ position: 'relative' }}>
        <IconButton aria-label="Notificaciones" size={36} onClick={handleOpen}>
          <Icon name="book-open" size={16} />
        </IconButton>
        {unread && (
          <span
            aria-hidden
            style={{
              position: 'absolute', top: -1, right: -1, width: 11, height: 11, borderRadius: '50%',
              background: 'var(--accent-500)', border: '2px solid var(--surface-page)',
            }}
          />
        )}
      </div>

      {open && (
        <Modal title="Notificaciones" onClose={() => setOpen(false)}>
          {notifications.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', padding: '12px 0' }}>
              Todavía no tenés notificaciones.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 'var(--radius-md)',
                    textDecoration: 'none', background: n.isNew ? 'var(--accent-50)' : 'transparent',
                  }}
                >
                  <Avatar name={n.actorName} src={n.actorAvatarUrl} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', lineHeight: 1.35 }}>{n.text}</div>
                    {n.preview && (
                      <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        “{n.preview}”
                      </div>
                    )}
                    <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{n.relativeTime}</div>
                  </div>
                  {n.isNew && <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-500)', flexShrink: 0 }} />}
                </Link>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
