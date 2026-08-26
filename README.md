# Libris

App social para clubes de lectura: progreso de lectura compartido, comentarios (texto, citas destacadas, notas de voz), spoilers colapsables y una sección editorial ("Recursos").

**En producción:** https://libris-relea.vercel.app — se despliega solo en cada push a `main` (proyecto `libris` en Vercel, equipo RELEA). Instalable como PWA desde Chrome en Android.

## Stack

- **Next.js (App Router) + React**, PWA instalable en Android desde el navegador (manifest + service worker mínimo) en lugar de una app nativa — evita costos/tiempos de publicación en App Store; se puede envolver la misma PWA con Bubblewrap para Play Store más adelante si hace falta.
- **Supabase** (Postgres + Auth + Realtime) como backend — ver `supabase/schema.sql` para el modelo de datos y la sección **Backend / Supabase** más abajo para configurarlo.
- Todas las pantallas leen y escriben datos reales en Supabase (Server Components + Server Actions, sin API routes intermedias). **Supabase Storage** guarda las portadas de libros (bucket público) y las notas de voz (bucket privado, servidas con URLs firmadas).

## Estructura

```
src/
  app/                    # rutas de Next.js (App Router)
    page.js               # / → "Mis clubes de lectura"
    login/                 page.js + actions.js (signIn/signUp/signOut, Server Actions)
    recursos/page.js       # Guías/Cursos (contenido editorial curado)
    descubrir/page.js      # directorio de clubes públicos para unirse (antes club/otros)
    club/[clubId]/page.js         # detalle de un club puntual
    club/[clubId]/comentarios/    # comentarios de ESE club, generales o por capítulo
    club/[clubId]/preferencias/   # nombre, visibilidad, libro, administradores y salir de ESE club
    club/[clubId]/capitulos/      # gestión de capítulos y volúmenes (solo administradores)
    club/[clubId]/portada/        # editor de encuadre de la portada (solo administradores)
    club/nuevo/            # crear o unirse a otro club (multi-club)
    unirse/[clubId]/       # pantalla de invitación (link para compartir)
    auth/callback/         # aterrizaje de los links que manda Supabase por mail
    actions/clubs.js       # Server Actions: createClub, joinClub, addChapter,
                           #   renameChapter, createVolume, renameVolume,
                           #   promoteAdmin, demoteAdmin, joinClubFromInvite,
                           #   selectClub, leaveClub, updateClubPreferences,
                           #   updateProgress, postComment
    actions/media.js       # Server Actions: uploadBookCover, updateCoverFrame, postVoiceComment
    manifest.js            # genera /manifest.webmanifest (PWA)
  components/
    AppShell.jsx           # shell con tab bar inferior (Recursos / Club / Descubrir / Perfil)
    AvatarUploader.jsx     # subir/cambiar la foto de perfil (mismo patrón que CoverUploader)
    LoginForm.jsx, SignOutButton.jsx, NewCommentForm.jsx, InviteButton.jsx,
    GoogleSignInButton.jsx, VoiceRecorder.jsx, CoverUploader.jsx,
    ClubSwitcher.jsx (menú para cambiar de club; tone="chip" para el héroe),
    CoverHero.jsx (héroe de portada a sangre — lo usan ClubScreen y la vista
      previa en vivo del editor de encuadre, una sola función para los dos),
    CoverImage.jsx (posiciona la portada según cover_crop, mide el tamaño natural)
    ServiceWorkerRegistration.jsx
  screens/                # pantallas de producto (usan el design system + props con datos reales)
  lib/
    supabase/               client.js, server.js, middleware.js (@supabase/ssr)
    activeClub.js (multi-club: clubes del usuario + club activo por cookie),
    orderChapters.js (orden y nombre de capítulos, agrupados por volumen),
    heroProgress.js (% / etiqueta / pips del héroe, a partir de capítulos o página),
    coverFrame.js (matemática del encuadre de portada — escala, clamp, presets,
      persistencia como 4 números normalizados; portada de cover-framer.js),
    friendlyError.js (traduce errores de Postgres/RLS a mensajes en español),
    profileData.js (las 4 consultas del Perfil — profile/stats/actividad/sigo,
      compartidas entre /perfil y /perfil/[profileId]),
    formatRelativeTime.js, safeNext.js, authProviders.js, requireUser.js
  design-system/           # sistema de diseño Libris (tokens + 18 componentes reutilizables)
    tokens/                 colors.css, typography.css, spacing.css, effects.css
    components/              core/ forms/ content/ navigation/ feedback/
  proxy.js                # refresca la sesión de Supabase en cada request (convención Next 16)
public/
  icons/                  # íconos PWA (placeholders, ver nota abajo)
  sw.js                   # service worker mínimo (cache del app shell)
design-reference/          # specimens del design system, opciones de dirección visual descartadas,
                            # y el UI kit clickeable original — documentación, no se importa en la app
.claude/skills/libris-design/  # el design system empaquetado como skill de Claude Code
supabase/
  schema.sql              # esquema Postgres: perfiles, clubes, membresías, libros,
                           # capítulos, progreso, comentarios — con Row Level Security
  migrations/            002_app_additions.sql (trigger de perfil + políticas de insert),
                           003_fix_club_creation.sql (el creador puede leer su club),
                           004_invitaciones.sql (datos del club para la pantalla de invitación),
                           005_descubrimiento_voz_editorial.sql (buckets de Storage,
                             funciones de descubrimiento y tabla editorial),
                           006_multiclub.sql (poder salir de un club),
                           007_descubrir_clubes.sql (directorio de clubes públicos),
                           008_recursos_sin_autores.sql (Descubrir → Recursos, se saca la categoría Autor),
                           009_administradores_y_volumenes.sql (administradores del club,
                             capítulos con nombre propio agrupados en volúmenes),
                           010_numeracion_por_volumen.sql (el número de capítulo es único
                             por volumen, no por todo el libro),
                           011_progreso_por_pagina.sql (progreso por capítulo o por página,
                             porque cada quien puede tener una edición distinta),
                           012_espanol_neutro.sql (mensajes de los triggers y contenido editorial
                             a español latinoamericano neutro, sin voseo),
                           013_encuadre_portada.sql (cover_crop + cover_has_title en books,
                             y books pasa a editarse solo por administradores),
                           014_postulaciones.sql (join_mode además de público/privado,
                             tabla club_join_requests, discover_public_clubs con clubes
                             "con solicitud"),
                           015_perfil_de_usuario.sql (bio + bucket de avatares, tabla
                             follows, funciones profile_activity y profile_stats),
                           016_fotos_de_lectura.sql (tabla posts + bucket post-photos,
                             profile_activity ahora también trae las fotos),
                           017_nombre_de_usuario.sql (username único en profiles,
                             función is_username_available, el trigger de alta
                             de cuenta lo guarda si vino en el registro),
                           018_usuario_admite_puntos.sql (el username también
                             permite puntos, sin empezar/terminar/repetirlos),
                           019_citas_para_instagram.sql (quote_style en comments,
                             profile_activity ahora también lo trae),
                           020_inicio_novedades.sql (función recent_activity:
                             citas y fotos de todos los usuarios, para Inicio),
                           021_imagen_de_cita_guardada.sql (bucket quote-cards,
                             comments.quote_image_url, profile_activity y
                             recent_activity ahora también la traen)
  verificar-setup.sql     # chequea que las migraciones estén aplicadas
```

## Desarrollo

```
npm install
npm run dev
```

## Backend / Supabase

1. Creá un proyecto gratis en [supabase.com](https://supabase.com).
2. En el **SQL Editor** del proyecto, pegá y ejecutá el contenido de `supabase/schema.sql` — crea las tablas y las políticas de Row Level Security (cada usuario solo ve/edita lo de sus propios clubes).
3. Copiá `.env.local.example` a `.env.local` y completá con los valores de **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Ambas son claves públicas (protegidas por RLS) — nunca commitear `.env.local` ni exponer la `service_role` key.
4. `src/lib/supabase/client.js` (Client Components), `server.js` (Server Components / Route Handlers) y `src/proxy.js` (refresco de sesión) ya están armados con [`@supabase/ssr`](https://supabase.com/docs/guides/auth/server-side/nextjs) — listos para usarse una vez cargadas las variables de entorno.

### Estado actual

Verificado funcionando de punta a punta contra Supabase real: registro/login, crear club con su primer libro, actualizar progreso (persiste), publicar comentarios (texto, cita, spoiler), y persistencia entre sesiones.

**Setup de la base:** correr en orden `supabase/schema.sql` y después cada archivo de `supabase/migrations/` por número. `supabase/verificar-setup.sql` chequea que estén todas aplicadas (todas las filas deben decir OK). Para probar sin esperar mails, desactivar **Confirm email** en Authentication → Sign In / Providers; antes de abrir al público conviene reactivarlo (la ruta `/auth/callback` ya está lista para recibir esos links).

### Login con Google

Ya configurado y funcionando en producción. `signInWithGoogle` en `src/app/login/actions.js` y el botón en `GoogleSignInButton.jsx`. **El botón solo se muestra si el proveedor está habilitado en Supabase** — `src/lib/authProviders.js` consulta `/auth/v1/settings` y no lo renderiza si Google está apagado, para que nunca quede un botón que falla al tocarlo.

Para activarlo en otro entorno: crear credenciales OAuth en Google Cloud Console (redirect URI = `https://<proyecto>.supabase.co/auth/v1/callback`), cargarlas en Supabase (Authentication → Sign In / Providers → Google), y poner el Site URL + Redirect URLs del proyecto apuntando al dominio de la app. No hace falta tocar código ni redesplegar.

**Pendiente de marca:** la pantalla de consentimiento de Google muestra el dominio de Supabase en vez de "Libris". Para que diga Libris hace falta un dominio propio + el add-on Custom Domain de Supabase (pago) + verificación de la app en Google.

### Estructura de navegación (Inicio / Recursos / Club / Perfil)

- **Inicio** (`/inicio`) — el feed general: citas y fotos de todos los usuarios de Libris, más recientes primero. Ver "Inicio: feed de novedades" más abajo.
- **Recursos** (`/recursos`) — contenido curado en dos secciones: **Guías** y **Cursos**. Se sacó la categoría "Autor" (migración 008).
- **Club** (`/`) — ya no es el detalle de un club: es **"Mis clubes de lectura"**, la lista completa de los clubes en los que participás (los hayas creado o no), cada uno con su actividad más reciente. Tocar uno lleva a `/club/[clubId]`, el detalle real (libro, progreso, comentarios).
- **Perfil** (`/perfil`) — el propio perfil, que se puede seguir. La pestaña muestra la foto real de la persona en vez de un ícono (viene de `layout.js`, que busca el perfil propio server-side y se lo pasa a `AppShell`).

**Descubrir** (`/descubrir`) ya no tiene pestaña propia — se llega desde el adelanto que tiene "Mis clubes de lectura" (la búsqueda y "Ver todo en Descubrir"). La ruta sigue igual, es el directorio de clubes públicos para unirse.

### Perfil de usuario (migración 015)

Cada perfil tiene foto (bucket `avatars`, igual de público que las portadas de libro), una bio corta, tres números (libros / seguidores / siguiendo) y un feed de "actividad": cada comentario que esa persona escribió (y, desde la migración 016, cada foto que compartió), con una imagen grande de fondo y el texto anclado abajo — se toca la tarjeta para desplegar el texto completo.

- **`/perfil`** es el propio (con "Editar perfil": nombre, bio, foto). **`/perfil/[profileId]`** es el de cualquier otra persona — se llega tocando un nombre en la lista de miembros de **Preferencias**. Las dos rutas comparten las mismas cuatro consultas (`src/lib/profileData.js`).
- **Seguir** es la tabla `follows` (quién sigue a quién), pública igual que en cualquier red social — no requiere aprobación, a diferencia de las postulaciones a clubes.
- **La actividad respeta la privacidad de los clubes**, ya armada en las migraciones 007/014: la función `profile_activity` (`security definer`) solo muestra lo que comentaste en un club abierto o "con solicitud" a cualquiera; lo de un club privado (`invite`) solo se lo muestra a quien ya es miembro de ese club — o a vos mismo, mirando tu propio perfil, sin excepción. Los comentarios marcados spoiler no aparecen nunca acá. `profile_stats` (libros/seguidores/siguiendo) sigue el mismo criterio para el conteo de libros.
- Las notas de voz aparecen en el feed como texto (la transcripción, si existe) — reproducir el audio real sigue restringido a los miembros del club por la política de Storage ya existente, así que no se intentó sortear eso acá.

### Fotos de lo que estás leyendo (migración 016)

Desde el propio perfil (botón "Foto", junto al nombre) se puede compartir una foto de lo que se está leyendo — de la galería o sacada en el momento con la cámara. Antes de subirla pasa por el mismo recorte estilo Instagram que la foto de perfil (`PhotoCropModal`, `src/components/PhotoCropModal.jsx`), acá en proporción vertical 3:4 en vez de cuadrada, con un texto corto opcional.

- Tabla `posts` (`profile_id`, `image_url`, `caption`), bucket `post-photos` — igual de público que el resto de las imágenes de la app, no está atada a ningún club.
- Se mezclan con los comentarios y notas de voz en el mismo feed de "Actividad", ordenadas todas por fecha: `profile_activity` ahora hace un `union all` entre `comments` y `posts`. Como una foto no depende de ningún club, es visible siempre que se puede ver el perfil (mismo criterio que "Seguir").
- Las tarjetas de "Actividad" pasaron de 380px a 440px de alto — bloques más dominantes, un paso hacia el diseño de scroll por bloques que se probó primero como mockup. Por ahora siguen en el flujo normal de la página (sin un scroll "atrapado" aparte); si hace falta el efecto de encastre tipo TikTok se puede sumar después con `scroll-snap`.

**Novedades se sacó de la app** (pestaña y ruta `/novedades` eliminadas) — mostraba el mismo feed editorial que ya está en Recursos, quedaba redundante. Su reemplazo llegó con la migración 020: la pestaña **Inicio** (ver abajo).

### Inicio: feed de novedades (migración 020)

Pestaña nueva, la primera de la barra de abajo (ícono de casa). Es un feed de actividad de **todos** los usuarios de Libris, no solo de tus clubes — mismas tarjetas grandes con foto de fondo que ya tenía "Actividad" en el Perfil, ahora con el nombre y la foto de quien publicó, arriba a la izquierda de cada una (toca y lleva a su perfil).

- **Por ahora, dos tipos de contenido**: citas destacadas y fotos de lo que alguien está leyendo. Se van a ir sumando otros con el tiempo (comentarios, notas de voz, empezar a leer un libro nuevo dentro de un club) — no crear un club, eso no es "una novedad de lectura".
- **`recent_activity`** (`security definer`) es la función nueva que arma el feed — mismo criterio de visibilidad de club que ya usaba `profile_activity`: las citas de un club abierto o "con solicitud" se ven siempre, las de uno privado (`invite`) solo si sos miembro. Las fotos son públicas siempre, como ya lo eran. A diferencia de `profile_activity` (la actividad de un perfil puntual), esta es general — no filtra por quién sigue a quién, es la misma lógica sin restricción por relación que ya se usa en el buscador de Descubrir.
- **`ActivityCard`** se movió del Perfil a `src/components/ActivityCard.jsx`, compartido entre las dos pantallas — con una prop `author` opcional que agrega esa fila de nombre y foto solo cuando hace falta (Inicio la usa, Perfil no, porque ahí ya se sabe de quién es la actividad).

### Nombre de usuario único (migración 017)

Además del nombre para mostrar, cada perfil tiene un `@usuario` propio y único (minúsculas, letras/números/guion bajo/punto, 3 a 20 caracteres, sin empezar/terminar/repetir el punto — regla compartida en `src/lib/username.js`) — sirve para distinguir a dos personas con el mismo nombre en el buscador y en el perfil.

- **Cuentas nuevas** lo piden en el propio formulario de registro, con disponibilidad chequeada en vivo mientras se escribe.
- **Cuentas que ya existían** (de antes de esta migración, o creadas con Google, que no pide username) quedan con `username = null` a propósito — nada de asignarles uno sin avisar. La próxima vez que abren la app, el middleware (`src/lib/supabase/middleware.js`) las manda a `/elegir-usuario`, una pantalla obligatoria que no se puede saltear hasta guardar uno. Después de eso se puede cambiar en cualquier momento desde "Editar perfil".
- **`is_username_available(check_username)`** es una función `security definer` que se puede llamar sin sesión (para el registro, antes de que exista la cuenta) — devuelve solo `true`/`false`, nunca datos de la tabla. La usan las tres pantallas (registro, `/elegir-usuario`, editar perfil) a través del mismo componente, `src/components/UsernameField.jsx`.
- Para no consultar la base en cada request de cada usuario logueado (una vez que ya tiene username, para siempre), el middleware se apoya en una cookie (`libris_username_set`) que se pone la primera vez que se confirma que la cuenta tiene uno, y evita la consulta en las visitas siguientes.

### Buscador en Descubrir (clubes y personas)

Una sola barra de búsqueda arriba del directorio de `/descubrir` busca dos cosas a la vez:

- **Clubes** — filtra por nombre entre los clubes que ya están cargados (el mismo directorio de siempre, hasta 50). No hace falta ninguna consulta nueva ni migración: es un filtro en el navegador.
- **Personas** — busca por nombre para mostrar Y por `@usuario` entre *todos* los usuarios de Libris (no solo compañeros de club), con dos consultas directas a `profiles` desde el navegador (`src/lib/supabase/client.js`, primer uso del cliente de Supabase del lado del cliente en la app — hasta ahora todo pasaba por Server Actions/Components) — dos consultas separadas en vez de una combinada con `.or()`, para no tener que armar a mano un texto de filtro que con comas o paréntesis en lo que alguien escriba podría romper. Funciona sin ninguna función nueva porque los nombres de perfil ya son legibles para cualquier usuario logueado (política `profiles are readable by authenticated users`, la misma que permite compartir un link de perfil).

Con la búsqueda vacía se ve el directorio de siempre; al escribir, aparecen dos secciones ("Clubes" / "Personas") con lo que haya, cada una oculta si no tiene resultados. Hay un debounce de 300ms para no mandar una consulta por letra.

**Pendiente, a propósito**: hoy cualquier persona puede aparecer en esta búsqueda — no existe (todavía) una opción de perfil privado/público como en Instagram. Cuando se agregue esa opción, va a necesitar su propio flujo de "solicitud para seguir" con notificación (como ya existe para unirse a un club "con solicitud", migración 014) — se dejó pendiente a propósito, decisión explícita del dueño del producto.

### Citas para Instagram (migración 019)

Las citas destacadas (`kind = 'quote'`) ya existían desde antes; lo nuevo es poder exportarlas como imagen lista para publicar.

- **Al publicar una cita** (formulario de Comentarios, general o por capítulo) se elige uno de tres estilos de tarjeta — **Portada** (la tapa del libro de fondo, degradado oscuro), **Oscuro** (fondo sólido, tapa como miniatura) o **Editorial** (fondo crema, look de revista) — con una miniatura de cada uno para elegir. El estilo elegido se guarda junto con la cita (`comments.quote_style`), no solo al momento de descargar: la tarjeta se ve siempre igual, la vuelva a descargar quien la publicó o aparezca así en su perfil más adelante.
- **Justo después de publicar** aparece un botón para descargar la imagen ahí mismo, en vez de limpiar el formulario de una. El mismo botón aparece también junto a cualquier cita ya publicada en la lista de Comentarios, y en la tarjeta de Actividad del perfil al expandirla — en los tres casos, solo si esa cita tiene un estilo guardado (las citas publicadas antes de esta migración quedan con `quote_style = null` y no muestran el botón).
- **La tarjeta se genera en el navegador con `<canvas>`** (`src/lib/quoteCard.js`), a partir del texto y el estilo guardados más los datos del libro/club/persona ya disponibles. Mismo enfoque sin librerías externas que ya usa `imageProcessing.js` para las fotos.
- **La marca de agua es el logo real de Libris** (no un isotipo chico): `public/logo-libris.png` para el estilo Editorial (fondo claro) y una variante nueva en crema, `public/logo-libris-cream.png`, para Portada y Oscuro (fondo oscuro) — generada con la misma técnica de recoloreado por píxel que ya se usó para los íconos PWA.
- Si la portada del libro no llega a cargar en el navegador (por ejemplo, algún problema de CORS con el bucket de Storage), la tarjeta se genera igual, solo que sin esa imagen de fondo/miniatura — nunca rompe la descarga ni la publicación.

**Vista previa en vivo al publicar** (`src/components/QuoteCardPreview.jsx`) — antes de tocar "Publicar", debajo del selector de estilo aparece el dibujo real de la tarjeta (no una aproximación), armado con el mismo `renderQuoteCard` que se usa para descargar. Se regenera sola con un debounce de 400ms cada vez que cambia el texto o el estilo elegido.

### La imagen de la cita se guarda al publicar (migración 021)

Al principio la tarjeta no se guardaba en ningún lado — se volvía a dibujar cada vez que alguien quería descargarla, y el feed (Inicio, Actividad del perfil) seguía mostrando la cita con el tratamiento genérico de siempre (la portada del libro de fondo + el texto superpuesto), sin importar qué estilo se hubiera elegido. Ahora, al publicar, el navegador arma la tarjeta (la misma vista previa de arriba) y la sube al bucket `quote-cards` — el feed muestra esa imagen tal cual, en el formato exacto que la persona eligió.

- **`comments.quote_image_url`** guarda la URL pública. Es un "mejor esfuerzo": si la subida falla (o la portada del libro no cargó), la cita se publica igual, solo que sin imagen — y el feed la muestra con el tratamiento genérico de antes, el mismo que ya usan las citas publicadas antes de esta migración.
- **`ActivityCard`** (Perfil e Inicio): cuando una cita tiene `quote_image_url`, esa imagen ES la tarjeta completa — no se vuelve a poner el texto ni el libro encima, sería redundante (ya está dibujado adentro). Solo un pie de foto chico ("Publicó una cita · hace X") y, al expandir, los mismos botones de descargar y ver los comentarios.
- **`DownloadQuoteImageButton`** descarga la imagen guardada directamente (`fetch` + blob) cuando existe, en vez de regenerarla — así lo que se descarga es exactamente lo que se ve en el feed, sin ninguna diferencia de un píxel. Sin `quote_image_url` (citas viejas), sigue regenerándola al vuelo como antes.
- **`profile_activity` y `recent_activity`** ahora también devuelven `quote_image_url` (mismo patrón de DROP + CREATE que las migraciones anteriores).

**Saltos de línea**: escribir con Enter dentro de una cita (o de un comentario común) ahora se respeta tal cual en todos lados — en `Blockquote`, en las tarjetas de Actividad (Perfil e Inicio) y en la imagen exportada de `quoteCard.js`. Antes el salto de línea se perdía: React/CSS colapsan `\n` a un espacio por default (hacía falta `white-space: pre-wrap` en cada lugar que muestra el texto), y `wrapText` en `quoteCard.js` partía el texto entero por espacios sin distinguir un salto de línea puesto a propósito de uno que el envoltorio automático seguiría poniendo solo. Ahora `wrapText` separa primero por párrafo (cada `\n`) y recién ahí envuelve cada uno por ancho.

**Los tres estilos quedaron en 3:4**, la misma proporción que ya usan las fotos de "lo que estás leyendo" — antes Portada y Editorial eran 4:5 y Oscuro cuadrado, así que dos citas seguidas en el feed (o una cita y una foto) no medían lo mismo. `quoteCard.js` ahora dibuja los tres a 1080×1440 (una sola constante `HEIGHT`, no una por estilo); como el centrado del texto ya se calculaba a partir del alto del lienzo, no hizo falta retocar cada estilo a mano. La tarjeta de Actividad (`ActivityCard`) pasó de una altura fija (440px) a `aspect-ratio: 3 / 4`, para que el recuadro que envuelve cualquier imagen del feed —cita o foto— tenga siempre esa misma proporción.

**Las citas con imagen guardada de antes de este cambio** quedaron con su proporción vieja (Portada/Editorial en 4:5, Oscuro cuadrado) grabada para siempre en el JPEG — no hay forma de "reconvertirlas" a 3:4 sin volver a dibujarlas. Mostrarlas con `background-size: cover` en el marco nuevo las agranda y les corta los costados, cortando el propio texto de la tarjeta (bug real, reportado y visto en captura). Por eso, específicamente cuando hay `quote_image_url`, el fondo usa `contain` en vez de `cover` — se ve completa siempre, sea cual sea su proporción real, a costa de un borde de color liso a los costados si no coincide con 3:4 exacto. Las citas nuevas (ya nacen en 3:4) llenan el marco igual que con `cover`, porque coinciden exacto con el contenedor.

### Adelanto de Descubrir en "Mis clubes de lectura"

La pantalla de Club (`/`) ya no termina en la lista de tus clubes: debajo, un adelanto de Descubrir con un acceso a la búsqueda (lleva a `/descubrir`, que es donde de verdad se puede tipear) y un par de clubes públicos que todavía no son tuyos — mismo criterio y misma función (`discover_public_clubs`) que la pestaña Descubrir, filtrando los que ya están en "Mis clubes". No hay pestaña nueva ni cambio en la barra de abajo: Descubrir sigue siendo su propia pestaña, esto es solo un adelanto para quien no piensa en tocarla por su cuenta.

**Crear o unirme a un club** pasó de ser un botón fijo en el medio del contenido a dos accesos que abren la misma hoja ("Sumar un club", `src/components/AddClubSheet.jsx`, con las opciones "Crear un club nuevo" / "Unirme con un link"):

- Un ícono "+" junto al logo, arriba de todo — el acceso rápido, disponible sin bajar el scroll.
- Un link de texto al final de la pantalla ("¿No encontraste tu club?") — de contención para quien llegó leyendo todo hasta abajo sin usar el ícono.

Elegir "Unirme con un link" en la hoja manda a `/club/nuevo?modo=unirme`, que abre `OnboardingScreen` directo en la pestaña "Unirme a un club" (prop `initialMode`) en vez de en "Crear club" — mismo formulario de siempre, solo que ya parado en la pestaña que se buscaba.

### Descubrimiento social — cómo está resuelto

RLS solo deja ver los clubes propios, y eso no se toca. Lo que otros clubes leen se expone por funciones `security definer`: `other_clubs_reading_count` y `other_clubs_activity` (migración 005) para "otros clubes leyendo el mismo libro", y `discover_public_clubs` (migración 007, extendida en la 014) para el directorio de `/descubrir`. Los clubes con invitación (antes "privados") aparecen anonimizados ("Un club") y no aparecen en el directorio; los abiertos y los "con solicitud" muestran su nombre y son unibles desde ahí, desde **Preferencias del club** (ícono de engranaje), donde cada opción explica exactamente qué ven los demás.

**Postulaciones a clubes privados (migración 014).** Cada club tiene un `join_mode`, tres valores en vez del viejo booleano `is_private`:

- **Público** (`open`) — listado en Descubrir, cualquiera se une con un toque.
- **Con solicitud** (`request`) — listado en Descubrir con su nombre y un chip dorado, pero unirse requiere mandar una solicitud (con un mensaje opcional) que un administrador aprueba o rechaza. Igual que pedir seguir una cuenta privada de Instagram.
- **Privado** (`invite`) — el modo de antes: no aparece en Descubrir, solo se entra con el link de invitación.

Las solicitudes viven en `club_join_requests` (pendiente/aprobada/rechazada), con RLS que separa dos roles: quien postula solo puede crear su propia solicitud o volver a postular si lo rechazaron, y el administrador del club es quien aprueba o rechaza. Aprobar es un segundo paso — una política aparte en `club_members` solo deja al administrador sumar a alguien que ya tenga una solicitud en estado `approved`; no puede sumar a cualquiera. Si te rechazan podés volver a postular en cualquier momento (no queda un estado "rechazada" visible, se comporta como si nunca hubieras postulado — igual que Instagram).

En **Preferencias del club** los administradores ven una sección "Solicitudes pendientes" con el mensaje de cada postulante y botones para aceptar/rechazar; el ícono de engranaje (en el club y en el header) muestra un número en rojo cuando hay solicitudes sin responder, para que no queden ignoradas en la cola.

**Visibilidad al crear el club.** El formulario de "Crear club" (Onboarding) tiene las mismas tres opciones (Público / Con solicitud / Privado, componente compartido `VisibilityPicker` en `src/components/VisibilityOption.jsx`) preseleccionadas en "Público". Antes no había ninguna elección acá — todo club nuevo se creaba privado por defecto (`is_private` default `true` en el esquema) sin que quien lo creara se enterara, así que quedaba invisible en Descubrir hasta que alguien entrara a Preferencias a cambiarlo a mano. Se puede seguir cambiando después desde Preferencias en cualquier momento.

### Multi-club

Un usuario puede pertenecer a varios clubes (`getMyClubs` en `src/lib/activeClub.js`). El "club activo" (cookie `libris_club`) ya no determina qué se ve en `/` — ahora es solo un atajo para recordar, al entrar a un club desde la lista, cuál se está viendo. **`/club/[clubId]/comentarios` y `/club/[clubId]/preferencias` leen el id de la URL, no la cookie** — evita el bug de mostrar el club equivocado si se entra por un link directo en vez de por la lista.

### Administradores, capítulos y volúmenes

Cada club tiene hasta **3 administradores**, todos con las mismas facultades (no hay jerarquía entre ellos): quien crea el club es el primero, y desde **Preferencias** cualquier administrador puede nombrar hasta 2 más, o sacarle el rol a otro. La base impide que un club se quede sin ningún administrador (no deja sacar al último si todavía hay más miembros) y que se pase de 3.

Ser administrador da acceso a **Gestionar capítulos** (ícono de lista en el detalle del club, o desde Preferencias): ahí se define cuántos capítulos tiene el libro, se les puede poner nombre propio (se sigue mostrando el número: "Cap. 1. El inicio") y se pueden agrupar en **volúmenes** con el nombre que tenga sentido — "Libro 1"/"Libro 2", un año como "2026", lo que sea. Cada volumen decide su propia numeración: se puede seguir la secuencia anterior (10, 11, 12...) o arrancar de nuevo en 1, según cómo esté publicado el libro real. Los miembros que no son administradores ya no pueden agregar ni renombrar capítulos, solo elegir en cuál están al actualizar su progreso.

### Comentarios por capítulo

Además del hilo general del libro, ahora se puede comentar (texto, cita o nota de voz) un capítulo puntual — la pantalla de Comentarios tiene chips arriba para elegir "General del libro" o un capítulo específico, y solo muestra los comentarios de lo que está seleccionado.

### Progreso de lectura: por capítulo o por página

Como no todos los miembros de un club leen la misma edición (cambia la paginación, no los capítulos), el modal de "Actualizar progreso" deja elegir cómo registrarlo:

- **Por capítulo** — elegís un capítulo de la lista (igual para todos, sea cual sea la edición). El % de la barra sale de en qué lugar de la lista de capítulos está ese capítulo (contando volúmenes en el orden en que fueron creados).
- **Por página** — página actual y total de páginas **de tu propia edición**. El % sale de esa proporción, y queda guardado por persona (`current_page`/`total_pages` en `reading_progress`, migración 011).

El servidor es el que calcula el % siempre (antes lo elegía un slider que en realidad medía el avance dentro del capítulo, no el del libro entero — quedaba inconsistente con la barra).

### Héroe de portada y encuadre

El detalle del club (`ClubScreen`) muestra la portada a pantalla completa ("a sangre"): título, autor, progreso y acciones se apoyan abajo sobre un scrim, en vez del layout viejo de una tarjeta chica de 46×66 px. Viene de un handoff de diseño (`design_handoff_hero_portada/`, hecho en Claude Design) — ver ese README para el detalle visual completo.

Dos piezas nuevas:

- **`CoverHero`** (`src/components/CoverHero.jsx`) — el héroe en sí. Lo usan tanto `ClubScreen` (variant `screen`, llena el alto disponible) como la vista previa en vivo del editor de encuadre (variant `preview`, marco de teléfono fijo 390×844) — una sola función para los dos, así nunca pueden mostrar datos distintos.
- **Editor de encuadre** (`/club/[clubId]/portada`, solo administradores) — arrastrar y hacer zoom sobre la portada para decidir qué parte se ve en el héroe, con vista previa en vivo. La matemática (escala "cubrir", clamp para no dejar huecos, los 4 presets, y la persistencia como 4 números normalizados 0–1 en vez de un transform en px) está en `src/lib/coverFrame.js`, portada casi literal del prototipo del handoff.

**Título duplicado**: casi todas las portadas ya traen el título impreso, así que por defecto (`cover_has_title = true`) el héroe no lo repite — muestra el autor más grande y el kicker "Leyendo ahora" en su lugar. El admin lo puede desactivar desde el editor de encuadre si la tapa que subió no trae título. Se decidió *no* intentar detectar esto automáticamente analizando la imagen (se probó y da falsos positivos/negativos con portadas ilustradas o de mucho grano) — es un switch explícito.

`cover_crop` (jsonb: `{x, y, w, h}` normalizados 0–1 respecto del tamaño natural de la imagen) y `cover_has_title` viven en `books`, no en `club_books` — igual que `cover_url`, se comparten entre todos los clubes que están leyendo ese mismo libro.

**Pendiente, tal como lo dejó el handoff**: libros sin portada no tienen todavía un fallback tipográfico (por ahora solo se ve el degradé de fondo); y hoy un solo encuadre sirve para el héroe y para cualquier miniatura futura — si una miniatura cuadrada quedara mal recortada, va a hacer falta un segundo encuadre.

### Contenido editorial

`editorial_items` alimenta las solapas Guías/Cursos de **Recursos**. No hay panel de administración: se carga y edita desde el **Table Editor de Supabase**. `is_published` controla qué se ve.

### Si Storage da "Bucket not found"

El SQL Editor de Supabase corre cada script en **una sola transacción**: si una sentencia falla al final, se revierte todo, incluidos los buckets creados al principio. `supabase/diagnostico-storage.sql` lista qué quedó realmente creado. Si faltan los buckets, se pueden crear a mano desde **Storage → New bucket** (`book-covers` público, `voice-notes` privado) y después correr solo el bloque de políticas de la migración 005.

### Limitaciones conocidas

- **Las notas de voz no se transcriben solas.** Quien graba puede escribir la transcripción a mano (opcional). La transcripción automática necesitaría un servicio externo pago.
- **"Mis clubes de lectura" no tiene notificaciones de no leído**, solo muestra la última novedad de cada club (comentario o progreso más reciente). Hace falta una tabla de "último visto" por usuario/club para un contador real.
- El modal de progreso no guarda "cita destacada" ni "nota" (esos campos del mock no tienen columna en `reading_progress`).
- Los registros de progreso guardados antes de la migración 011 conservan su `percent` viejo (medía avance dentro del capítulo) hasta la próxima vez que esa persona actualice su progreso — no se recalculan retroactivamente.

## Sistema de diseño

Paleta **Electric Coral** sobre fondo blanco (page y cards — el crema del brief original se descartó a pedido): coral (`--accent-500`) = progreso/acciones primarias, dorado (`--gold-500`) = citas destacadas/contenido editorial, verde (`--success`) = actividad social (otros clubes, feed). Tipografía Bricolage Grotesque (headlines) + Plus Jakarta Sans (UI/cuerpo). Íconos vía [Lucide](https://lucide.dev) (`lucide-react`).

Ver `design-reference/readme.md` para el detalle completo de fundamentos visuales y contenido, y las notas de **sustitución** — este sistema de diseño se armó desde un brief sin logo, fuentes propias ni set de íconos, así que ningún wordmark/tipografía/ícono actual debe tratarse como marca final:

- **Logo**: ya hay uno (`public/logo-libris.png`, wordmark "LiBRiS" en negro sobre transparente) — se usa en la pantalla de Login reemplazando el texto plano que había antes.
- **Íconos PWA** (`public/icons/*.png`, `src/app/icon.png`): ya no son placeholders — es el isotipo "punto + S" (el punto de la "i" final del logo, sobre la "S", como un signo propio) en blanco sobre coral. Fuente en `design-reference/brand/` (`isotipo-punto-s.png` en negro, sin fondo, y `logo-libris-wordmark.png`) por si hace falta regenerar algún tamaño.
- **Fuentes**: Bricolage Grotesque / Plus Jakarta Sans cargadas desde Google Fonts (`design-system/tokens/typography.css`) — swap directo si hay tipografías con licencia propia.
