'use client';

import { Icon } from '@/design-system/components/core/Icon.jsx';

// Opción de visibilidad con su explicación, para que no haya que adivinar qué
// hace: cada tarjeta dice exactamente qué ven los demás. Se usa tanto al
// crear un club (Onboarding) como al cambiarla después (Preferencias).
export function VisibilityOption({ value, current, onChange, icon, title, description }) {
  const selected = current === value;
  return (
    <label
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer',
        background: selected ? 'var(--accent-50)' : 'var(--surface-card)',
        border: `1px solid ${selected ? 'var(--accent-500)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-md)', padding: 12,
      }}
    >
      <input
        type="radio"
        name="visibility"
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        style={{ marginTop: 3 }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
          <Icon name={icon} size={14} />
          {title}
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 3, lineHeight: 'var(--lh-snug)' }}>
          {description}
        </div>
      </div>
    </label>
  );
}

// Las tres tarjetas, listas para insertar en un formulario. `current`/`onChange`
// vienen de un useState del padre; el input radio manda "visibility" en el
// FormData al enviar el form.
export function VisibilityPicker({ current, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <VisibilityOption
        value="publico"
        current={current}
        onChange={onChange}
        icon="eye"
        title="Público"
        description="Los otros clubes ven el nombre del club y cuántos miembros tiene. Cualquiera se puede unir directo, sin pedir permiso. Los comentarios y el progreso siguen siendo privados."
      />
      <VisibilityOption
        value="solicitud"
        current={current}
        onChange={onChange}
        icon="user-check"
        title="Con solicitud"
        description="Aparece en Descubrir con su nombre, como uno público, pero para sumarse hay que mandar una solicitud que un administrador aprueba o rechaza. Los comentarios y el progreso siguen siendo privados."
      />
      <VisibilityOption
        value="privado"
        current={current}
        onChange={onChange}
        icon="eye-off"
        title="Privado"
        description="Los otros clubes ven “Un club también está leyendo este libro”, sin el nombre. No aparece en Descubrir — solo se entra con el link de invitación."
      />
    </div>
  );
}
