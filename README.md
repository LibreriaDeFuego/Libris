# Libris

App social para clubes de lectura: progreso de lectura compartido, comentarios (texto, citas destacadas, notas de voz), spoilers colapsables, feed de novedades y una sección editorial ("Descubrir").

**En producción:** https://libris-relea.vercel.app — se despliega solo en cada push a `main` (proyecto `libris` en Vercel, equipo RELEA). Instalable como PWA desde Chrome en Android.

## Stack

- **Next.js (App Router) + React**, PWA instalable en Android desde el navegador (manifest + service worker mínimo) en lugar de una app nativa — evita costos/tiempos de publicación en App Store; se puede envolver la misma PWA con Bubblewrap para Play Store más adelante si hace falta.
- **Supabase** (Postgres + Auth + Realtime) como backend — ver `supabase/schema.sql` para el modelo de datos y la sección **Backend / Supabase** más abajo para configurarlo.
- Auth (login/registro) + Club + Novedades + Comentarios ya leen y escriben datos reales en Supabase (Server Components + Server Actions, sin API routes intermedias). **Descubrir** sigue con contenido de ejemplo hardcodeado — no hay todavía una tabla/CMS editorial.

## Estructura

```
src/
  app/                    # rutas de Next.js (App Router)
    page.js               # / → pantalla Club (home) — Server Component, lee Supabase
    login/                 page.js + actions.js (signIn/signUp/signOut, Server Actions)
    novedades/page.js
    descubrir/page.js
    club/comentarios/page.js
    actions/clubs.js       # Server Actions: createClub, joinClub, updateProgress, postComment
    manifest.js            # genera /manifest.webmanifest (PWA)
  components/
    AppShell.jsx           # shell con tab bar inferior (Club / Novedades / Descubrir)
    LoginForm.jsx, SignOutButton.jsx, NewCommentForm.jsx
    ServiceWorkerRegistration.jsx
  screens/                # pantallas de producto (usan el design system + props con datos reales)
  lib/
    supabase/               client.js, server.js, middleware.js (@supabase/ssr)
    getMyActiveClubBook.js, formatRelativeTime.js
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
                           003_fix_club_creation.sql (el creador puede leer su club)
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

**Setup de la base:** correr en orden `supabase/schema.sql`, `supabase/migrations/002_app_additions.sql` y `supabase/migrations/003_fix_club_creation.sql`. `supabase/verificar-setup.sql` chequea que las tres estén aplicadas (todas las filas deben decir OK). Para probar sin esperar mails, desactivar **Confirm email** en Authentication → Sign In / Providers; antes de abrir al público conviene reactivarlo (la ruta `/auth/callback` ya está lista para recibir esos links).

### Limitaciones conocidas

- **El descubrimiento social no funciona todavía.** El recuadro "otros clubes están leyendo este libro" y la solapa "Otros clubes" de Novedades siempre salen vacíos: la política RLS de `club_books` solo deja ver los clubes propios, así que las consultas a otros clubes devuelven 0 filas. Hace falta una vista/política que exponga de forma acotada (sin datos privados) qué libros están leyendo otros clubes.
- **Los clubes arrancan con un solo capítulo.** `createClub` crea "Cap. 1" y no hay UI para agregar más, así que el modal de progreso siempre ofrece esa única opción. Falta ABM de capítulos.
- **Unirse a un club es pegando su UUID** — no hay links de invitación ni QR. El UUID funciona como token de invitación (no se puede adivinar), pero la experiencia es mala.
- Un usuario pertenece a **un solo club** (`src/lib/getMyActiveClubBook.js` toma el primero). Multi-club implica sacar `.limit(1)`/`.maybeSingle()` y agregar un selector de club en el shell.
- **Comentarios de voz** (`VoiceNotePlayer`) están en el design system pero no se pueden crear desde la UI — falta subida de audio (Supabase Storage) y transcripción.
- **Descubrir** sigue siendo contenido de ejemplo hardcodeado — no hay tabla editorial.
- El modal de progreso no guarda "cita destacada" ni "nota" (esos campos del mock no tienen columna en `reading_progress`).

## Sistema de diseño

Paleta **Electric Coral** sobre fondo crema: coral (`--accent-500`) = progreso/acciones primarias, dorado (`--gold-500`) = citas destacadas/contenido editorial, verde (`--success`) = actividad social (otros clubes, feed). Tipografía Bricolage Grotesque (headlines) + Plus Jakarta Sans (UI/cuerpo). Íconos vía [Lucide](https://lucide.dev) (`lucide-react`).

Ver `design-reference/readme.md` para el detalle completo de fundamentos visuales y contenido, y las notas de **sustitución** — este sistema de diseño se armó desde un brief sin logo, fuentes propias ni set de íconos, así que ningún wordmark/tipografía/ícono actual debe tratarse como marca final:

- **Logo**: no hay. El nombre se renderiza en texto plano donde iría un isotipo.
- **Íconos PWA** (`public/icons/*.png`): placeholders generados (círculo crema sobre fondo coral), no un logo real.
- **Fuentes**: Bricolage Grotesque / Plus Jakarta Sans cargadas desde Google Fonts (`design-system/tokens/typography.css`) — swap directo si hay tipografías con licencia propia.
