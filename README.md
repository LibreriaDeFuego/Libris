# Libris

App social para clubes de lectura: progreso de lectura compartido, comentarios (texto, citas destacadas, notas de voz), spoilers colapsables, feed de novedades y una sección editorial ("Descubrir").

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
  migrations/002_app_additions.sql  # trigger de perfil al registrarse + políticas de insert faltantes
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

### Estado actual / próximas limitaciones conocidas

- Un usuario pertenece a **un solo club** por ahora (`src/lib/getMyActiveClubBook.js` toma el primero). Multi-club es una extensión directa: dejar de usar `.limit(1)`/`.maybeSingle()` y agregar selector de club en el shell.
- **Unirse a un club** es pegando su ID (no hay links de invitación amigables ni QR todavía).
- **Comentarios de voz** (`VoiceNotePlayer`) están en el design system pero no se pueden crear desde la UI — falta subida de audio (Supabase Storage) y transcripción.
- **Descubrir** sigue siendo contenido de ejemplo hardcodeado — no hay tabla editorial.
- El modal de progreso no guarda "cita destacada" ni "nota" (esos campos del mock no tienen columna en `reading_progress` todavía).

## Sistema de diseño

Paleta **Electric Coral** sobre fondo crema: coral (`--accent-500`) = progreso/acciones primarias, dorado (`--gold-500`) = citas destacadas/contenido editorial, verde (`--success`) = actividad social (otros clubes, feed). Tipografía Bricolage Grotesque (headlines) + Plus Jakarta Sans (UI/cuerpo). Íconos vía [Lucide](https://lucide.dev) (`lucide-react`).

Ver `design-reference/readme.md` para el detalle completo de fundamentos visuales y contenido, y las notas de **sustitución** — este sistema de diseño se armó desde un brief sin logo, fuentes propias ni set de íconos, así que ningún wordmark/tipografía/ícono actual debe tratarse como marca final:

- **Logo**: no hay. El nombre se renderiza en texto plano donde iría un isotipo.
- **Íconos PWA** (`public/icons/*.png`): placeholders generados (círculo crema sobre fondo coral), no un logo real.
- **Fuentes**: Bricolage Grotesque / Plus Jakarta Sans cargadas desde Google Fonts (`design-system/tokens/typography.css`) — swap directo si hay tipografías con licencia propia.
