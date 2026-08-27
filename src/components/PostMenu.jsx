'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/design-system/components/core/Icon.jsx';

// Los 3 puntos junto al nombre de quien publicó — solo tiene sentido
// mostrarlo en la propia publicación (lo decide quien usa el componente).
// Editar/Eliminar son opcionales por separado, así se puede ofrecer solo
// uno de los dos según el contexto.
export function PostMenu({ onEdit, editLabel = 'Editar', onDelete, deleteLabel = 'Eliminar' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 10px',
    border: 'none', background: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
    fontFamily: 'var(--font-body)', fontSize: 'var(--fs-sm)', fontWeight: 600,
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Más opciones"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ width: 30, height: 30, borderRadius: 'var(--radius-round)', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <Icon name="more-horizontal" size={18} color="var(--text-tertiary)" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', top: 36, right: 0, width: 186, background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', padding: 6, zIndex: 5 }}
        >
          {onEdit && (
            <button type="button" style={{ ...rowStyle, color: 'var(--text-primary)' }} onClick={() => { setOpen(false); onEdit(); }}>
              <Icon name="pencil" size={16} color="var(--text-primary)" />
              {editLabel}
            </button>
          )}
          {onDelete && (
            <button type="button" style={{ ...rowStyle, color: 'var(--danger)' }} onClick={() => { setOpen(false); onDelete(); }}>
              <Icon name="trash-2" size={16} color="var(--danger)" />
              {deleteLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
