# Libris

App social para clubes de lectura: progreso de lectura compartido, comentarios (texto, citas destacadas, notas de voz), spoilers colapsables, feed de novedades y una sección editorial ("Descubrir").

**En producción:** https://libris-relea.vercel.app — se despliega solo en cada push a `main` (proyecto `libris` en Vercel, equipo RELEA). Instalable como PWA desde Chrome en Android.

## Stack

- **Next.js (App Router) + React**, PWA instalable en Android desde el navegador (manifest + service worker mínimo) en lugar de una app nativa — evita costos/tiempos de publicación en App Store; se puede envolver la misma PWA con Bubblewrap para Play Store más adelante si hace falta.
- **Supabase** (Postgres + Auth + Realtime) como backend — ver `supabase/schema.sql` para el modelo de datos y la sección **Backend / Supabase** más abajo para configurarlo.
- Todas las pantallas leen y escriben datos reales en Supabase (Server Components + Server Actions, sin API routes intermedias). **Supabase Storage** guarda las portadas de libros (bucket público) y las notas de voz (bucket privado, servidas con URLs firmadas).

## Estructura

```
src/
  app/                    # rutas de Next.js (App Router)
    page.js               # / → pantalla Club (home) — Server Component, lee Supabase
    login/                 page.js + actions.js (signIn/signUp/signOut, Server Actions)
    novedades/page.js
    descubrir/page.js
    club/comentarios/page.js
    unirse/[clubId]/       # pantalla de invitación (link para compartir)
    auth/callback/         # aterrizaje de los links que manda Supabase por mail
    actions/clubs.js       # Server Actions: createClub, joinClub, addChapter,
                           #   joinClubFromInvite, setClubVisibility, updateProgress, postComment
    actions/media.js       # Server Actions: uploadBookCover, postVoiceComment
    manifest.js            # genera /manifest.webmanifest (PWA)
  components/
    AppShell.jsx           # shell con tab bar inferior (Club / Novedades / Descubrir)
    LoginForm.jsx, SignOutButton.jsx, NewCommentForm.jsx, InviteButton.jsx,
    GoogleSignInButton.jsx, VoiceRecorder.jsx, CoverUploader.jsx,
    ClubVisibilityToggle.jsx
    ServiceWorkerRegistration.jsx
  screens/                # pantallas de producto (usan el design system + props con datos reales)
  lib/
    supabase/               client.js, server.js, middleware.js (@supabase/ssr)
    getMyActiveClubBook.js, formatRelativeTime.js, safeNext.js, authProviders.js
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
                             funciones de descubrimiento y tabla editorial)
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

Verificado funcionando de punta a punta contra Supabase real: registro/login, crear club con su primer libro, actualizar progreso (persiste), publicar comentarios (texto, cita, spoiler), feed de Novedades, y persistencia entre sesiones.

**Setup de la base:** correr en orden `supabase/schema.sql` y después cada archivo de `supabase/migrations/` por número. `supabase/verificar-setup.sql` chequea que estén todas aplicadas (todas las filas deben decir OK). Para probar sin esperar mails, desactivar **Confirm email** en Authentication → Sign In / Providers; antes de abrir al público conviene reactivarlo (la ruta `/auth/callback` ya está lista para recibir esos links).

### Login con Google

Ya configurado y funcionando en producción. `signInWithGoogle` en `src/app/login/actions.js` y el botón en `GoogleSignInButton.jsx`. **El botón solo se muestra si el proveedor está habilitado en Supabase** — `src/lib/authProviders.js` consulta `/auth/v1/settings` y no lo renderiza si Google está apagado, para que nunca quede un botón que falla al tocarlo.

Para activarlo en otro entorno: crear credenciales OAuth en Google Cloud Console (redirect URI = `https://<proyecto>.supabase.co/auth/v1/callback`), cargarlas en Supabase (Authentication → Sign In / Providers → Google), y poner el Site URL + Redirect URLs del proyecto apuntando al dominio de la app. No hace falta tocar código ni redesplegar.

**Pendiente de marca:** la pantalla de consentimiento de Google muestra el dominio de Supabase en vez de "Libris". Para que diga Libris hace falta un dominio propio + el add-on Custom Domain de Supabase (pago) + verificación de la app en Google.

### Descubrimiento social — cómo está resuelto

RLS solo deja ver los clubes propios, y eso no se toca. Lo que otros clubes leen se expone por funciones `security definer` (migración 005) que devuelven lo mínimo: `other_clubs_reading_count`, `other_clubs_activity` y `popular_books`. Los clubes **privados aparecen anonimizados** ("Un club"); solo los que se marcan como públicos muestran su nombre, desde el interruptor que ve el creador en la pantalla del club.

### Contenido editorial

`editorial_items` alimenta las solapas Guías/Autores/Cursos de Descubrir. No hay panel de administración: se carga y edita desde el **Table Editor de Supabase**. `is_published` controla qué se ve.

### Limitaciones conocidas

- **Las notas de voz no se transcriben solas.** Quien graba puede escribir la transcripción a mano (opcional). La transcripción automática necesitaría un servicio externo pago.
- Un usuario pertenece a **un solo club** (`src/lib/getMyActiveClubBook.js` toma el primero). Multi-club implica sacar `.limit(1)`/`.maybeSingle()` y agregar un selector de club en el shell.
- El modal de progreso no guarda "cita destacada" ni "nota" (esos campos del mock no tienen columna en `reading_progress`).

## Sistema de diseño

Paleta **Electric Coral** sobre fondo crema: coral (`--accent-500`) = progreso/acciones primarias, dorado (`--gold-500`) = citas destacadas/contenido editorial, verde (`--success`) = actividad social (otros clubes, feed). Tipografía Bricolage Grotesque (headlines) + Plus Jakarta Sans (UI/cuerpo). Íconos vía [Lucide](https://lucide.dev) (`lucide-react`).

Ver `design-reference/readme.md` para el detalle completo de fundamentos visuales y contenido, y las notas de **sustitución** — este sistema de diseño se armó desde un brief sin logo, fuentes propias ni set de íconos, así que ningún wordmark/tipografía/ícono actual debe tratarse como marca final:

- **Logo**: no hay. El nombre se renderiza en texto plano donde iría un isotipo.
- **Íconos PWA** (`public/icons/*.png`): placeholders generados (círculo crema sobre fondo coral), no un logo real.
- **Fuentes**: Bricolage Grotesque / Plus Jakarta Sans cargadas desde Google Fonts (`design-system/tokens/typography.css`) — swap directo si hay tipografías con licencia propia.
