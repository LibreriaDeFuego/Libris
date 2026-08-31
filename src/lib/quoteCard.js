// Genera la tarjeta de una cita destacada como imagen, lista para publicar
// en Instagram. Todo corre en el navegador con <canvas>, sin librerías
// externas — mismo enfoque que imageProcessing.js para las fotos de perfil.

const WIDTH = 1080;
// 3:4 (ancho/alto) — la misma proporción que ya usan las fotos de "lo que
// estás leyendo", para que toda imagen que se publica en el feed (cita o
// foto) quede del mismo tamaño. Antes cada estilo tenía la suya (Portada y
// Editorial 4:5, Oscuro cuadrado) — quedaban desparejas entre sí y con las
// fotos.
const HEIGHT = Math.round((WIDTH * 4) / 3);
const CREAM = '#FFF8EC';
const HERO_BG = '#16150F';
const INK = '#1B1B1F';

// Los tres estilos elegibles al publicar una cita. "aspect" es ancho/alto,
// usado tanto acá (para calcular el alto del lienzo) como en el selector de
// NewCommentForm (para dibujar las miniaturas con la misma proporción).
export const QUOTE_STYLES = [
  { id: 'cover', label: 'Portada' },
  { id: 'dark', label: 'Oscuro' },
  { id: 'editorial', label: 'Editorial' },
];

function loadRemoteImage(url) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar una imagen para la tarjeta.'));
    img.src = url;
  });
}

// Nos aseguramos de que las variantes exactas que vamos a dibujar ya estén
// cargadas — si no, canvas dibuja con la fuente de reemplazo del sistema sin
// avisar. Bricolage Grotesque no tiene un corte itálico real: el navegador
// aplica una inclinación sintética, igual que ya hace Blockquote.jsx en el
// resto de la app (no es una inconsistencia nueva).
async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all([
    document.fonts.load('italic 700 40px "Bricolage Grotesque"'),
    document.fonts.load('700 40px "Bricolage Grotesque"'),
    document.fonts.load('600 40px "Plus Jakarta Sans"'),
    document.fonts.load('500 40px "Plus Jakarta Sans"'),
  ]);
  await document.fonts.ready;
}

// Dibuja "img" cubriendo por completo el rectángulo (x, y, w, h), centrada
// y recortada — el mismo criterio "center/cover" que usa el resto de Libris.
function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Envuelve el texto para que entre en "maxWidth" — pero respeta los saltos
// de línea que la persona escribió a propósito (cada "\n" es un párrafo
// propio, envuelto por separado) en vez de aplastarlos junto con los demás
// espacios, que es lo que hacía un split(/\s+/) sobre el texto entero.
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const attempt = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(attempt).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = attempt;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

// El tamaño de letra más grande (dentro de un rango) que hace entrar la cita
// ya envuelta en el alto disponible — así una cita corta se ve grande y una
// larga se achica en vez de desbordar la tarjeta.
function fitQuote(ctx, text, { maxWidth, maxHeight, maxSize, minSize, lineHeight, weight, italic, family }) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${family}"`;
    const lines = wrapText(ctx, text, maxWidth);
    const lineHeightPx = Math.round(size * lineHeight);
    if (lines.length * lineHeightPx <= maxHeight || size === minSize) {
      return { lines, size, lineHeightPx };
    }
  }
  return { lines: [text], size: minSize, lineHeightPx: Math.round(minSize * lineHeight) };
}

// Con textBaseline = 'top', cada línea se ancla por su borde superior — así
// apilar bloques de texto es solo sumar alturas, sin corregir por línea base.
function drawLines(ctx, lines, x, y, lineHeightPx, { align = 'left', color, weight, italic, family, size }) {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${family}"`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeightPx));
}

async function drawLogo(ctx, src, x, y, height, opacity) {
  const img = await loadRemoteImage(src);
  const width = (img.width / img.height) * height;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, x, y, width, height);
  ctx.restore();
}

function metaLine({ book, clubName, personName }) {
  const parts = [];
  if (book?.author) parts.push(book.author);
  if (personName) parts.push(`leído por ${personName}`);
  if (clubName) parts.push(clubName);
  return parts.join(' · ');
}

// --- Estilo "cover": la portada de fondo, con degradado y texto crema.
async function renderCover(ctx, { quoteText, book, clubName, personName }) {
  const W = WIDTH;
  const H = HEIGHT;
  ctx.fillStyle = HERO_BG;
  ctx.fillRect(0, 0, W, H);
  if (book?.cover_url) {
    try {
      const img = await loadRemoteImage(book.cover_url);
      drawCover(ctx, img, 0, 0, W, H);
    } catch {
      // sin portada disponible: se queda el fondo oscuro de respaldo.
    }
  }

  // Degradado base — da atmósfera, pero por sí solo no alcanza para que el
  // texto se lea sobre una portada con ilustración clara o su propio título
  // impreso en el medio (es real: cualquier portada de club puede caer ahí).
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, 'rgba(15,12,8,0.55)');
  gradient.addColorStop(0.46, 'rgba(15,12,8,0.22)');
  gradient.addColorStop(1, 'rgba(15,12,8,0.6)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  const pad = 103;
  const maxWidth = W - pad * 2;
  const quote = fitQuote(ctx, `“${quoteText}”`, {
    maxWidth, maxHeight: H * 0.46, maxSize: 62, minSize: 34, lineHeight: 1.35,
    weight: 700, italic: true, family: 'Bricolage Grotesque',
  });

  // Igual que la tarjeta del club en Mis clubes: si la portada ya trae el título impreso
  // (cover_has_title), no lo repetimos acá — evita que el título dibujado
  // choque visualmente con el que ya está en la propia imagen.
  const showTitle = Boolean(book?.title) && !book?.cover_has_title;
  const dividerH = 34;
  const titleH = showTitle ? 56 : 0;
  const meta = metaLine({ book, clubName, personName });
  const metaH = meta ? 42 : 0;
  const blockH = quote.lines.length * quote.lineHeightPx + dividerH + titleH + metaH;

  let y = (H - blockH) / 2;

  // Respaldo oscuro dedicado detrás del bloque de texto — a diferencia del
  // degradado de arriba, garantiza contraste sin importar qué haya dibujado
  // en esa zona la portada original.
  const scrimTop = Math.max(0, y - 90);
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, H);
  scrim.addColorStop(0, 'rgba(12,10,6,0)');
  scrim.addColorStop(0.35, 'rgba(12,10,6,0.55)');
  scrim.addColorStop(1, 'rgba(12,10,6,0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimTop, W, H - scrimTop);
  drawLines(ctx, quote.lines, pad, y, quote.lineHeightPx, {
    color: CREAM, weight: 700, italic: true, family: 'Bricolage Grotesque', size: quote.size,
  });
  y += quote.lines.length * quote.lineHeightPx + dividerH * 0.55;

  ctx.strokeStyle = 'rgba(255,248,236,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(pad + 92, y);
  ctx.stroke();
  y += dividerH * 0.7;

  if (showTitle) {
    drawLines(ctx, [book.title], pad, y, 0, { color: CREAM, weight: 700, family: 'Bricolage Grotesque', size: 39 });
    y += titleH;
  }
  if (meta) {
    drawLines(ctx, [meta], pad, y, 0, { color: 'rgba(255,248,236,0.72)', weight: 500, family: 'Plus Jakarta Sans', size: 30 });
  }

  await drawLogo(ctx, '/logo-libris-cream.png', pad - 4, H - 90, 54, 0.85).catch(() => {});
}

// --- Estilo "dark": fondo oscuro sólido, cita + libro apilados al centro.
async function renderDark(ctx, { quoteText, book, clubName, personName }) {
  const W = WIDTH;
  const H = HEIGHT;
  ctx.fillStyle = HERO_BG;
  ctx.fillRect(0, 0, W, H);

  const pad = 113;
  const maxWidth = W - pad * 2;
  const quote = fitQuote(ctx, `“${quoteText}”`, {
    maxWidth, maxHeight: H * 0.5, maxSize: 67, minSize: 36, lineHeight: 1.34,
    weight: 700, italic: true, family: 'Bricolage Grotesque',
  });

  const gap = 62;
  const rowH = book?.cover_url ? 116 : 0;
  const blockH = quote.lines.length * quote.lineHeightPx + (rowH ? gap + rowH : 0);
  let y = (H - blockH) / 2;

  drawLines(ctx, quote.lines, pad, y, quote.lineHeightPx, {
    color: CREAM, weight: 700, italic: true, family: 'Bricolage Grotesque', size: quote.size,
  });
  y += quote.lines.length * quote.lineHeightPx + gap;

  if (book?.cover_url) {
    try {
      const img = await loadRemoteImage(book.cover_url);
      const cw = 87, ch = 116;
      ctx.save();
      const r = 10;
      ctx.beginPath();
      ctx.moveTo(pad + r, y);
      ctx.arcTo(pad + cw, y, pad + cw, y + ch, r);
      ctx.arcTo(pad + cw, y + ch, pad, y + ch, r);
      ctx.arcTo(pad, y + ch, pad, y, r);
      ctx.arcTo(pad, y, pad + cw, y, r);
      ctx.closePath();
      ctx.clip();
      drawCover(ctx, img, pad, y, cw, ch);
      ctx.restore();
    } catch {
      // sigue sin la miniatura de portada.
    }
    const textX = pad + 87 + 31;
    if (book?.title) drawLines(ctx, [book.title], textX, y + 6, 0, { color: CREAM, weight: 700, family: 'Bricolage Grotesque', size: 36 });
    const meta = metaLine({ book, clubName, personName });
    if (meta) drawLines(ctx, [meta], textX, y + 50, 0, { color: 'rgba(255,248,236,0.6)', weight: 500, family: 'Plus Jakarta Sans', size: 28 });
  }

  await drawLogo(ctx, '/logo-libris-cream.png', pad - 4, H - 90, 54, 0.7).catch(() => {});
}

// --- Estilo "editorial": look de revista, todo centrado sobre fondo crema.
async function renderEditorial(ctx, { quoteText, book, clubName, personName }) {
  const W = WIDTH;
  const H = HEIGHT;
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  const pad = 118;
  const maxWidth = W - pad * 2;
  const quote = fitQuote(ctx, `“${quoteText}”`, {
    maxWidth, maxHeight: H * 0.4, maxSize: 59, minSize: 32, lineHeight: 1.4,
    weight: 700, italic: false, family: 'Bricolage Grotesque',
  });

  const coverH = book?.cover_url ? 157 : 0;
  const gapAfterCover = coverH ? 57 : 0;
  const gapAfterQuote = 52;
  const line1 = book?.title ? `${book.title}${book.author ? ` — ${book.author}` : ''}`.toUpperCase() : '';
  const line2Parts = [];
  if (personName) line2Parts.push(`Leído por ${personName}`);
  if (clubName) line2Parts.push(clubName);
  const line2 = line2Parts.join(' · ').toUpperCase();
  const line1H = line1 ? 40 : 0;
  const line2H = line2 ? 34 : 0;

  const blockH = coverH + gapAfterCover + quote.lines.length * quote.lineHeightPx + (line1 || line2 ? gapAfterQuote : 0) + line1H + line2H;
  let y = (H - blockH) / 2;

  if (book?.cover_url) {
    try {
      const img = await loadRemoteImage(book.cover_url);
      const cw = 118;
      const cx = (W - cw) / 2;
      ctx.save();
      const r = 12;
      ctx.beginPath();
      ctx.moveTo(cx + r, y);
      ctx.arcTo(cx + cw, y, cx + cw, y + coverH, r);
      ctx.arcTo(cx + cw, y + coverH, cx, y + coverH, r);
      ctx.arcTo(cx, y + coverH, cx, y, r);
      ctx.arcTo(cx, y, cx + cw, y, r);
      ctx.closePath();
      ctx.clip();
      drawCover(ctx, img, cx, y, cw, coverH);
      ctx.restore();
    } catch {
      // sigue sin la miniatura de portada.
    }
    y += coverH + gapAfterCover;
  }

  drawLines(ctx, quote.lines, W / 2, y, quote.lineHeightPx, {
    align: 'center', color: INK, weight: 700, family: 'Bricolage Grotesque', size: quote.size,
  });
  y += quote.lines.length * quote.lineHeightPx + (line1 || line2 ? gapAfterQuote : 0);

  const prevLetterSpacing = ctx.letterSpacing;
  if (line1) {
    ctx.letterSpacing = '2px';
    drawLines(ctx, [line1], W / 2, y, 0, { align: 'center', color: '#8B8B85', weight: 700, family: 'Plus Jakarta Sans', size: 24 });
    y += line1H;
  }
  if (line2) {
    ctx.letterSpacing = '1.2px';
    drawLines(ctx, [line2], W / 2, y, 0, { align: 'center', color: '#B5B2A7', weight: 500, family: 'Plus Jakarta Sans', size: 24 });
  }
  ctx.letterSpacing = prevLetterSpacing ?? '0px';

  await drawLogo(ctx, '/logo-libris.png', pad - 4, H - 86, 48, 0.4).catch(() => {});
}

const RENDERERS = { cover: renderCover, dark: renderDark, editorial: renderEditorial };

// Dibuja la tarjeta y devuelve un Blob JPEG listo para descargar.
// { style, quoteText, book: {title, author, cover_url}, clubName, personName }
export async function renderQuoteCard({ style, quoteText, book, clubName, personName }) {
  const render = RENDERERS[style];
  if (!render) throw new Error('Estilo de cita desconocido.');
  await ensureFonts();

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  await render(ctx, { quoteText, book, clubName, personName });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.'))),
      'image/jpeg',
      0.92
    );
  });
}
