'use client';

import { useRouter } from 'next/navigation';
import { Modal } from '@/design-system/components/feedback/Modal.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';

// Una opción tocable dentro de la hoja: ícono, título y una línea corta que
// explica qué hace — mismo patrón que el resto de las hojas de acción.
function SheetOption({ icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: 14,
        borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)',
        background: 'var(--surface-card)', cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--accent-50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <Icon name={icon} size={18} color="var(--accent-600)" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', marginTop: 1 }}>{subtitle}</div>
      </div>
    </button>
  );
}

// Hoja "Sumar un club" — las dos puertas de entrada (crear / unirme con un
// link) llevan al mismo Onboarding, cada una a la pestaña que corresponde.
export function AddClubSheet({ onClose }) {
  const router = useRouter();

  return (
    <Modal title="Sumar un club" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SheetOption
          icon="plus"
          title="Crear un club nuevo"
          subtitle="Elige un libro e invita a quien quieras"
          onClick={() => router.push('/club/nuevo')}
        />
        <SheetOption
          icon="link"
          title="Unirme con un link"
          subtitle="Si alguien ya te invitó a su club"
          onClick={() => router.push('/club/nuevo?modo=unirme')}
        />
      </div>
    </Modal>
  );
}
