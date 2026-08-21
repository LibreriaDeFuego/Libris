# Handoff: Héroe de portada (A2) + encuadre de portada

## Overview

Rediseño de la pantalla de detalle de club (`src/screens/ClubScreen.jsx`) en Libris, más una herramienta de encuadre de portada para administradores de club.

Dos piezas:

1. **Héroe A2 "portada a sangre"** — la portada del libro ocupa la pantalla completa; el título, el progreso y las acciones se apoyan abajo sobre un scrim. Reemplaza el layout actual, donde la portada mide 46×66 px y todo es una caja de 1 px al mismo peso.
2. **Editor de encuadre** — el admin arrastra y hace zoom sobre la portada subida para decidir qué parte se ve en el héroe, con vista previa en vivo. Resuelve el caso de portadas cuadradas o con márgenes que en un héroe a sangre se recortan mal.

El problema de fondo que resuelve el conjunto: casi todas las portadas ya traen el título impreso, y la app lo escribía encima otra vez.

## About the Design Files

Los archivos de este paquete son **referencias de diseño hechas en HTML** — prototipos que muestran la apariencia y el comportamiento buscados, no código de producción para copiar tal cual. La tarea es **recrear estos diseños en el entorno del codebase**: Next.js 16 (App Router) + React 19, con los tokens y componentes que ya viven en `src/design-system/`.

El JS del prototipo (`cover-framer.js`) sí contiene la matemática del encuadre, que vale portar casi literal — ver "Matemática del encuadre".

## Fidelity

**Alta fidelidad.** Colores, tipografía, espaciado e interacciones son finales. Recrear la UI con precisión usando los tokens existentes de `src/design-system/tokens/`.

Salvedad: las tres portadas de muestra son imágenes que subió el usuario para probar. No son assets del proyecto.

---

## Pantalla 1 — Héroe A2 (detalle de club)

**Archivo de referencia:** `A-Portada-comparacion.html` (fila superior, tres portadas) y `A-Portada-v2.html` (variante con portada chica sobre fondo difuminado).

**Propósito:** el lector ve su libro, cuánto avanzó, y entra a actualizar progreso o a comentar.

### Layout

Contenedor de 390×844 (móvil), `overflow: hidden`, apilado en capas con `position: absolute`:

| z-index | Capa | Detalle |
|---|---|---|
| 1 | `.cover` | La portada, `inset: 0`, `overflow: hidden`. La imagen se posiciona por transform (ver encuadre). |
| 2 | `.topfade` | `height: 150px`, `backdrop-filter: blur(12px)`, máscara `linear-gradient(180deg,#000 0%,#000 42%,transparent 100%)`. Vela solo la banda del chip. |
| 3 | `.topdim` | `height: 170px`, `linear-gradient(180deg, rgba(22,21,15,.5) 0%, rgba(22,21,15,.22) 60%, transparent)`. |
| 3 | `.scrim` | `inset: 0`, `linear-gradient(180deg, rgba(22,21,15,0) 0%, rgba(22,21,15,0) 34%, rgba(22,21,15,.9) 62%, #16150F 78%)`. Es lo que hace legible el texto de abajo. |
| 4 | `.topbar` | Chip del club + botones de ícono. `padding: 50px 18px 0`. |
| 5 | `.stack` | Bloque de contenido. `bottom: 80px` (reserva la tab bar), `padding: 0 22px 22px`. |
| 6 | `.tabbar` | `height: 80px`. |

**Relleno de fondo** (obligatorio, detrás de `.cover`): cuando la portada no cubre el marco hay que evitar el negro plano.
- `.bgfallback` — `linear-gradient(155deg, #B8321A, #7A1D0E 55%, #3A0E06)`
- `.bgclip > .bg` — copia de la misma portada, `inset: -40px`, `filter: blur(26px) saturate(1.25)`, `opacity: .9`, `object-fit: cover`

### Componentes de `.stack`, en orden

1. **Grab handle** — 38×4, `radius: 2px`, `rgba(255,248,236,.32)`, `margin: 0 auto 18px`. Señal de que la hoja sube.
2. **Kicker** — "Leyendo ahora". 10.5px, `letter-spacing: .13em`, uppercase, `weight: 800`, `#FFC93F`.
3. **h1 título** — Bricolage Grotesque, 36–40px, `line-height: 1.02`, `letter-spacing: -.025em`, `weight: 800`, `#FFF8EC`, `margin-top: 9px`.
   **Se oculta cuando la portada ya trae el título** (ver "Título duplicado").
4. **Autor + unidad** — 13.5px, `rgba(255,248,236,.62)`, `margin-top: 7px`. Dos campos separados: autor y conteo ("Maggie O'Farrell" · "24 capítulos").
5. **Fila de progreso** — `display: flex`, `justify-content: space-between`, `align-items: flex-end`, `margin-top: 18px`.
   - `.pct` — Bricolage Grotesque, 38px, `weight: 800`, `letter-spacing: -.03em`, `line-height: .9`, `#FFF8EC`.
   - `.progmeta` — 12.5px, `rgba(255,248,236,.58)`. Formato: "Cap. 16 · pág. 268 de 416".
6. **Pips** — un pip por capítulo. `display: flex`, `gap: 4px`, `margin-top: 13px`. Cada pip: `flex: 1`, `height: 4px`, `radius: 2px`.
   - pendiente `rgba(255,248,236,.16)` · leído `#FF6B4A` · actual `#FF6B4A` con `opacity: .5`
   - Con más de ~40 capítulos los pips se vuelven ilegibles: caer a una barra continua.
7. **Acciones** — `display: flex`, `gap: 10px`, `margin-top: 20px`.
   - Primario: `flex: 1`, `height: 52px`, `radius: 16px`, `#FF4F32`, texto `#FFF8EC` 15px/700, `box-shadow: 0 10px 26px rgba(255,79,50,.36)`, ícono `book-open` 17px. Copy: "Actualizar progreso".
   - Secundario: `flex: 0 0 52px`, mismo alto y radio, `rgba(255,248,236,.10)`, borde `1px rgba(255,248,236,.18)`, ícono `message-circle` 19px. Va a Comentarios.

### Chrome superior

- **Chip del club** — `rgba(255,248,236,.14)`, `backdrop-filter: blur(14px)`, borde `1px rgba(255,248,236,.2)`, `radius: 999px`, `padding: 7px 13px 7px 10px`, 12.5px/600, `#FFF8EC`, `white-space: nowrap`. Lleva punto de actividad de 6px `#1BAA6B` con `box-shadow: 0 0 0 3px rgba(27,170,107,.28)` y chevron de 13px.
- **Botones de ícono** — 36×36, circulares, `rgba(255,248,236,.12)`, `blur(14px)`, borde `1px rgba(255,248,236,.18)`, ícono 16px.

### Tab bar

`height: 80px`, `rgba(255,248,236,.9)`, `backdrop-filter: blur(20px)`, borde superior `1px #E4E3DE`, `padding-top: 11px`.
Tres pestañas, según `src/components/AppShell.jsx`: **Club** (`book-open`), **Novedades** (`bell`), **Recursos** (`compass`). Comentarios NO es pestaña — es ruta dentro del club.
Ítem: `flex: 1`, columna, `gap: 5px`, label 11px/700. Inactivo `#8B8B85`, activo `#FF4F32`.

### Título duplicado

Regla de producto, no de estilo: **si la portada ya muestra el título, la app no lo escribe.**

Cuando el libro tiene `coverHasTitle: true`:
- El `h1` del héroe se oculta.
- El autor sube a Bricolage Grotesque 19px/700, `letter-spacing: -.01em`, `#FFF8EC`.
- El conteo de capítulos se queda en 13.5px `rgba(255,248,236,.62)`.
- El kicker crece a 12px, `letter-spacing: .1em`.

El flag lo pone el admin con un switch al subir la portada. Default sugerido: activado, porque la mayoría de las tapas traen el título.

Nota de implementación: probé detectar el texto de la tapa automáticamente analizando la imagen (energía de alta frecuencia por franjas). No funciona de forma confiable — las tapas ilustradas o fotográficas de mucho grano dan falsos positivos y negativos en las dos direcciones. **No intentar detección automática.** El switch explícito es la solución.

---

## Pantalla 2 — Editor de encuadre (panel de admin)

**Archivo de referencia:** `A2-Encuadre.html` + `cover-framer.js`.

**Propósito:** el admin decide qué parte de la portada se ve en el héroe, viendo el resultado en vivo.

### Layout

Dos columnas, `display: flex`, `flex-wrap: wrap`, `gap: 34px`, `padding: 32px`, fondo `#2E2D29`.
- Panel: `flex: 1 1 400px`, `min-width: 340px`, `max-width: 520px`, `#FFF8EC`, `radius: 22px`, `padding: 26px`.
- Vista previa: `flex: none`, el teléfono de 390×844 con el héroe A2 real.

Importante: no escalar la vista previa con `transform` para evitar el wrap — `transform` no reduce el ancho de layout. El ancho flexible del panel es lo que hace entrar las dos columnas.

### Componentes del panel

1. **Eyebrow** — "Panel del club · portada". 10.5px, `.13em`, uppercase, 800, `#B5B2A7`.
2. **h1** — "Encuadrá la portada". Bricolage Grotesque 25px/800, `letter-spacing: -.02em`, `#1B1B1F`.
3. **Sub** — 13px `#5A5952`, `line-height: 1.5`. Explica las dos zonas.
4. **Escenario** — `height: 420px`, `#E7E4DA`, `radius: 14px`, `cursor: grab` (→ `grabbing` al arrastrar), `touch-action: none`.
   - `.canv > img` — la portada, `transform-origin: 0 0`, posicionada por `translate(tx,ty) scale(s)`.
   - `.mask` — `rgba(22,21,15,.6)` sobre todo menos el recorte, con `mask-composite: exclude` y dos capas de máscara (la segunda dimensionada y posicionada como el recorte).
   - `.crop` — el recuadro, `box-shadow: 0 0 0 1.5px #FFF8EC`, con guías de tercios al 42% de opacidad.
   - **Dos overlays que son el corazón del editor:**
     - `.risk` — **franja expuesta**, de 12% a 54% del alto del recorte. Bordes `1px dashed rgba(255,201,63,.85)`, fondo `rgba(255,201,63,.1)`, label "Franja expuesta" en `#FFC93F`. Es lo que el lector ve sin obstrucción.
     - `.safe` — **zona ocluida**, 46% inferior. `linear-gradient(180deg, transparent, rgba(22,21,15,.42))`, borde superior `1px dashed rgba(255,248,236,.45)`, label "Lo tapa el chrome". Ahí caen el título, el progreso y los botones, así que no importa qué haya en la imagen.
5. **Slider de zoom** — 4px de riel `#DAD6CA`, pulgar de 22px `#FF4F32` con borde `3px #FFF8EC` y `box-shadow: 0 2px 8px rgba(255,79,50,.4)`. El `min` se calcula desde la escala real de "Ajustar entera", no es una constante — si no, la etiqueta y el pulgar se desincronizan.
6. **Presets** (clase propia, ver "Trampas"): Llenar (default), Ajustar entera, Alinear arriba, Centrar tercio superior.
   Chip: borde `1px #DAD6CA`, `radius: 999px`, `padding: 8px 14px`, 12.5px/700 `#5A5952`. Activo: `#1B1B1F` con texto `#FFF8EC`.
7. **Switch "La tapa ya muestra el título"** — controla el flag de arriba. Contenedor con borde `1.5px #DAD6CA`, `radius: 12px`, `padding: 14px`. Encendido: borde `#1BAA6B`, fondo `#EAF7EE`. Switch 40×23, pulgar de 17px, transición `.16s`.
8. **Footer** — "Guardar encuadre" (`#FF4F32`, `height: 48px`, `radius: 14px`) y "Restablecer" (borde `1.5px #DAD6CA`).

### Interacciones

- **Arrastre** — pointer events con `setPointerCapture`. Suelta el preset activo.
- **Rueda** — zoom hacia el cursor: convertir el punto del cursor a coordenadas de imagen, escalar, recolocar.
- **Slider** — zoom hacia el centro del recorte.
- **Clamp** — mientras la imagen cubra el recorte, no se puede arrastrar dejando huecos. Si es más chica que el recorte (caso "Ajustar entera"), se centra en ese eje.

---

## Matemática del encuadre

Es la parte que conviene portar tal cual desde `cover-framer.js`.

**Estado:** `s` (escala), `tx`/`ty` (traslación), todo en px del escenario. `base` = la escala que hace que la imagen cubra el recorte:

```js
base = Math.max(box.w / nat.w, box.h / nat.h);
```

El porcentaje que ve el usuario es `s / base * 100`, así que "Llenar" es 100%.

**Mapeo del recorte a la vista previa** — el mismo transform, escalado por la razón entre el ancho del teléfono y el del recorte:

```js
const k = 390 / box.w;
himg.style.width = nat.w + 'px';
himg.style.transform = `translate(${(tx-box.x)*k}px, ${(ty-box.y)*k}px) scale(${s*k})`;
```

**Persistencia** — guardar el encuadre como cuatro números normalizados (0–1) respecto de la imagen original, no como transform en px:

```js
{ x: (box.x - tx)/s / nat.w,
  y: (box.y - ty)/s / nat.h,
  w: (box.w/s) / nat.w,
  h: (box.h/s) / nat.h }
```

Así el mismo dato sirve para el héroe, para miniaturas y para cualquier tamaño futuro, sin recortar el archivo original. Sugerencia de columna: `cover_crop jsonb` en la tabla de libros, más `cover_has_title boolean`.

**Presets:**

```js
fill: s = base,        centrado en los dos ejes
fit:  s = Math.min(box.w/nat.w, box.h/nat.h), centrado
top:  s = base,        ty = box.y (pegado arriba)
face: s = base*1.45,   ty = box.y - nat.h*s*0.06 (sube el tercio superior)
```

---

## Trampas que ya costaron caro

Cinco cosas que rompieron el prototipo y conviene no repetir:

1. **`transform: scale` no evita un wrap de flex** — no reduce el ancho de layout. Para que dos columnas entren, hay que reducir el ancho real.
2. **Clases compartidas por estilo se barren juntas** — los chips de portada y los presets compartían clase, así que deseleccionar presets deseleccionaba la portada. Clase de comportamiento separada de la clase visual.
3. **`img.onload` es asíncrono** — si aplica un preset por un camino distinto al de los clicks, el resaltado queda desincronizado y un click hecho durante la carga se pierde. Un solo camino para aplicar preset.
4. **Los datos del héroe tienen que salir de una sola función** — con el progreso hardcodeado en el markup, cambiar de libro dejaba "7 partes" arriba y "Cap. 16 de 416" abajo.
5. **Zona ocluida ≠ zona riesgosa** — son dos regiones distintas. Lo que cae bajo el chrome es inofensivo; lo que queda entre 12% y 54% es lo que compite con el título.

---

## Design tokens

Todos existen en `src/design-system/tokens/`. Los valores acá son para verificación.

**Colores**

| Uso | Hex |
|---|---|
| Coral primario (progreso del usuario) | `#FF4F32` |
| Coral claro (pips, acentos sobre oscuro) | `#FF6B4A` |
| Coral hover / links | `#E63E22` |
| Coral profundo | `#B8321A` |
| Oro (citas, kicker, destacados) | `#FFC93F` |
| Oro texto sobre claro | `#A57C05` |
| Verde (actividad del club) | `#1BAA6B` |
| Verde texto | `#0F7A4B` |
| Verde superficie | `#EAF7EE` |
| Crema base | `#FFF8EC` |
| Tinta / fondo del héroe | `#16150F` |
| Tinta de texto | `#1B1B1F` |
| Texto secundario | `#5A5952` |
| Texto terciario | `#8B8B85` |
| Borde | `#E4E3DE` |
| Borde en panel | `#DAD6CA` |

Alfas sobre oscuro: texto `.62`, meta `.58`, vidrio `.12`–`.14`, borde de vidrio `.18`–`.20`.

**Tipografía** — Bricolage Grotesque (display: 500/700/800) y Plus Jakarta Sans (UI: 400/500/600/700). Son sustitutos de Google Fonts; si Libris tiene fuentes propias, reemplazar.

Escala: display 36–40 · título de sección 25 · subtítulo 19 · cuerpo 13.5–15 · meta 12.5 · micro 10.5–11.

**Radios** — 999 pill · 28 hoja · 22 panel · 16 botón grande · 14 botón chico · 12 tarjeta chica · 4 portada.

**Sombras** — botón primario `0 10px 26px rgba(255,79,50,.36)` · portada `0 22px 44px rgba(0,0,0,.55)` · teléfono `0 30px 70px rgba(0,0,0,.5)`.

**Íconos** — Lucide, `stroke-width: 1.75`, igual que `components/core/Icon.jsx`. Los usados: `book-open`, `message-circle`, `bell`, `compass`, `settings`, `user-plus`, `chevron-down`, `users`, `check`, `minimize-2`, `maximize-2`, `arrow-up-to-line`, `scan-face`.

## Assets

Las tres portadas (`cover-retrato.jpg`, `cover-el-ano.jpg`, `cover-tan-poca-vida.png`) son imágenes de prueba que subió el usuario, **no assets del proyecto**. Sirven para verificar tres casos:
- `cover-retrato.jpg` — cuadrada, con márgenes blancos y faja de título. El caso difícil.
- `cover-el-ano.jpg` — ilustrada, con título integrado.
- `cover-tan-poca-vida.png` — foto en blanco y negro, título en mayúsculas arriba.

## Files

| Archivo | Qué contiene |
|---|---|
| `A2-Encuadre.html` + `cover-framer.js` | Editor de encuadre funcional con vista previa en vivo. La referencia principal. |
| `A-Portada-comparacion.html` | El héroe A2 con tres portadas distintas, más la variante A3 (anillo de progreso). Útil para ver cómo responde el diseño a distintas imágenes. |
| `A-Portada-v2.html` | Variante con portada chica sobre fondo difuminado, en vez de a sangre. |
| `A-Portada-variantes.html` | Cuatro ideas sobre la dirección: a sangre, anillo, estantería, y el fallback tipográfico para libros sin portada. |
| `image-slot.js` | Utilidad del prototipo para soltar imágenes. No portar. |

## Pendiente de decidir

- **Libros sin portada** — hay un fallback tipográfico esbozado en `A-Portada-variantes.html` (variante A5), sin desarrollar.
- **Encuadre por formato** — hoy un solo encuadre sirve para héroe y miniatura. Si la miniatura cuadrada queda mal recortada, hará falta un segundo encuadre.
- **Las otras 10 pantallas** — este lenguaje solo se aplicó al detalle de club.
