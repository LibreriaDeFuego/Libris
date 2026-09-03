'use client';

import Link from 'next/link';
import { Button } from '@/design-system/components/core/Button.jsx';

// La puerta de entrada de la app: lo primero que ve alguien que abre el
// link de Libris sin sesión iniciada — antes caía directo al formulario de
// login, sin ninguna presentación. Mismo fondo oscuro que ya usan las
// tarjetas de cita "Oscuro" (quoteCard.js) y el ícono/splash de la PWA, así
// que no es un tono nuevo en la identidad de la app.
//
// Un solo botón ("Empezar") — no hace falta separar "Iniciar sesión" de
// "Crear cuenta" acá: LoginForm ya tiene las dos, con un link abajo para
// cambiar de una a la otra.
export function WelcomeScreen() {
  return (
    <div
      style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        alignItems: 'center', background: 'var(--hero-bg)', padding: '56px 28px 40px', textAlign: 'center',
      }}
    >
      <div />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático de /public, no una foto de contenido */}
        <img src="/logo-libris-cream.png" alt="Libris" style={{ height: 46, width: 'auto' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', color: 'var(--hero-cream)', lineHeight: 1.3, maxWidth: 280 }}>
          Tu club de lectura, en un solo lugar
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-sm)', color: 'rgba(255,248,236,0.72)', maxWidth: 280, lineHeight: 'var(--lh-normal)' }}>
          Sigue el progreso de todos, comparte citas y fotos, y coordina la próxima reunión — todo en un solo lugar.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <Button variant="primary" size="lg">Empezar</Button>
        </Link>
      </div>
    </div>
  );
}
