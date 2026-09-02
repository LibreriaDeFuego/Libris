'use client';

import { useEffect, useRef, useState } from 'react';
import { searchPlaces } from '@/app/actions/places';

const DEBOUNCE_MS = 400;

// Input de texto normal (viaja en el FormData con `name`, como cualquier
// otro campo) con una lista de sugerencias de direcciones debajo, que se
// actualiza sola mientras se escribe — vía Nominatim (OpenStreetMap), sin
// API key. Elegir una sugerencia solo completa el texto del campo, no
// guarda coordenadas: sigue siendo la misma dirección en texto libre que ya
// usa googleMapsUrl() para armar el link a Maps.
export function PlaceAutocompleteInput({ name, defaultValue = '', placeholder }) {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  // El efecto solo agenda el pedido (debounce) — el estado "sin resultados
  // todavía" o "buscando" se decide en el handler del input (más abajo),
  // que corre como reacción directa a que la persona escribió algo, no
  // dentro del efecto.
  useEffect(() => {
    const query = value.trim();
    if (query.length < 3 || query === defaultValue.trim()) return;
    const thisRequest = ++requestId.current;
    const timer = setTimeout(async () => {
      const results = await searchPlaces(query);
      // Si mientras esperaba la respuesta la persona ya siguió escribiendo,
      // esta respuesta quedó vieja — no pisa las sugerencias más nuevas.
      if (requestId.current === thisRequest) {
        setSuggestions(results);
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(e) {
    const next = e.target.value;
    setValue(next);
    const query = next.trim();
    if (query.length < 3 || query === defaultValue.trim()) {
      setSuggestions([]);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  function pick(label) {
    setValue(label);
    setSuggestions([]);
    setOpen(false);
  }

  const showDropdown = open && (loading || suggestions.length > 0);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={(e) => { setOpen(true); e.currentTarget.style.borderColor = 'var(--accent-500)'; }}
        onBlur={(e) => { setOpen(false); e.currentTarget.style.borderColor = 'var(--border-default)'; }}
        autoComplete="off"
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
          background: 'var(--surface-card)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 'var(--fs-base)',
          outline: 'none',
        }}
      />

      {showDropdown && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10,
            background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: '10px 14px', fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Buscando…</div>
          ) : (
            <>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  // Evita que el input pierda foco (y la lista se cierre) antes de que se registre el click.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s.label)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none',
                    cursor: 'pointer', fontSize: 'var(--fs-xs)', color: 'var(--text-primary)', lineHeight: 'var(--lh-snug)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-card-alt)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  {s.label}
                </button>
              ))}
              <div style={{ padding: '6px 14px', fontSize: 'var(--fs-2xs)', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-subtle)' }}>
                Datos de © OpenStreetMap
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
