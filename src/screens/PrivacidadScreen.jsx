'use client';

import { useRouter } from 'next/navigation';
import { IconButton } from '@/design-system/components/core/IconButton.jsx';
import { Icon } from '@/design-system/components/core/Icon.jsx';

// "Volver" con router.back() (igual que el resto de la app) puede dejar sin
// salida a quien llega directo a esta URL desde afuera (la ficha de Play
// Store/App Store, un buscador) — no hay una pantalla anterior a la que
// volver. Por eso, a diferencia del resto de las pantallas, el botón cae a
// "/" si no hay historial propio (window.history.length <= 1 es la señal:
// recién se abrió esta pestaña acá).
function handleBack(router) {
  if (typeof window !== 'undefined' && window.history.length > 1) router.back();
  else router.push('/');
}

function Section({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)', color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-snug)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

// Política de privacidad — pública, sin sesión, pensada para dos públicos a
// la vez: quien la lee desde la app, y la revisión de Play Store/App Store
// (que la piden como link de ficha, sin instalar nada). Describe lo que
// Libris junta DE VERDAD, relevado directo del código en vez de copiar una
// plantilla genérica — a la fecha de escribir esto: sin anuncios, sin
// venta de datos, sin ningún rastreo/analítica de terceros (no hay ningún
// script de ese tipo en toda la app), Google solo como opción de login.
// Contacto y organización son los que se definieron para el lanzamiento —
// se pueden actualizar en este mismo archivo si cambian más adelante.
export function PrivacidadScreen() {
  const router = useRouter();

  return (
    <div style={{ padding: '20px 18px 40px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconButton aria-label="Volver" onClick={() => handleBack(router)}><Icon name="arrow-left" size={18} /></IconButton>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Privacidad
        </div>
      </div>

      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
        Última actualización: septiembre de 2026 · Libris, operado por RELEA
      </div>

      <Section title="Qué es esto">
        <p>
          Esta página explica qué datos junta Libris, para qué se usan y qué puedes hacer con los tuyos. Está escrita
          en lenguaje simple, sin vueltas legales — si tienes dudas puntuales, escríbenos a{' '}
          <a href="mailto:somosrelea@gmail.com" style={{ color: 'var(--text-link)', fontWeight: 700 }}>somosrelea@gmail.com</a>.
        </p>
      </Section>

      <Section title="Qué datos juntamos">
        <p><strong>Al crear tu cuenta:</strong> correo electrónico, nombre de usuario, nombre para mostrar y contraseña (si entras con Google, esa parte la maneja Google — nosotros solo recibimos tu nombre, correo y foto de perfil, con tu permiso).</p>
        <p><strong>Tu perfil:</strong> foto de perfil y biografía, si cargas alguna.</p>
        <p><strong>Tu actividad en los clubes:</strong> a qué clubes perteneces, tu progreso de lectura (en qué capítulo o página vas), y los comentarios, citas, reseñas, fotos y notas de voz (audio + su transcripción, si la escribes) que publiques.</p>
        <p><strong>Interacciones:</strong> tus “me gusta”, a quién sigues, qué compartes o reposteas, y tus respuestas a preguntas o encuestas de capítulo.</p>
        <p>No juntamos ubicación, contactos del teléfono, ni ningún dato con fines de publicidad — Libris no tiene anuncios ni los va a tener.</p>
      </Section>

      <Section title="Para qué los usamos">
        <p>Únicamente para que la app funcione: mostrar tu progreso y el de tu club, guardar y mostrar lo que publicas, autenticarte, y para que los demás miembros de tus clubes vean lo que compartes ahí (eso es lo esperable de un club de lectura — lo que publicas en un club lo ven sus miembros).</p>
        <p>No usamos tus datos para entrenar modelos de IA, no los vendemos ni los compartimos con terceros para publicidad, y no hay ningún rastreo de analítica de terceros en la app.</p>
      </Section>

      <Section title="Dónde se guardan">
        <p>Toda la información vive en <strong>Supabase</strong> (base de datos, autenticación y almacenamiento de archivos), nuestro proveedor de infraestructura — actúa como encargado del tratamiento, no como dueño de tus datos. La app en sí se sirve desde <strong>Vercel</strong>. Ninguno de los dos usa tus datos para nada propio.</p>
      </Section>

      <Section title="Con quién lo compartimos">
        <p>Con nadie más que los proveedores de infraestructura de arriba (imprescindibles para que la app funcione) y, si eliges entrar con Google, con Google para ese login puntual. Lo que publicas DENTRO de un club lo ven los demás miembros de ese club — es el propósito de la app. Tu progreso de lectura y tus publicaciones compartidas al feed también pueden verse en tu perfil público, según lo que decidas compartir.</p>
      </Section>

      <Section title="Cuánto tiempo lo guardamos">
        <p>Mientras tu cuenta exista. Si borras un comentario, una foto o una nota de voz desde la propia app, se elimina de verdad (incluido el archivo, no solo la referencia).</p>
      </Section>

      <Section title="Tus derechos">
        <p>
          Puedes editar tu perfil, y editar o borrar la mayoría de lo que publicas, directo desde la app. Para pedir
          una copia de tus datos, corregir algo que no puedas cambiar tú mismo, o borrar tu cuenta por completo,
          escríbenos a{' '}
          <a href="mailto:somosrelea@gmail.com" style={{ color: 'var(--text-link)', fontWeight: 700 }}>somosrelea@gmail.com</a> — todavía no
          hay un botón de “Eliminar cuenta” dentro de la app, así que por ahora este correo es el camino.
        </p>
      </Section>

      <Section title="Cambios a esta página">
        <p>Si algo de esto cambia (por ejemplo, si sumamos un nuevo proveedor), vamos a actualizar esta misma página con una nueva fecha arriba de todo.</p>
      </Section>
    </div>
  );
}
