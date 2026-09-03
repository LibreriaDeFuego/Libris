'use client';

import Link from 'next/link';

// Mismo par de repeating-linear-gradient que CLUB_TEXTURE en
// MisClubesScreen.jsx (la textura de lino de las tarjetas de club) — no se
// importa de ahí porque es un detalle interno de ese archivo, así que se
// repite acá; si algún día conviene, se puede sacar a un archivo común.
const TEXTURE = [
  'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 4px)',
  'repeating-linear-gradient(-45deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 4px)',
].join(', ');

// La puerta de entrada de la app: lo primero que ve alguien que abre el
// link de Libris sin sesión iniciada — antes caía directo al formulario de
// login, sin ninguna presentación. Empezó sobre el mismo fondo oscuro que
// usan las tarjetas de cita "Oscuro" (quoteCard.js); se pidió "más color" y
// se probaron 3 mockups (resplandor cálido sobre el fondo oscuro, este
// degradado a pleno color, y un aura de color detrás del logo) — se eligió
// el degradado.
//
// El degradado va de coral (--accent-500) a dorado (--gold-700), con la
// misma textura de lino que ya usan las tarjetas de club (CLUB_TEXTURE) —
// para que la puerta de entrada se sienta de la misma familia, no un fondo
// nuevo sin relación con el resto de la app. El botón "Empezar" no usa el
// <Button> del sistema de diseño: sobre este fondo, su variant="primary"
// (fondo coral) desaparece — necesita ser oscuro para tener contraste acá,
// y <Button> no deja pasar un color propio (su `style` interno pisa
// cualquier `style` que se le pase por props), así que es un botón simple
// con la misma métrica (radio, padding, tipografía) que el resto de la app.
//
// Un solo botón — no hace falta separar "Iniciar sesión" de "Crear cuenta"
// acá: LoginForm ya tiene las dos, con un link abajo para cambiar de una a
// la otra.
export function WelcomeScreen() {
  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden', minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', alignItems: 'center', textAlign: 'center', padding: '56px 28px 40px',
        background: 'linear-gradient(160deg, var(--accent-500) 0%, var(--accent-600) 32%, var(--gold-700) 68%, #7A5A06 100%)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, opacity: 0.55, mixBlendMode: 'overlay', pointerEvents: 'none', backgroundImage: TEXTURE }} />

      <div style={{ position: 'relative' }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático de /public, no una foto de contenido */}
        <img src="/logo-libris-cream.png" alt="Libris" style={{ height: 46, width: 'auto' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', color: 'var(--hero-cream)', lineHeight: 1.3, maxWidth: 280 }}>
          Tu club de lectura, en un solo lugar
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-sm)', color: 'rgba(255,248,236,0.85)', maxWidth: 280, lineHeight: 'var(--lh-normal)' }}>
          Sigue el progreso de todos, comparte citas y fotos, y coordina la próxima reunión — todo en un solo lugar.
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <Link
          href="/login"
          style={{
            fontFamily: 'var(--font-body)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-md)',
            borderRadius: 'var(--radius-pill)', padding: '14px 26px', textDecoration: 'none',
            background: 'var(--neutral-900)', color: 'var(--hero-cream)',
          }}
        >
          Empezar
        </Link>
      </div>
    </div>
  );
}
