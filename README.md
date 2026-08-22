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
    AppShell.jsx           # shell con tab bar inferior (Recursos / Club / Descubrir)
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
                             "con solicitud")
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

### Estructura de navegación (Recursos / Club / Descubrir)

- **Recursos** (`/recursos`) — contenido curado en dos secciones: **Guías** y **Cursos**. Se sacó la categoría "Autor" (migración 008).
- **Club** (`/`) — ya no es el detalle de un club: es **"Mis clubes de lectura"**, la lista completa de los clubes en los que participás (los hayas creado o no), cada uno con su actividad más reciente. Tocar uno lleva a `/club/[clubId]`, el detalle real (libro, progreso, comentarios).
- **Descubrir** (`/descubrir`, antes `club/otros`) — pasó a ser pestaña propia (antes era un link dentro de Club). El directorio de clubes públicos para unirse.

**Novedades se sacó de la app** (pestaña y ruta `/novedades` eliminadas) — mostraba el mismo feed editorial que ya está en Recursos, quedaba redundante. Está pendiente de decisión qué va en su lugar: se evaluó convertirla en un feed de actividad de los clubes propios (comentarios/progreso/nuevos miembros de todos mis clubes en un solo lugar, sin tocar la privacidad de clubes ajenos) más contenido como libros populares (`popular_books`, ya escrita en la base y sin usar) — pero se decidió sacarla primero y definir el reemplazo más adelante.

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

- **Logo**: no hay. El nombre se renderiza en texto plano donde iría un isotipo.
- **Íconos PWA** (`public/icons/*.png`): placeholders generados (círculo crema sobre fondo coral), no un logo real.
- **Fuentes**: Bricolage Grotesque / Plus Jakarta Sans cargadas desde Google Fonts (`design-system/tokens/typography.css`) — swap directo si hay tipografías con licencia propia.
