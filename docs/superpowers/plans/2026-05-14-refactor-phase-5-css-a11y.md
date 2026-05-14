# Refactor Phase 5 — CSS cleanup + a11y

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.
> Strategy doc: `docs/superpowers/specs/2026-05-14-codebase-refactor-strategy.md`
> Best after Phases 1, 3 (less dead code to organize; lint will catch JSX changes).

**Goal:** Tokenize the 15+ hardcoded color values scattered through `app/globals.css`, fix the WCAG-failing `--ink-faint`, eliminate the `SiteNav` `!important` smell by moving inline styles into a CSS class, add the `<main>` landmark + graph-button focus styles + `@media (hover: hover)` wrappers that were missed, and add a top-of-file table of contents to the 1,160-line `globals.css`.

**Architecture:** Keep the single `globals.css` file — at this scale the overhead of CSS Modules or co-located component CSS isn't worth it. Reorganize with clear section banners and a TOC.

**Tech Stack:** No new dependencies.

---

## File structure

| Action | Path |
|---|---|
| Modify | `app/globals.css` (tokens, reorg, focus, hover-media, contrast fix) |
| Modify | `components/SiteNav.tsx` (drop inline styles, add `.wos-nav` content) |
| Modify | `app/layout.tsx` (`<main>` landmark) |

---

## Task 1 — Tokenize hardcoded colors

**Files:** `app/globals.css`

- [ ] **Step 1: Add new tokens to `:root` and dark themes**

Find the `:root { ... }` block at the top of `globals.css`. Add:

```css
:root {
  /* ...existing vars... */
  --paper-warm: #fff8e8;          /* on-dark / inverted text */
  --gx-overlay: rgba(8, 6, 12, 0.78);
}

[data-tone="terminal"] {
  /* ...existing... */
  --paper-warm: #d8f0c8;          /* on-dark in terminal theme */
  --gx-overlay: rgba(0, 0, 0, 0.85);
}

[data-tone="document"] {
  /* ...existing... — inherit from :root if same */
}
```

Pick values that match the spirit of the existing themes. Verify by spot-checking a couple of `.gx-*` panels in browser after migration.

- [ ] **Step 2: Replace `#fff8e8` occurrences**

```bash
grep -n "#fff8e8" app/globals.css
```

There should be 9 hits. For each, replace `#fff8e8` with `var(--paper-warm)`. Do not change `:root` itself (the var definition stays as the literal hex).

- [ ] **Step 3: Replace `rgba(8, 6, 12, 0.78)` occurrences**

```bash
grep -n "rgba(8, 6, 12" app/globals.css
```

Replace each with `var(--gx-overlay)`.

- [ ] **Step 4: Replace inlined `--accent-2` value at `.gx-panel-cta`**

Search for `hsl(260, 55%, 38%)` in `globals.css`. Replace with `var(--accent-2)`. (If `--accent-2` isn't defined, define it in `:root` to that value.)

- [ ] **Step 5: Verify**

```bash
npm run build 2>&1 | tail -3
```

In a browser: switch through all themes (default / document / terminal). Spot-check the graph dark panel and the album-art initials text — colors should look identical to before. Any color that drifted → adjust the dark-theme override in Step 1.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
CSS: tokenize hardcoded colors

#fff8e8 (9x) → --paper-warm
rgba(8, 6, 12, 0.78) (6x) → --gx-overlay
hsl(260, 55%, 38%) → --accent-2

Themes can now override these consistently instead of relying on the
default values being baked into rules across the file.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Bump `--ink-faint` for WCAG AA contrast

**Files:** `app/globals.css`

- [ ] **Step 1: Compute new values**

Current: `--ink-faint: #8a8275` on `--paper: #ebe5d6` ≈ 3.0:1 (fails AA at 10–11px).

Proposed:
- Default theme: `--ink-faint: #6e6757` (≈ 4.5:1 vs `#ebe5d6`)
- Terminal theme: `--ink-faint: #5e9059` (≈ 4.5:1 vs `#0a0c08`)

**Verify with a contrast checker** (e.g. https://webaim.org/resources/contrastchecker/) before committing. Adjust if the proposed values miss the threshold.

- [ ] **Step 2: Edit `globals.css`**

In `:root` and `[data-tone="terminal"]`, update `--ink-faint` to the values above.

- [ ] **Step 3: Verify visual impact**

In a browser at `/`, switch themes. The `.micro`, `.feed-handle-meta`, `.feed-active-count`, `.feed-act-year` text will look slightly darker. Confirm it's still tasteful (not muddy). If too heavy, dial back one shade and re-check contrast — but don't cross back into failing territory.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
A11y: --ink-faint passes WCAG AA at small text sizes

Was ~3.0:1, now ~4.5:1 for both default and terminal themes. Affects
.micro, .feed-handle-meta, .feed-active-count, .feed-act-year and any
other small-text users of --ink-faint.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Move `SiteNav` inline styles → `.wos-nav` CSS class

**Files:** `components/SiteNav.tsx`, `app/globals.css`

- [ ] **Step 1: Read `components/SiteNav.tsx`** to identify all inline `style={{...}}` objects (most live on the `<nav>` and the `<Link>` elements).

- [ ] **Step 2: Add a `.wos-nav` rule (and friends) to `globals.css`**

Find an empty area near the top of the component-styles section. Add:

```css
/* Site nav — sticky top bar across every route. */
.wos-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 11px;
}

.wos-nav-link {
  color: var(--ink-soft);
  text-decoration: none;
  letter-spacing: 0.06em;
}
.wos-nav-link:hover { color: var(--ink); }
.wos-nav-link.is-active { color: var(--ink); text-decoration: underline; text-decoration-color: var(--accent); }

.wos-nav-version {
  margin-left: auto;
  color: var(--ink-faint);
  font-size: 10px;
}

@media (max-width: 720px) {
  .wos-nav { padding: 10px 14px; gap: 10px; font-size: 10px; }
}
```

(Adjust to match the actual current visual — read the inline styles in `SiteNav.tsx` and translate field-by-field. Do not invent new design.)

- [ ] **Step 3: Delete the existing mobile-overrides block at `globals.css:475-478`**

It used `!important` only because the base styles were inline. With the base styles now in `.wos-nav`, the override is redundant.

- [ ] **Step 4: Edit `components/SiteNav.tsx`**

Delete every `style={{...}}` on the `<nav>` and `<Link>` elements. Replace with class names:
- `<nav>` → `<nav className="wos wos-nav" aria-label="primary">`
- Each link → `<Link className={\`wos-nav-link \${isActive ? "is-active" : ""}\`}>`
- The version span → `<span className="wos-nav-version">v0.1</span>`

(Drop the date if Phase 1 didn't already.)

- [ ] **Step 5: Verify**

```bash
npm run lint && npx tsc --noEmit && npm run build 2>&1 | tail -3
```

In a browser: navigate to `/`, `/graph`, `/timeline`, `/band/slowdive`. Confirm the nav looks identical to before, the active-link styling works, and the mobile breakpoint at 720px is correct.

- [ ] **Step 6: Commit**

```bash
git add components/SiteNav.tsx app/globals.css
git commit -m "$(cat <<'EOF'
Refactor: SiteNav inline styles → .wos-nav class

Base nav styles were inline, so mobile overrides at globals.css:475-478
needed !important to win specificity. Move the styles into .wos-nav,
.wos-nav-link, .wos-nav-version classes; mobile override no longer
needs !important. Adds aria-label="primary" to the nav landmark.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Add `<main>` landmark

**Files:** `app/layout.tsx`

- [ ] **Step 1: Read `app/layout.tsx`**

Identify the `<div style={{ flex: 1 }}>` (or similar) that wraps `{children}`.

- [ ] **Step 2: Replace with `<main>`**

```tsx
<main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
  {children}
</main>
```

(Or move the inline style into a `.wos-main` class for consistency with Task 3 — operator's choice.)

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && npm run build 2>&1 | tail -3
```

In browser: confirm visual is identical and that screen-reader landmark navigation now finds a "main" region.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "A11y: <main> landmark in layout

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Focus visible for graph + hover-media wrappers

**Files:** `app/globals.css`

- [ ] **Step 1: Add `:focus-visible` rule for `.gx-page` buttons**

Find the existing `.wos button:focus-visible` rule (~line 228 in `globals.css`). Below it, add:

```css
.gx-page button:focus-visible,
.gx-page a:focus-visible,
.gx-tile:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.wos a:focus-visible {
  outline: 1px dashed var(--ink);
  outline-offset: 2px;
}
```

(Graph theme is dark; dashed-ink is invisible there. Use solid oxblood for graph contrast.)

- [ ] **Step 2: Wrap missing `:hover` rules in `@media (hover: hover)`**

Search for these in `globals.css`:
- `.feed-menu:hover` (~line 300)
- `.feed-act:hover` (~line 316)
- `.feed-caption-name:hover` (~line 334)
- `.wos a:hover` (~line 144)

For each, wrap the `:hover` rule in `@media (hover: hover) { ... }`. Example transformation:

Before:
```css
.feed-menu:hover { color: var(--ink); }
```

After:
```css
@media (hover: hover) {
  .feed-menu:hover { color: var(--ink); }
}
```

This prevents iOS Safari from "stickying" the hover state after a tap.

- [ ] **Step 3: Verify**

```bash
npm run build 2>&1 | tail -3
```

In browser:
- Tab through the graph view — confirm focus rings appear on `.gx-tile`, `.gx-ctl`, `.gx-reset`.
- On a real iPhone (or Chrome dev tools touch emulation): tap a feed card menu — confirm the hover style does not stick after release.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
A11y: focus-visible for graph + @media (hover: hover) wraps

Graph view (.gx-page) was outside .wos so it inherited no focus-visible
rule — keyboard nav was invisible. Adds an oxblood outline that
contrasts on the dark graph background.

Wraps four missing :hover rules in @media (hover: hover) so iOS Safari
doesn't sticky the hover state after a tap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Decide on `--gap-*` tokens

**Files:** `app/globals.css`

- [ ] **Step 1: Verify they're truly unused**

```bash
grep -n "var(--gap" app/globals.css
```

Expected: zero hits (only the `:root` definitions, no consumers).

- [ ] **Step 2: Choose**

Option A (recommended for now): **Delete** the unused `--gap-lg`, `--gap-md`, `--gap-sm` variables from `:root`. Keeps the var list honest.

Option B: **Adopt** them by replacing 5-10 hardcoded `gap: 14px` / `gap: 18px` / `gap: 6px` rules. More invasive; defer unless it scratches an itch.

Pick A unless you specifically want to standardize spacing now.

- [ ] **Step 3: If A — delete from `:root`**

Remove the three lines from `globals.css`'s `:root` block. Same for any theme overrides if present.

- [ ] **Step 4: Verify + commit**

```bash
npm run build 2>&1 | tail -3

git add app/globals.css
git commit -m "$(cat <<'EOF'
CSS: drop unused --gap-* tokens

--gap-lg/md/sm were defined in :root but never consumed by any rule.
All gaps in the file are hardcoded px. Drop the dead tokens to keep
the var list honest; if we want a spacing scale later, adopt
intentionally instead of leaving placeholders that drift.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Add table of contents to `globals.css`

**Files:** `app/globals.css`

- [ ] **Step 1: Add at the very top of the file**

```css
/* ============================================================================
 * world of shoegaze — global stylesheet
 *
 * Sections (search by header):
 *
 *   1. TOKENS              — :root and [data-tone] CSS variables
 *   2. RESET + BASE        — minimal reset, body/html, font wiring
 *   3. PRIMITIVES          — .btn, .chip, .kicker, .micro, .small, .serif,
 *                            .italic, .rule, .ascii-rule, .fadeup, .album-art
 *   4. SHELF               — .shelf-* settings panel
 *   5. SITE NAV            — .wos-nav*
 *   6. FEED                — .feed-* (cards, toolbar2, active strip, panel,
 *                            mobile drawer)
 *   7. BAND DETAIL         — .wos-band-*
 *   8. TIMELINE            — .tl-*
 *   9. GRAPH               — .gx-*
 *  10. MOBILE OVERRIDES    — @media (max-width: 720px) consolidated at end
 *
 * Conventions:
 *   - All colors come from CSS vars; do not inline hex/rgba values
 *   - Mobile breakpoint is 720px (one canonical value)
 *   - Hover styles wrap in @media (hover: hover) — never bare :hover
 *   - Focus-visible matters; do not strip outlines
 * ============================================================================ */
```

- [ ] **Step 2: Add section banners between blocks** (one-line ===== banners with the section name; adjust positions to the actual content boundaries):

```css
/* === 1. TOKENS ============================================================== */

/* === 2. RESET + BASE ======================================================== */

/* ...etc... */
```

(Don't reorder content — just label what's already there. Reordering is a separate, riskier change to defer until you have a real reason.)

- [ ] **Step 3: Verify**

```bash
npm run build 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
CSS: TOC + section banners in globals.css

The 1,160-line file is reasonably section-banner'd already but lacked
a top-of-file map. Adds a TOC commenting the section order and the
conventions (var-only colors, 720px breakpoint, hover-media wraps,
focus-visible).

No content reordered — just labels added.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Push + verify

- [ ] **Step 1: Final check**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build 2>&1 | tail -5
```

- [ ] **Step 2: Browser smoke (desktop + mobile + theme switch)**

Walk through `/`, `/graph`, `/timeline`, `/band/slowdive` at 1280×800 and 390×844. Switch through all 3 themes via the cogwheel. Confirm:
- No visual regressions
- Nav looks identical
- Graph focus rings visible on Tab
- Tap-and-release on mobile doesn't sticky hover styles
- Small text (`.micro`, etc.) readable in all themes

- [ ] **Step 3: Lighthouse a11y audit (optional but recommended)**

Run Chrome DevTools Lighthouse on `/` — note the a11y score before vs after. Should improve.

- [ ] **Step 4: Push**

```bash
git push origin main 2>&1 | tail -3
```

---

## Acceptance

- `--paper-warm` and `--gx-overlay` tokens defined; ~16 hardcoded color values replaced
- `--ink-faint` passes WCAG AA at small text in default + terminal themes
- `SiteNav` no longer has inline base styles; `.wos-nav` CSS class owns them; `!important` mobile override removed
- `<main>` landmark in layout
- Graph buttons have visible focus rings
- All `:hover` rules wrapped in `@media (hover: hover)`
- `--gap-*` either adopted or deleted (no orphan tokens)
- `globals.css` has a top-of-file TOC + section banners
- All routes render identically in browser; Lighthouse a11y score improved
