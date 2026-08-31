# Libris

App social para clubes de lectura: progreso de lectura compartido, comentarios (texto, citas destacadas, notas de voz), spoilers colapsables y una sección editorial ("Recursos").

**En producción:** https://libris-relea.vercel.app — se despliega solo en cada push a `main` (proyecto `libris` en Vercel, equipo RELEA). Instalable como PWA desde Chrome en Android.

## Stack

- **Next.js (App Router) + React**, PWA instalable en Android desde el navegador (manifest + service worker mínimo) en lugar de una app nativa — evita costos/tiempos de publicación en App Store; se puede envolver la misma PWA con Bubblewrap para Play Store más adelante si hace falta.
- **Supabase** (Postgres + Auth + Realtime) como backend — ver `supabase/schema.sql` para el modelo de datos y la sección **Backend / Supabase** más abajo para configurarlo.
- Todas las pantallas leen y escriben datos reales en Supabase (Server Components + Server Actions, sin API routes intermedias). **Supabase Storage** guarda las portadas de libros (bucket público) y las notas de voz (bucket privado, servidas con URLs firmadas).

## Convenciones

- **Todo el texto de la app va en español latinoamericano neutro — sin voseo** ("elige", no "elegí"; "tú", nunca "vos"/"sos"; sin modismos regionales como "che"). Esto ya se había establecido en la migración `012_espanol_neutro.sql`; se reafirma acá porque se volvió a colar voseo en features nuevas más de una vez. Antes de dar por terminado cualquier texto nuevo (UI, mensajes de error, copys de mail, comentarios que citen texto de pantalla), repasarlo contra esta regla.

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
    club/nuevo/            # crear o unirse a otro club (multi-club)
    unirse/[clubId]/       # pantalla de invitación (link para compartir)
    auth/callback/         # aterrizaje de los links que manda Supabase por mail
    actions/clubs.js       # Server Actions: createClub, joinClub, addChapter,
                           #   renameChapter, createVolume, renameVolume,
                           #   promoteAdmin, demoteAdmin, joinClubFromInvite,
                           #   selectClub, leaveClub, updateClubPreferences,
                           #   updateProgress, postComment
    actions/media.js       # Server Actions: uploadBookCover, postVoiceComment
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
                             recent_activity ahora también la traen),
                           023_resena_final_y_solo_capitulos.sql (reading_progress.
                             finished_at, comments.title + kind 'review',
                             se saca "General del libro" de Comentarios),
                           024_editar_borrar_resena.sql (políticas update +
                             delete en comments, para editar/borrar tu propia
                             reseña final),
                           025_editar_borrar_solo_resenas.sql (angosta esas
                             políticas a kind = 'review' — la 024 había
                             quedado general, para cualquier comentario),
                           026_editar_foto_propia.sql (política de editar
                             el texto de tus propias fotos en posts —
                             borrar ya existía desde la 016),
                           027_editar_borrar_citas.sql (amplía las políticas
                             de la 025 para incluir también kind = 'quote'),
                           028_editar_borrar_comentarios_y_voz.sql (las
                             mismas políticas, ahora los 4 kind: review,
                             quote, text, voice),
                           029_me_gusta.sql (comment_likes + post_likes,
                             like_count/liked_by_me en profile_activity y
                             recent_activity),
                           030_responder.sql (comments.parent_comment_id,
                             profile_activity excluye las respuestas),
                           031_compartir_en_inicio.sql (comments.
                             shared_to_feed, recent_activity trae texto/voz
                             compartidos),
                           032_responder_en_inicio_y_perfil.sql (columna
                             "replies" en profile_activity/recent_activity,
                             el hilo de la reseña/cita),
                           033_comentarios_en_fotos.sql (tabla post_comments,
                             "replies" también lleva los comentarios de
                             cada foto),
                           034_agrupar_respuestas.sql (comments.
                             reply_to_id, para agrupar visualmente una
                             respuesta debajo del comentario puntual al
                             que le contesta)
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
- **La actividad respeta la privacidad de los clubes**, ya armada en las migraciones 007/014: la función `profile_activity` (`security definer`) solo muestra lo que comentaste en un club abierto o "con solicitud" a cualquiera; lo de un club privado (`invite`) solo se lo muestra a quien ya es miembro de ese club — o a ti mismo, mirando tu propio perfil, sin excepción. Los comentarios marcados spoiler no aparecen nunca acá. `profile_stats` (libros/seguidores/siguiendo) sigue el mismo criterio para el conteo de libros.
- Las notas de voz aparecen en el feed como texto (la transcripción, si existe) — reproducir el audio real sigue restringido a los miembros del club por la política de Storage ya existente, así que no se intentó sortear eso acá.

### Fotos de lo que estás leyendo (migración 016)

Desde el propio perfil (botón "Foto", junto al nombre) se puede compartir una foto de lo que se está leyendo — de la galería o sacada en el momento con la cámara. Antes de subirla pasa por el mismo recorte estilo Instagram que la foto de perfil (`PhotoCropModal`, `src/components/PhotoCropModal.jsx`), acá en proporción vertical 3:4 en vez de cuadrada, con un texto corto opcional.

- Tabla `posts` (`profile_id`, `image_url`, `caption`), bucket `post-photos` — igual de público que el resto de las imágenes de la app, no está atada a ningún club.
- Se mezclan con los comentarios y notas de voz en el mismo feed de "Actividad", ordenadas todas por fecha: `profile_activity` ahora hace un `union all` entre `comments` y `posts`. Como una foto no depende de ningún club, es visible siempre que se puede ver el perfil (mismo criterio que "Seguir").
- Las tarjetas de "Actividad" pasaron de 380px a 440px de alto — bloques más dominantes, un paso hacia el diseño de scroll por bloques que se probó primero como mockup. Por ahora siguen en el flujo normal de la página (sin un scroll "atrapado" aparte); si hace falta el efecto de encastre tipo TikTok se puede sumar después con `scroll-snap`.

**Novedades se sacó de la app** (pestaña y ruta `/novedades` eliminadas) — mostraba el mismo feed editorial que ya está en Recursos, quedaba redundante. Su reemplazo llegó con la migración 020: la pestaña **Inicio** (ver abajo).

### Inicio: feed de novedades (migración 020)

Pestaña nueva, la primera de la barra de abajo (ícono de casa). Es un feed de actividad de **todos** los usuarios de Libris, no solo de tus clubes.

- **Por ahora, dos tipos de contenido**: citas destacadas y fotos de lo que alguien está leyendo. Se van a ir sumando otros con el tiempo (comentarios, notas de voz, empezar a leer un libro nuevo dentro de un club) — no crear un club, eso no es "una novedad de lectura".
- **`recent_activity`** (`security definer`) es la función nueva que arma el feed — mismo criterio de visibilidad de club que ya usaba `profile_activity`: las citas de un club abierto o "con solicitud" se ven siempre, las de uno privado (`invite`) solo si sos miembro. Las fotos son públicas siempre, como ya lo eran. A diferencia de `profile_activity` (la actividad de un perfil puntual), esta es general — no filtra por quién sigue a quién, es la misma lógica sin restricción por relación que ya se usa en el buscador de Descubrir.
- **`ActivityCard`** se movió del Perfil a `src/components/ActivityCard.jsx`, compartido entre las dos pantallas — con una prop `author` opcional que agrega la fila de nombre y foto solo cuando hace falta (Inicio la usa, Perfil no, porque ahí ya se sabe de quién es la actividad).
- **El orden de la tarjeta es el de un posteo de Instagram**, no el de la tarjeta "hero" original: primero quién publicó (si hay `author`), después la imagen sola y limpia —nada escrito encima, ni el nombre ni el texto—, y recién abajo el texto (de qué se trata, la cita o el comentario) y los botones. Antes todo eso iba superpuesto sobre la imagen con un degradado para que se leyera; se sacó ese tratamiento por completo, en las dos pantallas que usan la tarjeta.

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

### La reseña final, al terminar el libro; comentarios solo por capítulo (migración 023)

Los comentarios de un club ya no tienen sección "General del libro" — se sacó a propósito, para reforzar comentar capítulo a capítulo (que era la mitad de las opciones y quedaba floja frente a la otra mitad). `ComentariosScreen` arranca siempre en el primer capítulo; si el club todavía no tiene ninguno, muestra un aviso en vez de un formulario sin dónde publicar.

- **"Terminado"** es una tercera opción en **Actualizar progreso** (junto a "Por capítulo" y "Por página"). Al guardarla, `reading_progress.finished_at` queda con la fecha, el progreso pasa a 100% (ancla el capítulo al último de la lista, o a la página total ya registrada si el libro no tiene capítulos) — y se abre **`FinalReviewModal`**: título obligatorio + una reseña, tan larga como quieras.
- **La reseña es un comentario más** (`comments`, `kind = 'review'`), pero siempre del libro entero — `chapter_id` queda null a la fuerza (constraint `comments_review_shape_check`), nunca se cuelga de un capítulo puntual. Una por persona por libro, por convención de la propia UI (`FinalReviewModal` precarga la que ya exista, vía `reviewId`, para editarla en vez de duplicarla) — no hay un constraint en la base que lo obligue.
- **`BookReviewCard`** (`src/components/BookReviewCard.jsx`) es el bloque visual: el título en un panel de color (`--gold-500`, fijo por ahora) y, fundido con él, la portada del libro —la que ya tiene el club, no una foto que suba la persona— flotando chica con una sombra proyectada en diagonal y un brillo de luz por encima. Mismo tratamiento que se probó y aprobó primero como mockup ("Identidad de Citas"), ahora aplicado a portadas reales: como el ancho/alto salen del tamaño natural de la imagen (`max-width`/`max-height`, sin recortar ni deformar), cualquier proporción de tapa se ve completa. Lo usan tanto `ComentariosScreen` (arriba de todo, antes de los capítulos) como `ActivityCard` (Inicio y Perfil) y la vista previa en vivo de `FinalReviewModal`.
- **En el feed, el texto de la reseña se ve hasta 5 líneas** (una más que el resto de los comentarios largos, que se clampean a 2) — tocar la tarjeta despliega el resto, mismo mecanismo que ya usaba `ActivityCard`.
- **`recent_activity`** ahora también trae las reseñas (antes solo citas destacadas + fotos), con el mismo criterio de privacidad de club que ya usaban las citas. `profile_activity` y `recent_activity` ahora devuelven `title` (antes solo lo tenían las citas destacadas, que no lo usan — queda null para ellas).

**Sobre la foto de las personas leyendo (migración 016)**: esto NO le tocó nada — sigue tal cual, recorte 3:4, sin título, con el tratamiento genérico de siempre en el feed. La identidad con portada + sombra es específica de la reseña final, donde la imagen es la tapa de un libro real (con su propia proporción, conocida), no una foto que puede traer cualquier fondo.

### Editar o borrar tu propia reseña final (migraciones 024 y 025)

Junto al nombre de quien publicó una reseña (kind = 'review'), un menú de 3 puntos (`src/components/PostMenu.jsx`) ofrece **Editar reseña** / **Eliminar reseña** — solo a quien la escribió, nunca a nadie más.

- **`comments` no tenía política de update ni de delete** (solo select + insert) — nadie podía tocar lo que ya había publicado, de ningún tipo. La migración 024 agregó ambas, pero de entrada quedó general (cualquier `kind`, no solo reseñas) — eso no correspondía, porque ni la UI ni la limpieza de Storage (una cita borrada dejaría huérfana su imagen guardada; una nota de voz, su audio) están pensadas para eso todavía. La migración 025 la angostó a `kind = 'review'` — es lo único editable/borrable hoy, a propósito.
- **`deleteBookReview`** (`src/app/actions/clubs.js`) borra la propia reseña — RLS la respalda, el `.eq('profile_id', user.id).eq('kind', 'review')` en la consulta es cinturón y tirantes, no la única traba.
- **Editar** reabre `FinalReviewModal` precargado (prop `myReview`), que ya sabía hacer esto desde la migración 023 (`reviewId` en el formulario evita duplicar la reseña) — ahora se le puede llegar también desde el propio menú, no solo por convención de una sola reseña por libro.
- **Dónde vive cada acción**: en **Comentarios del club** (`ComentariosScreen`), el menú abre el modal de edición ahí mismo — la pantalla ya tiene `clubBookId` y el libro a mano. En **Inicio y Perfil** (`ActivityCard`), "Eliminar" borra directo y "Editar" navega a los comentarios del club en vez de duplicar el modal — el feed no trae `club_book_id` en cada tarjeta.
- **A propósito, no se tocó** editar/borrar comentarios de capítulo ni notas de voz — habilitar eso para notas de voz necesita limpiar también el archivo en Storage (el audio), fuera del alcance de este cambio. Las citas sí se sumaron después, en la migración 027.

### Editar o borrar tu propia foto (migración 026)

Mismo menú de 3 puntos (`PostMenu`), ahora también en tus propias fotos de "lo que estás leyendo" — en Inicio y en Perfil.

- **`posts` ya tenía política de borrar** desde la migración 016 (no tenía UI ni acción para usarla). La 026 agrega la de editar — solo el texto (`caption`); la foto en sí no se reemplaza desde acá, mismo criterio que la reseña (ahí tampoco se reemplaza la portada).
- **`updatePost`/`deletePost`** (`src/app/actions/posts.js`). A diferencia de la reseña, acá `deletePost` sí limpia Storage: borra también el archivo de la foto (`post-photos`), porque el post es dueño de un único archivo propio.
- **`EditPostModal`** (`src/components/EditPostModal.jsx`) es la vista previa de la foto (fija) + el texto editable — mismo patrón liviano que un formulario, sin volver a pasar por el recorte.
- **En Perfil**, donde `ActivityCard` no repite el nombre (redundante, ya se sabe de quién es el perfil), la fila de encabezado con el menú usa `justify-content: flex-end` en vez de `space-between` — sin eso, un solo elemento en la fila quedaba pegado a la izquierda (mismo bug que tuvo la reseña, corregido ahí con el nombre siempre visible; acá se resolvió distinto porque no hacía falta agregar el nombre).

### Editar o borrar tu propia cita (migración 027)

Mismo menú de 3 puntos otra vez, ahora también en tus propias citas destacadas — en Comentarios del club, en Inicio y en Perfil.

- **La migración 025 había dejado editar/borrar limitado a `kind = 'review'`** — las citas quedaron afuera a propósito en ese momento, porque borrar o cambiar el texto de una cita con imagen guardada (`quote_image_url`) dejaba el archivo viejo huérfano en Storage, algo que reseñas y comentarios de capítulo no tienen (la reseña no tiene archivo propio: usa la portada del libro). La 027 amplía esas políticas a también `kind = 'quote'`, ahora que `updateQuote`/`deleteQuote` (`src/app/actions/clubs.js`) ya hacen esa limpieza.
- **Editar una cita regenera la tarjeta**: `EditQuoteModal` (`src/components/EditQuoteModal.jsx`) reusa el mismo selector de estilo y la misma vista previa en vivo (`QuoteCardPreview`) que ya tenía `NewCommentForm` al publicar — al guardar, el navegador vuelve a dibujar la imagen con el texto/estilo nuevos (`renderQuoteCard`) y `updateQuote` la sube y borra la vieja. Si la cita nunca tuvo imagen guardada (de antes de la migración 021, o si en su momento falló la subida), edita igual — sencillamente puede terminar generando una por primera vez.
- **Dónde vive cada acción**: en **Comentarios del club**, el menú va en la fila de nombre + fecha de cada comentario (antes sin nada a la derecha); en **Inicio y Perfil** (`ActivityCard`), mismo tratamiento que ya tenían las fotos — encabezado con `PostMenu`, `flex-end` en Perfil por la misma razón que las fotos.

### Editar o borrar comentarios de capítulo y notas de voz (migración 028)

Los dos tipos que quedaban sin tocar — cerrando el círculo: ahora los cuatro tipos de comentario (reseña, cita, comentario de capítulo, nota de voz) se pueden editar o borrar desde su propio menú de 3 puntos.

- **Comentarios de capítulo** (`kind = 'text'`): `EditCommentModal` (`src/components/EditCommentModal.jsx`) edita el texto y el spoiler — sin archivo propio, no hay nada que limpiar en Storage. `updateComment`/`deleteComment` en `src/app/actions/clubs.js`.
- **Notas de voz** (`kind = 'voice'`): `EditVoiceModal` (`src/components/EditVoiceModal.jsx`) deja escuchar el audio (con `VoiceNotePlayer`, de solo lectura) y edita la transcripción/resumen y el spoiler — el audio en sí no se regraba desde acá, para eso conviene borrar y grabar de nuevo. `updateVoiceComment`/`deleteVoiceComment` en `src/app/actions/media.js` (junto a `postVoiceComment`, que ya vivía ahí). Borrar sí limpia Storage — a diferencia de fotos y citas, acá `voice_url` ya es el *path* del archivo (no una URL pública: el bucket `voice-notes` es privado, cada reproducción usa una URL firmada), así que `deleteVoiceComment` lo borra directo, sin tener que desarmar una URL.
- **La política se angostó bastante en las migraciones 025/027** (`kind in ('review', 'quote')`) — la 028 la vuelve a abrir a los cuatro tipos, listados explícitamente (`kind in ('review', 'quote', 'text', 'voice')`) en vez de sacar la condición del todo, para que un tipo de comentario nuevo el día de mañana no quede editable de arrastre sin que alguien lo decida a propósito.
- **Solo en Comentarios del club** — a diferencia de reseña/foto/cita, comentarios de capítulo y notas de voz no aparecen en el feed de Inicio (`recent_activity` no los trae) y sí aparecen en el de Perfil (`profile_activity` no filtra por `kind`) pero `ActivityCard` ahí todavía no tiene el menú para estos dos tipos — quedó pendiente a propósito, se puede sumar si hace falta.

### Me gusta, Comentar y Compartir (migraciones 029, 030 y 031)

Una fila de acciones bajo cada reseña, cita, comentario, nota de voz y foto — mockeada primero ("Botones de acción") y confirmada antes de construirla.

**Me gusta (029)** — el corazón + contador, en todo lo que aparece en Comentarios del club, Inicio y Perfil. Lo puede tocar cualquier miembro del club (no solo el dueño), a diferencia del resto de los botones de esta sección.

- Dos tablas, no una genérica: `comment_likes` (apunta a `comments`) y `post_likes` (apunta a `posts`) — cada una con su propia foreign key real, en vez de una referencia "polimórfica" sin garantía de integridad. La política de `comment_likes` respeta la privacidad del club (mismo criterio que `is_club_member` ya usa para los comentarios); `post_likes` es pública, como las fotos.
- `toggleCommentLike`/`toggleShareToFeed`/`postReply` en `src/app/actions/clubs.js`, `togglePostLike` en `src/app/actions/posts.js` — todas simples toggles: si ya existe tu fila, la borra; si no, la crea.
- `profile_activity` y `recent_activity` ahora también traen `like_count` y `liked_by_me`, calculados con un `left join lateral` a la tabla de likes que corresponda — no hace falta una consulta aparte. La pantalla de Comentarios del club, que no pasa por esas funciones, los trae aparte (`comment_likes` filtrado por los ids de esa página) y los mezcla a mano, en `comentarios/page.js`.
- `LikeButton` (`src/components/LikeButton.jsx`) es el componente — sin estado optimista propio: dispara la acción y el conteo real llega con el refresco normal de la página, mismo patrón que ya usan los botones de eliminar. `Icon.jsx` ganó una prop `fill` opcional (antes no existía) para poder pintar el corazón relleno cuando está marcado.

**Comentar (030)** — el botón dice "Comentar", no "Responder" (hay una diferencia entre las dos palabras y "Comentar" es la que corresponde acá) — pero por dentro sigue siendo una respuesta: un comentario más (`kind = 'text'`), con `parent_comment_id` apuntando al original; hereda su `club_book_id`/`chapter_id`. No hace falta una tabla ni una política nueva para publicarla — la política que ya deja comentar en el club no distingue por `kind`. Se excluye de `profile_activity` (con `parent_comment_id is null`) para que no aparezca como una actividad propia repetida en el perfil de quien comentó.

- **Un solo nivel de anidamiento** — se puede comentar una reseña/cita/comentario/nota de voz, pero no un comentario ya puesto (la UI no ofrece "Comentar" ahí; no hay una restricción en la base que lo impida, es una convención de la propia interfaz, igual que "una reseña por persona por libro").
- **Al principio solo vivía en Comentarios del club** — llevarlo también a Inicio y Perfil (reseñas y citas) fue la migración 032, más abajo.

**Compartir (031)** — solo tiene sentido, y solo aparece, en tus propios comentarios de capítulo y notas de voz: reseñas, citas y fotos ya aparecen siempre en Inicio, no hay nada que "compartir" ahí. Retoma la idea charlada antes de construirla: los comentarios del club se sentían atrapados adentro, sin forma de que quien los escribió los hiciera más públicos.

- `comments.shared_to_feed boolean not null default false` — todo lo que ya existe queda exactamente como estaba (nada se comparte solo). `recent_activity` ahora también trae comentarios y notas de voz, pero solo si `shared_to_feed = true` (y no son una respuesta).
- **Solo lo ve el dueño** — `ShareButton` (`src/components/ShareButton.jsx`) se muestra condicionalmente desde quien usa el componente (`isOwn && kind en text/voice`), no hay nada del lado del botón que lo esconda por su cuenta.

Los tres viven juntos en `EngagementBlock` (`src/components/EngagementBlock.jsx`): Me gusta + Comentar siempre, Compartir opcional (prop `share`), y debajo, el hilo de respuestas — las que ya hay, anidadas con su propio `LikeButton` chico, y el campo para escribir una nueva si se tocó "Comentar". Lo usan `ReviewCard`, cada comentario de capítulo en `ComentariosScreen`, y ahora también `ActivityCard` para reseñas y citas (ver migración 032). Compartir sigue siendo exclusivo de Comentarios del club — reseñas, citas y fotos no lo necesitan en ningún lado.

### Comentar en Inicio y Perfil, y comentarios en las fotos (migraciones 032 y 033)

Dos ampliaciones charladas después de construir lo de arriba.

**Comentar en Inicio y Perfil (032)** — hasta acá, "Comentar" solo vivía en Comentarios del club. Se suma también donde se ven reseñas y citas fuera del club — no a comentarios de capítulo ni notas de voz, que ni siquiera aparecen ahí (o aparecen sin ese menú, ver migración 028).

- `profile_activity` y `recent_activity` ahora devuelven una columna más, `replies` (`jsonb`) — el hilo completo de esa fila, armado con un `jsonb_agg` en un `left join lateral` (no hace falta una segunda consulta desde la pantalla). Mismas columnas que ya usaba `EngagementBlock` en Comentarios del club (`id`, `body`, `created_at`, `profiles.display_name`, `like_count`, `liked_by_me`), así que no hizo falta tocar ese componente — `ActivityCard` lo empezó a usar tal cual para reseñas y citas, pasándole `activity.replies`.
- `postReply` (ya existía, migración 030) no necesitó ningún cambio — no le importa desde qué pantalla se llama, solo el id del comentario al que se responde.

**Comentarios en las fotos (033)** — las fotos nunca tuvieron dónde comentar, solo el texto que la propia persona escribe al publicarlas.

- Tabla nueva, `post_comments` (no una fila más en `comments`, que exige un `club_book_id` que una foto no tiene). Más simple a propósito que el hilo de reseñas/citas: lista plana, sin responder a un comentario puntual ni su propio "me gusta" — se puede sumar después si hace falta.
- La misma columna `replies` de `profile_activity`/`recent_activity` lleva, para las filas `kind = 'photo'`, los comentarios de esa foto en vez de un hilo de respuestas — mismo lugar, para que `ActivityCard` no tenga que distinguir de dónde vienen.
- `PhotoCommentsBlock` (`src/components/PhotoCommentsBlock.jsx`) es el componente — mismo patrón visual que `EngagementBlock` (Me gusta + un botón que abre la lista y el campo para escribir) pero sin hilo anidado. `postPhotoComment` en `src/app/actions/posts.js`.

**Responder a un comentario puntual, estilo Instagram** — cada comentario ya puesto (dentro de `EngagementBlock`: Comentarios del club, Inicio y Perfil) tiene su propio "Responder", chiquito, junto a su "Me gusta". No crea un segundo nivel de hilo — sigue siendo un solo nivel de anidamiento, todo cuelga del mismo original — solo precarga el campo compartido con `@Nombre ` para que quede claro a quién le está contestando, mismo truco que usa Instagram por dentro (el `@Nombre` queda como texto plano en el comentario, no es un link ni una mención de verdad). No se tocó `PhotoCommentsBlock` — sigue sin "Responder" por comentario, a propósito, mismo criterio simplificado de la 033.

- `Textarea` (`src/design-system/components/forms/Textarea.jsx`) pasó a `React.forwardRef` — antes no hacía falta, ahora `EngagementBlock` necesita enfocar el campo a mano al tocar "Responder" en una respuesta puntual.

**Agrupar visualmente esa respuesta (migración 034)** — al principio, responderle a una respuesta puntual quedaba igual que cualquier otro comentario: al final de la lista, sin nada que la distinga salvo el `@Nombre` en el texto. Ahora se agrupa debajo del comentario al que le contesta, con más sangría y un avatar más chico — como un conjunto propio, no una fila más.

- `comments.reply_to_id` — distinto de `parent_comment_id` (que sigue apuntando siempre al comentario original, nunca a otra respuesta: eso es lo que mantiene el límite de "un solo nivel de anidamiento" real, en la base). `reply_to_id` es solo para agrupar en la pantalla — nunca arma un hilo más profundo.
- `groupReplies` (adentro de `EngagementBlock.jsx`) resuelve la cadena completa (una respuesta que le contesta a otra respuesta) hasta encontrar la raíz, y agrupa todo bajo ese mismo nivel extra de sangría — no se sigue escalonando más profundo por cada respuesta-a-una-respuesta.
- `postReply` guarda `reply_to_id` cuando llega (tocaste "Responder" en una respuesta puntual); queda `null` si tocaste el "Comentar" general. `profile_activity`/`recent_activity` ahora también devuelven `reply_to_id` dentro de cada objeto de `replies`, para que `ActivityCard` agrupe igual que `ComentariosScreen`.

### Se sacó "Impresiones recientes" de la pantalla del club

La pantalla de un club (`/club/[clubId]`, con el héroe de portada) ya no muestra, debajo, la lista de los últimos comentarios/citas/notas de voz del libro ("Impresiones recientes") — quedaba redundante con Comentarios del club, que ya es adonde se entra a comentar de verdad.

- No hizo falta ninguna migración — es sacar una sección de `ClubScreen.jsx`, no un cambio de datos.
- El puntito verde de actividad en el selector de club (`ClubSwitcher`, arriba del héroe) se mantuvo — es una señal aparte, no la lista en sí — pero pasó a calcularse con un conteo liviano (`{ count: 'exact', head: true }`) en vez de traer los 3 comentarios completos que ya no se muestran en ningún lado.

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

Un usuario puede pertenecer a varios clubes (`getMyClubs` en `src/lib/activeClub.js`). El "club activo" (cookie `libris_club`, `getActiveClub`) es el que se elige al entrar a un club desde la lista — y es el que determina qué se muestra en el héroe de `/` (ver "El héroe vive en Mis clubes de lectura" más abajo). **`/club/[clubId]/comentarios` y `/club/[clubId]/preferencias` leen el id de la URL, no la cookie** — evita el bug de mostrar el club equivocado si se entra por un link directo en vez de por la lista.

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

### Héroe del club — la misma solución visual que la reseña final

El detalle del club (`ClubScreen`) mostró primero la portada a pantalla completa ("a sangre", ver `design_handoff_hero_portada/` para ese diseño original), con un editor de encuadre aparte para que el admin eligiera qué parte de la foto se veía. Se reemplazó por el mismo mecanismo visual que ya tenía `BookReviewCard` (la tarjeta de "Reseña final"): panel de color sólido (`accent-500`) con el kicker, título y autor arriba, y la portada flotando chica más abajo — con su proporción natural, sin recortar — con la sombra apilada en diagonal y el brillo por encima.

- **`CoverHero`** (`src/components/CoverHero.jsx`) — el héroe en sí, ahora un solo modo (antes tenía `variant='screen'`/`variant='preview'` para el editor de encuadre, que ya no existe). Al no recortar la portada, no hace falta saber "qué parte se ve" — la imagen se muestra completa, como en la reseña.
- El **editor de encuadre** (`/club/[clubId]/portada`, arrastrar y hacer zoom) se sacó entero: sin recorte no tenía nada que definir. Con eso se fue `cover_crop` (deja de leerse y escribirse — la columna sigue en `books`, sin usar, no se borró) y `src/lib/coverFrame.js` deja de tener ese consumidor (lo sigue usando `PhotoCropModal`, que es un recorte genérico para fotos de lectura y de perfil — nada que ver con el héroe).

**Título duplicado**: esto seguía necesitando resolverse en otro lado — el generador de citas para compartir (`src/lib/quoteCard.js`, estilo "cover") sigue dibujando la portada a pantalla completa detrás de la cita, y ahí sí hace falta saber si esa portada ya trae el título impreso para no repetirlo. Ese switch (`cover_has_title` en `books`) se movió de aquel editor a un toggle simple dentro de **Preferencias del club → El libro en curso** ("La portada ya trae el título"), guardado junto con el título/autor del libro en la misma Server Action (`updateClubPreferences`).

### Actualizar progreso tocando un capítulo

El héroe ya no tiene el botón grande "Actualizar progreso" ni el ícono cuadrado de comentarios al lado. En su lugar:

- **`ChapterPath`** (`src/components/ChapterPath.jsx`, reemplaza a `ChapterProgressChips`) — debajo del héroe, un camino vertical **ascendente**: los capítulos que faltan quedan arriba, los ya leídos abajo (subir = avanzar, como en Duolingo — se probaron mockups en ambas direcciones y esta se sintió mejor, entre otras cosas porque deja mucho más espacio para los capítulos que tienen nombre propio, no solo número, que una fila horizontal de chips). Tocar un capítulo lo marca como propio al toque (misma Server Action `updateProgress`, `mode: 'chapter'`, sin abrir modal) — mismo patrón optimista + aviso breve que ya tenían los chips. Solo se muestra una ventana del camino (2 capítulos atrás, 3 adelante del actual) para que no se vuelva eterno en libros largos; "+N capítulos más adelante/ya leídos" arriba y abajo de esa ventana abre el modal completo (todos los capítulos) para saltar más lejos de una sola vez. Al abrir la pantalla, el camino se centra solo en tu capítulo actual (`scrollIntoView`, una vez al montar) — así no hay que buscarlo a mano; si después tocás otro capítulo, no te saca del lugar donde acabás de tocar.
- **Racha de lectura** (`streak_count`/`last_activity_date` en `reading_progress`, migración 035) — días seguidos marcando progreso en ESE libro de ESE club (no es una racha global de la cuenta). Se calcula en el servidor, dentro del propio `updateProgress`: mismo día no suma de nuevo, al día siguiente suma uno, con un salto de 2+ días se reinicia en 1. Vive integrada en el nodo del capítulo actual del camino — un halo cálido y una insignia con llama, sin tarjeta aparte — y solo se muestra a partir de 2 días (con 1 no es realmente una racha todavía).
- **Lápiz chico** junto al capítulo actual, dentro del héroe — sigue abriendo el modal completo de "Actualizar progreso", que es donde viven el progreso por página, las reacciones al capítulo y "Terminé el libro" (dispara la reseña final).
- El acceso a "Comentarios del club" que antes vivía en ese ícono cuadrado se movió a la fila de íconos de arriba del héroe (junto a Invitar/Preferencias), para no perderlo.

Este cambio dejó expuesto un bug de layout preexistente en `AppShell`: el tab bar de abajo es `position: sticky`, y cuando el contenido de una pantalla mide apenas un poco más que la pantalla del teléfono, "sticky" no empuja lo de arriba — lo tapa. Se corrigió reservándole su alto real como `padding-bottom` del contenido (`calc(70px + env(safe-area-inset-bottom, 8px))`), así el tab bar nunca vuelve a superponerse al final de ninguna pantalla.

### Quiénes están leyendo, y actividad del club

Debajo del héroe, la pantalla del club suma estas piezas (completando la dirección de diseño "Centro del club" del handoff):

- **`MemberProgressStrip`** (`src/components/MemberProgressStrip.jsx`) — la pila de avatares de los miembros del club y, si ya registraste algún capítulo, cuántos van exactamente por el mismo que tú. Se arma cruzando `club_members` (con `profiles` embebido) y `reading_progress` de **todos** los miembros para ese libro — no solo el propio, que es lo único que se traía hasta ahora. RLS ya dejaba ver ambas cosas a cualquier miembro del club (mismo alcance que la lista de Preferencias), así que no hizo falta ninguna política nueva.
- **`SwipeableSections`** (`src/components/SwipeableSections.jsx`) — debajo de la franja de miembros, "Tu camino" y "Actividad del club" viven en un carrusel horizontal en vez de apiladas: arranca en "Tu camino", deslizar a la derecha lleva a "Actividad del club". Scroll nativo con `scroll-snap` (el gesto de deslizar de toda la vida, sin librería) más unos puntitos abajo del héroe — como los de Instagram Stories — que muestran en cuál estás y se pueden tocar para saltar directo. Componente genérico (recibe `sections: [{key, node}]`), hoy solo lo usa esta pantalla.
- **`ClubActivityFeed`** (`src/components/ClubActivityFeed.jsx`) — tarjetas con lo último que pasó: comentarios recientes agrupados por capítulo ("Bruno y 2 más comentaron el Capítulo 4") y reseñas finales, cada una su propia tarjeta ("Sofía terminó el libro y dejó su reseña"). El agrupamiento vive en `src/lib/clubActivity.js`: junta por `chapter_id` los últimos comentarios (sin respuestas, sin reseñas) y arma reseñas aparte, ordenado todo por lo más reciente. Es una ventana de "lo más reciente" (últimos 24 comentarios / 8 reseñas), no un historial completo — con actividad muy espaciada en el tiempo puede juntar en una misma tarjeta comentarios de hace días si fueron los últimos en ese capítulo.

Ninguna de estas piezas necesitó migración: los datos y los permisos ya existían, solo faltaba consultarlos y mostrarlos.

### El héroe vive en "Mis clubes de lectura"

El héroe (`CoverHero`), "Tu camino" (`ChapterPath`) y "Actividad del club" se mudaron de `/club/[clubId]` a `/` — al entrar a la app ya se ve el club activo leyendo, sin tocar nada. Los tres viven ahora en un mismo `SwipeableSections` de **3 páginas** (antes eran 2, solo camino/actividad, y el héroe quedaba fijo arriba): entrás y ves el héroe, deslizás una vez a la derecha y aparece "Tu camino", otra vez y aparece "Actividad del club" — un solo carrusel, los mismos puntitos arriba sirven para las tres paradas.

- **`/club/[clubId]` sigue existiendo tal cual** (mismo héroe, mismo camino, misma actividad, más `MemberProgressStrip` y el aviso de "otros clubes leyendo esto", que no se llevaron a `/`) — es la vista para entrar a un club que no es el activo, desde la lista de abajo. No se sacó nada de ahí.
- El club activo es el mismo de siempre (cookie `libris_club`, `getActiveClub`); si todavía no tiene un libro activo, `/` no muestra el carrusel — directo a la lista de clubes, como antes de este cambio.
- La lista de "Mis clubes de lectura" marca con un borde y "Estás viendo este club arriba" la tarjeta del club activo, para que quede claro de cuál es el héroe de más arriba.
- **`getClubHeroExtras`** (`src/lib/clubDetail.js`) junta la consulta de capítulos/volúmenes/mi progreso/mi reseña/actividad reciente/solicitudes pendientes que necesitan el héroe y sus dos páginas — la usan tanto `/` (para el club activo) como `/club/[clubId]` (para el club de la URL), en vez de tener la misma consulta duplicada en los dos lados.
- El ícono de Preferencias con el punto de solicitudes pendientes se separó a su propio componente (`src/components/PreferenciasIconButton.jsx`) por el mismo motivo: lo usan los íconos de arriba del héroe en las dos pantallas.

No hizo falta ninguna migración — los datos y RLS ya alcanzaban para el club activo, igual que ya alcanzaban para el de la URL.

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

Paleta **Electric Coral** sobre fondo blanco (page y cards — el crema del brief original se descartó a pedido): coral (`--accent-500`) = progreso/acciones primarias, dorado (`--gold-500`) = citas destacadas/contenido editorial, verde (`--success`) = actividad social (otros clubes, feed). Tipografía **DM Serif Display** (headlines) + **Karla** (UI/cuerpo) — antes Bricolage Grotesque + Plus Jakarta Sans; se probaron 4 parejas nuevas sobre pantallas reales (héroe del club) y esta fue la elegida, por sentirse más "editorial, de club de lectura de verdad" que la geométrica de antes. Íconos vía [Lucide](https://lucide.dev) (`lucide-react`).

DM Serif Display solo trae la variante regular (sin corte bold propio): los títulos que piden `fontWeight: 700`/`800` reciben un bold sintetizado por el navegador (engrosa el trazo, no usa formas dibujadas a propósito). Se probó en varias pantallas y se ve bien a los tamaños que usa la app — quedó así. Si en algún lugar puntual se ve "embarrado", el arreglo es bajar ese `fontWeight` a 400/500 en ese lugar.

Ver `design-reference/readme.md` para el detalle completo de fundamentos visuales y contenido, y las notas de **sustitución** — este sistema de diseño se armó desde un brief sin logo, fuentes propias ni set de íconos, así que ningún wordmark/tipografía/ícono actual debe tratarse como marca final:

- **Logo**: ya hay uno (`public/logo-libris.png`, wordmark "LiBRiS" en negro sobre transparente) — se usa en la pantalla de Login reemplazando el texto plano que había antes.
- **Íconos PWA** (`public/icons/*.png`, `src/app/icon.png`): ya no son placeholders — es el isotipo "punto + S" (el punto de la "i" final del logo, sobre la "S", como un signo propio) en blanco sobre coral. Fuente en `design-reference/brand/` (`isotipo-punto-s.png` en negro, sin fondo, y `logo-libris-wordmark.png`) por si hace falta regenerar algún tamaño.
- **Fuentes**: DM Serif Display / Karla cargadas desde Google Fonts (`design-system/tokens/typography.css`) — swap directo si hay tipografías con licencia propia.
