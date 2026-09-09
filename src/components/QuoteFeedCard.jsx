import { cardColorTokens } from '@/lib/quoteFeedCard';

// Portada chica adentro de una cita — mismo respaldo de siempre en Libris
// para un libro sin portada subida (color sólido + el título encima),
// solo que en miniatura: acá la portada es apenas una referencia, no el
// contenido principal.
function MiniCover({ book, width, height, radius = 4 }) {
  if (book?.cover_url) {
    return (
      <div
        style={{
          width, height, borderRadius: radius, flexShrink: 0,
          background: `center/cover no-repeat url(${book.cover_url})`,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width, height, borderRadius: radius, flexShrink: 0, background: 'var(--accent-500)',
        position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.55) 100%)' }} />
      {book?.title && (
        <span style={{ position: 'relative', fontFamily: 'var(--font-display)', fontSize: Math.max(7, width * 0.24), lineHeight: 1.1, color: '#fff', padding: 3 }}>
          {book.title}
        </span>
      )}
    </div>
  );
}

function BookMeta({ book, color, align = 'left' }) {
  if (!book?.title && !book?.author) return null;
  return (
    <div style={{ textAlign: align }}>
      {book?.title && (
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', color }}>
          {book.title}
        </div>
      )}
      {book?.author && <div style={{ fontSize: 9.5, color, marginTop: 1 }}>{book.author}</div>}
    </div>
  );
}

// Estilo "Comilla" — una comilla grande de la propia tipografía de
// títulos, como marca de agua en la esquina; la portada queda como dato
// (miniatura + texto), no como imagen de fondo.
function Comilla({ quoteText, book, tokens }) {
  return (
    <div style={{ background: tokens.bg, border: tokens.border, borderRadius: 'var(--radius-lg)', padding: '20px 18px 16px', position: 'relative' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 0.5, color: 'var(--gold-500)', position: 'absolute', top: 14, left: 14 }}>“</div>
      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.4, color: tokens.ink, margin: '20px 0 14px 6px', whiteSpace: 'pre-wrap' }}>
        {quoteText}
      </div>
      <div style={{ width: 28, height: 2, background: 'var(--gold-500)', marginBottom: 10 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MiniCover book={book} width={26} height={36} radius={3} />
        <BookMeta book={book} color={tokens.inkSoft} />
      </div>
    </div>
  );
}

// Estilo "Franja" — una franja de color al borde, como una cita destacada
// de revista; la portada queda chica, de referencia, no de fondo.
function Franja({ quoteText, book, tokens }) {
  return (
    <div style={{ display: 'flex', gap: 12, background: tokens.bg, border: tokens.border, borderRadius: 'var(--radius-md)', padding: '14px 14px 14px 12px', position: 'relative', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, background: 'var(--accent-500)', borderRadius: 2 }} />
      <div style={{ marginLeft: 6 }}>
        <MiniCover book={book} width={40} height={56} radius={4} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.38, color: tokens.ink, whiteSpace: 'pre-wrap' }}>
          {quoteText}
        </div>
        {(book?.title || book?.author) && (
          <div style={{ fontSize: 9.5, color: tokens.inkSoft, marginTop: 6, fontWeight: 700, letterSpacing: '.02em' }}>
            {[book?.title, book?.author].filter(Boolean).join(' · ').toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

// Estilo "Centrado" — todo centrado, con una regla dorada separando la
// cita del libro; antes era "fondo oscuro fijo" en el mockup, pero al
// separar el color en su propio eje pasó a ser solo este layout (el
// color por default, para este estilo, sigue siendo "noche" —
// DEFAULT_CARD_COLOR_BY_STYLE en quoteFeedCard.js).
function Centrado({ quoteText, book, tokens }) {
  return (
    <div style={{ background: tokens.bg, border: tokens.border, borderRadius: 'var(--radius-lg)', padding: '22px 18px 18px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.42, color: tokens.ink, whiteSpace: 'pre-wrap' }}>
        {quoteText}
      </div>
      <div style={{ width: 26, height: 2, background: 'var(--gold-500)', margin: '12px auto' }} />
      {(book?.title || book?.author) && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <MiniCover book={book} width={24} height={33} radius={3} />
          <BookMeta book={book} color={tokens.dark ? 'var(--gold-300)' : tokens.inkSoft} />
        </div>
      )}
    </div>
  );
}

// Estilo "Papel" — fondo cálido, con una cinta decorativa arriba (como un
// recorte pegado). La cita va directo sobre el mismo fondo que el resto
// de la tarjeta — antes tenía, encima, un realce tenue en un dorado FIJO
// (intentando algo tipo "resaltador"), que quedaba como un segundo
// cuadrado de color propio en cuanto se elegía cualquier otro fondo. Se
// sacó: al elegir un color, la tarjeta entera es de ese único color.
function Papel({ quoteText, book, tokens }) {
  return (
    <div style={{ background: tokens.bg, border: tokens.border, borderRadius: 'var(--radius-md)', padding: '18px 16px', boxShadow: 'inset 0 0 0 1px rgba(27,27,31,.05)', position: 'relative' }}>
      <div style={{ width: 34, height: 14, background: 'var(--gold-300)', opacity: 0.85, margin: '-24px 0 10px 10px', transform: 'rotate(-3deg)', borderRadius: 2 }} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, lineHeight: 1.55, color: tokens.ink, whiteSpace: 'pre-wrap' }}>
        {quoteText}
      </div>
      {(book?.title || book?.author) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <MiniCover book={book} width={32} height={44} radius={2} />
          <BookMeta book={book} color={tokens.inkSoft} />
        </div>
      )}
    </div>
  );
}

const LAYOUTS = { comilla: Comilla, franja: Franja, centrado: Centrado, papel: Papel };

// La estética propia de una cita destacada (migración 050) — reemplaza,
// para una cita SIN imagen guardada (ni de club ni de perfil), el
// tratamiento genérico de siempre (portada de fondo + texto en cursiva,
// igual que una foto). `style` es el layout (comilla/franja/centrado/
// papel) y `color` el fondo (blanco/crema/coral/dorado/noche), elegidos
// al publicar — ver CardStylePicker.jsx.
export function QuoteFeedCard({ style, color, quoteText, book }) {
  const Layout = LAYOUTS[style] ?? Comilla;
  const tokens = cardColorTokens(color);
  return <Layout quoteText={quoteText} book={book} tokens={tokens} />;
}
