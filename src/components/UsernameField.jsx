'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isValidUsername, normalizeUsername, USERNAME_HELP } from '@/lib/username';
import { Input } from '@/design-system/components/forms/Input.jsx';

// Campo de nombre de usuario con chequeo de disponibilidad en vivo
// (is_username_available) — se usa igual en el registro, en "Elige tu
// usuario" y en "Editar perfil". Con "currentUsername" (edición de un
// perfil que ya tiene uno) no dispara la consulta si no cambió el valor —
// si no, el propio usuario aparecería como "ya está en uso".
export function UsernameField({ value, onChange, currentUsername = null, autoFocus = false, onStatusChange }) {
  const normalized = normalizeUsername(value);
  const unchanged = Boolean(currentUsername) && normalized === currentUsername;
  const needsCheck = isValidUsername(normalized) && !unchanged;

  // Solo guarda el resultado de la última consulta que terminó — nunca se
  // toca directamente en el cuerpo del efecto, solo dentro del callback
  // async, así que no dispara el aviso de "setState síncrono en un efecto".
  const [checked, setChecked] = useState(null); // { value, available } | null

  useEffect(() => {
    if (!needsCheck) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      const supabase = createClient();
      supabase
        .rpc('is_username_available', { check_username: normalized })
        .then(({ data }) => {
          if (!cancelled) setChecked({ value: normalized, available: data !== false });
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [needsCheck, normalized]);

  const status = useMemo(() => {
    if (!isValidUsername(normalized)) return null;
    if (unchanged) return 'unchanged';
    if (checked?.value === normalized) return checked.available ? 'available' : 'taken';
    return 'checking';
  }, [normalized, unchanged, checked]);

  useEffect(() => {
    onStatusChange?.(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onStatusChange es un callback del padre, no un dato que deba re-disparar esto.
  }, [status]);

  const helpColor = status === 'taken'
    ? 'var(--danger)'
    : status === 'available' || status === 'unchanged'
      ? 'var(--success)'
      : 'var(--text-tertiary)';

  const helpText = status === 'checking' ? 'Verificando…'
    : status === 'available' ? 'Disponible'
    : status === 'unchanged' ? 'Tu nombre de usuario actual'
    : status === 'taken' ? 'Ese nombre de usuario ya está en uso'
    : USERNAME_HELP;

  return (
    <div>
      <Input
        name="username"
        placeholder="tu_usuario"
        value={value}
        onChange={(e) => onChange(normalizeUsername(e.target.value))}
        required
        autoFocus={autoFocus}
      />
      <div style={{ fontSize: 'var(--fs-2xs)', color: helpColor, marginTop: 4 }}>{helpText}</div>
    </div>
  );
}
