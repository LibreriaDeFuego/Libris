# Libris Design System

Design system for **Libris**, a social app for reading clubs (web + mobile). This is a from-scratch design system: no existing brand codebase, Figma file, or logo was provided — everything here (palette, type, components, screens) was designed from the brief below, then iterated with the user into a bold, vibrant direction.

**Source brief:** product description pasted directly into chat (Spanish), covering the concept (private/public reading clubs, shared progress tracking, comments with quotes/voice notes/spoilers, a novedades feed, and an editorial "Descubrir" section) and 5 target screens. No Figma link, GitHub repo, or asset files were attached.

*Update, v2:* the user found the original warm-literary direction ("v1: cranberry/parchment, Newsreader/Figtree") too flat/dated and asked for a more modern, vibrant redesign. After reviewing 6 direction options and 4 color-application strategies, they picked **Electric Coral** (coral/gold/green on cream, Bricolage Grotesque + Plus Jakarta Sans) with a **fixed-semantic color strategy**: coral = your reading progress/primary actions, gold = highlighted quotes/featured content, green = social activity (other clubs, feed events) — plus a near-black book card for contrast. All tokens and screens below reflect v2.

## Concept
Users join reading clubs. Each club reads one book at a time, with chapters defined collaboratively. Members track personal per-chapter progress, leave comments (text, highlighted quotes, or transcribed voice notes), and can mark entries as spoilers (collapsed until tapped). The app surfaces which other clubs are reading the same book, a novedades feed for club activity, and an editorial section (guides, author profiles, courses).

## Index
- `styles.css` — root stylesheet, imports all tokens
- `tokens/` — colors, typography, spacing, effects (radius/shadow/motion)
- `guidelines/` — foundation specimen cards (Design System tab)
- `assets/` — logo/illustration assets (see Iconography — none supplied)
- `components/core/` — Button, IconButton, Avatar, Chip, Badge, Icon
- `components/forms/` — Input, Textarea, ProgressBar, Slider
- `components/content/` — BookCard, EditorialCard, Blockquote, VoiceNotePlayer, SpoilerBlock
- `components/navigation/` — Tabs, FilterPills
- `components/feedback/` — Modal
- `ui_kits/circulo/` — click-through recreation of the 5 requested app screens
- `SKILL.md` — portable skill file for using this system in Claude Code

### Components (18)
Avatar, Badge, BookCard, Blockquote, Button, Chip, EditorialCard, FilterPills, Icon, IconButton, Input, Modal, ProgressBar, SpoilerBlock, Slider, Tabs, Textarea, VoiceNotePlayer.

**Intentional additions** (not in the brief, added because the 5 screens needed them): Icon (Lucide wrapper — no icon source existed), Modal (bottom-sheet shell for the progress modal), Avatar (initials fallback, used throughout comment/club UI).

## Content fundamentals
Written in **Spanish (Argentina/Río de Plata voice)** — "vos"-adjacent informal tone, e.g. "Che, este capítulo me voló la cabeza" in sample voice-note transcripts. Copy is warm and conversational, never corporate: event copy reads like a friend's update ("Letras en Vela terminó...", "Martina comentó en Rayuela") rather than a system log. No emoji in UI copy — the spoiler warning and reactions use icons, not emoji, to keep the tone literary rather than playful. Sentence case throughout, no ALL CAPS except tiny category eyebrow labels (Guía/Autor/Curso) which are a deliberate typographic accent, not a shouting style.

## Visual foundations
- **Colors**: bold modern palette on a warm cream page (`--neutral-0` `#FFF8EC`) — electric coral (`--accent-500` `#FF4F32`) drives progress and primary actions, gold (`--gold-500` `#FFC93F`) marks highlighted quotes and featured content, and green (`--success` `#1BAA6B`) is reserved for social/other-club activity. Each color has ONE fixed job — they're not used interchangeably. The current-book card is near-black (`--neutral-900` `#1B1B1F`) with a solid coral cover, for contrast against the cream page.
- **Type**: Bricolage Grotesque (bold, contemporary display) for headlines and book titles; Plus Jakarta Sans (humanist, rounded) for UI chrome and long-form body text.
- **Spacing**: 4px base scale (`--space-1` 2px … `--space-16` 96px), generous padding inside cards (14–16px) to feel unhurried rather than dense.
- **Backgrounds**: flat cream page background; the current-book card is the one deliberate near-black block on each screen. Book covers are solid coral placeholders pending real cover art.
- **Animation**: minimal — a fast (120ms) button press scale-down, a 200ms width transition on progress bars. No bounce or page-transition choreography.
- **Hover/press states**: buttons scale to 0.97 on press; icon buttons swap to a soft accent tint when active/selected.
- **Borders & shadows**: thin (1px), warm-neutral borders; shadows are graphite-tinted (`rgba(27,27,31,…)`) rather than pure black.
- **Corners**: pill-shaped buttons and chips (`--radius-pill`), cards at 16px (`--radius-lg`), the progress-update modal is a bottom sheet with 24px top corners (`--radius-xl`).
- **Cards**: off-white surface (`--surface-card`) with soft shadow; the book card is the one high-contrast black exception, by design.
- **Transparency/blur**: only the modal scrim (`--surface-overlay`, ink at 55% opacity) — no frosted-glass effects elsewhere.
- **Imagery**: no photography supplied. Book covers and editorial images are flat color / gradient placeholders pending real cover art / author photos.

## Iconography
No icon source (font, sprite, or SVG set) was provided in the brief. **Lucide** icons are used via CDN (`https://unpkg.com/lucide@latest`) as the closest neutral, warm-compatible outline icon set — thin stroke weight (1.75px) matches the calm, literary tone better than a filled/bold icon system. Documented substitution: if Libris has its own icon set, swap the `Icon` component's implementation and everything downstream updates. No emoji, no unicode glyphs used as icons anywhere in the kit.

## Fonts — substitution flag
**No font files were provided.** Bricolage Grotesque and Plus Jakarta Sans are loaded from Google Fonts (`tokens/typography.css`, `@import url(...)`) as a considered match for a bold, modern, contemporary voice. If Libris has licensed/brand-specific fonts, please share the `.woff2` files and I'll swap the `@font-face` declarations directly — no other token changes needed.

## Logo
**No logo was provided.** The brand name "Libris" is rendered in plain type wherever a mark would go (see `thumbnail.html`). Do not treat any wordmark rendering here as an official logo — it's a placeholder pending real brand assets.
