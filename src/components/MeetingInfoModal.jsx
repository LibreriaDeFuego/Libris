'use client';

import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';
import { formatMeetingDate, googleMapsUrl } from '@/lib/meetingFormat';

// Paso previo antes de mandar directo a Maps o al link — se tocaba el
// ícono de la tarjeta y ya se abría Maps sin más contexto; ahora primero
// muestra el horario y, para un lugar físico, la dirección aparte (tocar
// la dirección es lo que abre Maps, no el toque del ícono).
export function MeetingInfoModal({ club, onClose }) {
  const isPlace = club.meeting_mode === 'lugar';

  return (
    <Modal title="Próxima reunión" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="calendar" size={17} color="var(--accent-600)" />
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatMeetingDate(club.meeting_at)}
          </div>
        </div>

        {isPlace ? (
          <button
            type="button"
            onClick={() => window.open(googleMapsUrl(club.meeting_place), '_blank', 'noopener,noreferrer')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%',
              padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
              background: 'var(--surface-card)', cursor: 'pointer',
            }}
          >
            <div style={{ flexShrink: 0, display: 'flex' }}><Icon name="map-pin" size={17} color="var(--accent-600)" /></div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-xs)', color: 'var(--text-primary)', lineHeight: 'var(--lh-snug)' }}>
              {club.meeting_place}
            </div>
            <div style={{ flexShrink: 0, display: 'flex' }}><Icon name="external-link" size={14} color="var(--text-tertiary)" /></div>
          </button>
        ) : (
          <a
            href={club.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', width: '100%',
              padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
              background: 'var(--surface-card)', boxSizing: 'border-box',
            }}
          >
            <div style={{ flexShrink: 0, display: 'flex' }}><Icon name="video" size={17} color="var(--accent-600)" /></div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-xs)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {club.meeting_link}
            </div>
            <div style={{ flexShrink: 0, display: 'flex' }}><Icon name="external-link" size={14} color="var(--text-tertiary)" /></div>
          </a>
        )}
      </div>
    </Modal>
  );
}
