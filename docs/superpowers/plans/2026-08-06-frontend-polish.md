# Frontend Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Systematically refine the existing comimi-style Astro blog — session-stable accent colors, harmonious light/dark tokens, unified motion language, richer post cards, and targeted performance wins — while preserving the current visual identity.

**Architecture:** Design-token-driven. First extract testable pure logic (accent color selection/mixing), then rewire the theme injection + add a manual accent switcher; then apply the refined motion + component layer; finally performance (KaTeX on-demand, woff2 fonts, image dimensions, Waline lazy-load). Each phase ends with a build + visual screenshot verification.

**Tech Stack:** Astro 4, Tailwind CSS 3, React 18 islands (jotai, framer-motion), pnpm 11, Node 24.

## Global Constraints

- Keep the cream/ivory light theme + deep-indigo dark theme identity (spec: "保留现风格").
- Accent color: first visit picks randomly via `crypto`, then persisted in `localStorage` (key `gyoza-accent`); stable across all pages/refreshes in the same browser. Manual switch lives in the **footer**.
- Motion: every interaction gets exactly one feedback; no double animations. `prefers-reduced-motion` support must be preserved.
- ❌ NO image format conversion (no WebP/AVIF). Images get width/height attributes only.
- ❌ Do NOT replace or remove framer-motion usage.
- Build must pass: `pnpm build` runs `astro check && astro build` — TypeScript errors fail the build.
- Commits: conventional-commit format (commitlint enforced), English messages, no Co-Authored-By.
- `pnpm-workspace.yaml` exists locally with `allowBuilds` approved — do not remove it.

---

## Phase 1 — Tooling & Visual Baseline

### Task 1: Screenshot tooling (visual verification)

**Files:**

- Modify: `package.json` (add devDependency + script)
- Create: `scripts/screenshot.mjs`

**Interfaces:**

- Produces: `node scripts/screenshot.mjs` — builds then starts `astro preview` on port 4321 and writes PNGs to `docs/screenshots/` for home (light), home (dark), a post page, and archives. Used by every later task for visual verification.

- [ ] **Step 1: Add playwright devDependency + script**

```bash
pnpm add -D playwright
```

Add to `package.json` scripts:

```json
"screenshot": "node scripts/screenshot.mjs"
```

- [ ] **Step 2: Create the screenshot script**

`scripts/screenshot.mjs`:

```js
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'

const PORT = 4321
const OUT = 'docs/screenshots'
const BASE = `http://localhost:${PORT}`

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const server = spawn('node_modules/.bin/astro', ['preview', '--port', String(PORT)], {
  stdio: 'ignore',
})
await new Promise((r) => setTimeout(r, 3000))

const browser = await chromium.launch({ channel: 'msedge' })

async function shot(theme, accentIndex, path, name) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  await ctx.addInitScript(
    ({ theme, accentIndex }) => {
      localStorage.setItem('gyoza-theme', theme)
      localStorage.setItem('gyoza-accent', String(accentIndex))
    },
    { theme, accentIndex },
  )
  const page = await ctx.newPage()
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  await ctx.close()
}

await shot('light', 0, '/', 'home-light')
await shot('dark', 0, '/', 'home-dark')
await shot('light', 0, '/posts/embedded/yuv0', 'post-light')
await shot('light', 0, '/archives', 'archives-light')

await browser.close()
server.kill()
console.log('Screenshots written to', OUT)
```

- [ ] **Step 3: Verify baseline screenshots**

Run: `node scripts/screenshot.mjs`
Expected: 4 PNG files under `docs/screenshots/`. Open `home-light.png` — this is the visual baseline (cream theme, red accent #E85D5D old palette).

> Note: `chromium.launch({ channel: 'msedge' })` uses the installed Edge; no browser download. If Edge is missing, fall back to `chromium.launch()` + `pnpm exec playwright install chromium`.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml scripts/screenshot.mjs
git commit -m "chore(tooling): add screenshot script for visual verification"
```

---

### Task 2: Vitest setup + accent utils (TDD)

**Files:**

- Modify: `package.json` (devDependency + test script)
- Create: `vitest.config.ts`
- Create: `src/utils/accent.ts`
- Create: `src/utils/accent.test.ts`

**Interfaces:**

- Produces (consumed by Tasks 4–5):

  - `hexToRgb(hex: string): [number, number, number]`
  - `rgbStr(rgb): string`
  - `mixRgb(a, b, ratio): [number, number, number]`
  - `ACCENTS: { light: string; dark: string }[]`
  - `ACCENT_COUNT: number`
  - `getAccentIndex(): number` (localStorage `gyoza-accent`, clamped)
  - `setAccentIndex(i: number): void`
  - `pickRandomAccentIndex(): number` (crypto)
  - `buildAccentStyle(index: number): string` (full CSS-variable `<style>` text)
  - `resolveImageSize(src: string): { width?: number; height?: number }` — NOT here; lives in `rehypeImage.js` (Task 12).

- [ ] **Step 1: Add vitest + write the failing tests**

```bash
pnpm add -D vitest happy-dom
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'happy-dom', // provides localStorage used by accent utils
  },
})
```

Add to `package.json` scripts:

```json
"test": "vitest run"
```

`src/utils/accent.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  hexToRgb,
  rgbStr,
  mixRgb,
  ACCENT_COUNT,
  getAccentIndex,
  setAccentIndex,
  buildAccentStyle,
} from './accent'

beforeEach(() => localStorage.clear())

describe('hexToRgb', () => {
  it('converts a hex color to rgb components', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0])
    expect(hexToRgb('#00ff00')).toEqual([0, 255, 0])
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 255])
  })
})

describe('mixRgb', () => {
  it('blends two rgb values by ratio', () => {
    expect(mixRgb([0, 0, 0], [255, 255, 255], 0.5)).toEqual([128, 128, 128])
    expect(mixRgb([0, 0, 0], [255, 255, 255], 0)).toEqual([0, 0, 0])
  })
})

describe('accent index storage', () => {
  it('defaults to 0 when nothing stored', () => {
    expect(getAccentIndex()).toBe(0)
  })
  it('round-trips a stored index', () => {
    setAccentIndex(3)
    expect(getAccentIndex()).toBe(3)
  })
  it('clamps out-of-range values', () => {
    setAccentIndex(9999)
    expect(getAccentIndex()).toBe(ACCENT_COUNT - 1)
  })
})

describe('buildAccentStyle', () => {
  it('emits all required css variables', () => {
    const style = buildAccentStyle(0)
    expect(style).toContain('--color-accent:')
    expect(style).toContain('--color-bg-root:')
    expect(style).toContain('--color-bg-surface:')
    expect(style).toContain('--color-text-primary:')
    expect(style).toContain('--color-border-primary:')
    expect(style).toContain("[data-theme='dark']")
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm test`
Expected: FAIL — module `./accent` not found.

- [ ] **Step 3: Implement `src/utils/accent.ts`**

```ts
import { color as themeColor } from '@/config.json'

export type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]
}

export function rgbStr(rgb: Rgb): string {
  return rgb.join(' ')
}

export function mixRgb(a: Rgb, b: Rgb, ratio: number): Rgb {
  const inv = 1 - ratio
  return [
    Math.round(a[0] * inv + b[0] * ratio),
    Math.round(a[1] * inv + b[1] * ratio),
    Math.round(a[2] * inv + b[2] * ratio),
  ]
}

export const ACCENTS = themeColor.accent
export const ACCENT_COUNT = ACCENTS.length

const ACCENT_KEY = 'gyoza-accent'

export function getAccentIndex(): number {
  const raw = Number.parseInt(localStorage.getItem(ACCENT_KEY) ?? '', 10)
  if (Number.isNaN(raw)) return 0
  return Math.min(Math.max(raw, 0), ACCENT_COUNT - 1)
}

export function setAccentIndex(index: number): void {
  const i = Math.min(Math.max(index, 0), ACCENT_COUNT - 1)
  localStorage.setItem(ACCENT_KEY, String(i))
}

export function pickRandomAccentIndex(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0] % ACCENT_COUNT
  }
  return Math.floor(Math.random() * ACCENT_COUNT)
}

export function buildAccentStyle(index: number): string {
  const accent = ACCENTS[Math.min(Math.max(index, 0), ACCENT_COUNT - 1)]
  const light = hexToRgb(accent.light)
  const dark = hexToRgb(accent.dark)
  const surfaceLight = hexToRgb(themeColor.bg.surface.light)
  const surfaceDark = hexToRgb(themeColor.bg.surface.dark)
  const c = (key: string, rgb: Rgb) => `  ${key}: ${rgbStr(rgb)};`

  return `html {
${c('--color-accent', light)}
${c('--color-bg-root', mixRgb(hexToRgb(themeColor.bg.root.light), light, 0.05))}
${c('--color-bg-primary', hexToRgb(themeColor.bg.primary.light))}
${c('--color-bg-secondary', hexToRgb(themeColor.bg.secondary.light))}
${c('--color-bg-surface', surfaceLight)}
${c('--color-text-primary', hexToRgb(themeColor.text.primary.light))}
${c('--color-text-secondary', hexToRgb(themeColor.text.secondary.light))}
${c('--color-border-primary', hexToRgb(themeColor.border.primary.light))}
}
[data-theme='dark'] {
${c('--color-accent', dark)}
${c('--color-bg-root', mixRgb(hexToRgb(themeColor.bg.root.dark), dark, 0.12))}
${c('--color-bg-primary', hexToRgb(themeColor.bg.primary.dark))}
${c('--color-bg-secondary', hexToRgb(themeColor.bg.secondary.dark))}
${c('--color-bg-surface', surfaceDark)}
${c('--color-text-primary', hexToRgb(themeColor.text.primary.dark))}
${c('--color-text-secondary', hexToRgb(themeColor.text.secondary.dark))}
${c('--color-border-primary', hexToRgb(themeColor.border.primary.dark))}
}`
}
```

> The inline script in `AccentColorInjector.astro` (Task 4) and the React switcher (Task 5) both import from this module; Astro bundles it separately per consumer — fine.

- [ ] **Step 4: Run tests — verify they pass**

Run: `pnpm test`
Expected: PASS (all green).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/utils/accent.ts src/utils/accent.test.ts
git commit -m "feat(theme): extract accent color utils with tests"
```

---

## Phase 2 — Color System

### Task 3: Retune color tokens in config

**Files:**

- Modify: `src/config.json` (`color` block)

**Interfaces:**

- Consumes: Task 2's `accent.ts` reads `color.accent`, `color.bg.*`, `color.text.*`, `color.border.*` from `config.json`.

- [ ] **Step 1: Replace the `color` block**

Replace the entire `"color"` object in `src/config.json` with:

```json
"color": {
  "accent": [
    { "light": "#E85D5D", "dark": "#FFB4B4" },
    { "light": "#4A90D9", "dark": "#9CC8FF" },
    { "light": "#E8934A", "dark": "#FFCF9C" },
    { "light": "#2F9E8F", "dark": "#8FDBC9" },
    { "light": "#8A63D2", "dark": "#C9B3FF" },
    { "light": "#E05D86", "dark": "#FFB3CC" },
    { "light": "#4CAF78", "dark": "#A5E8C0" },
    { "light": "#3399C4", "dark": "#8FD4EF" }
  ],
  "bg": {
    "root": { "light": "#faf7ef", "dark": "#10101d" },
    "primary": { "light": "#fffdf5", "dark": "#171724" },
    "secondary": { "light": "#f4efe0", "dark": "#23233a" },
    "surface": { "light": "#ffffff", "dark": "#1e1e32" }
  },
  "text": {
    "primary": { "light": "#2b2b3a", "dark": "#e8e8f2" },
    "secondary": { "light": "#6b6b78", "dark": "#a8a8c0" }
  },
  "border": {
    "primary": { "light": "#e6dfc8", "dark": "#3a3a5e" }
  }
}
```

- [ ] **Step 2: Verify build still passes**

Run: `pnpm build`
Expected: succeeds (config.json is a plain JSON data file; `accent.ts` references new `bg.surface` and `bg.root` keys).

- [ ] **Step 3: Commit**

```bash
git add src/config.json
git commit -m "feat(theme): retune color tokens for harmony"
```

---

### Task 4: Session-stable accent injection

**Files:**

- Modify: `src/components/head/AccentColorInjector.astro`

**Interfaces:**

- Consumes: Task 2's `buildAccentStyle`, `getAccentIndex`, `setAccentIndex`, `pickRandomAccentIndex` from `@/utils/accent`.
- Produces: injects `<style id="accent-color-injector">` in `<head>`; listens for custom event `accent-change` (dispatched by Task 5's switcher) and `astro:after-swap` to re-inject.

- [ ] **Step 1: Rewrite the inline script**

Replace the entire `<script>` block in `AccentColorInjector.astro` with:

```astro
<script>
  // @ts-nocheck -- inline DOM script, not subject to TS strict mode
  import {
    buildAccentStyle,
    getAccentIndex,
    setAccentIndex,
    pickRandomAccentIndex,
  } from '@/utils/accent'

  const STYLE_ID = 'accent-color-injector'

  function inject() {
    // First visit: persist a random accent so it is stable across pages/refreshes
    if (localStorage.getItem('gyoza-accent') === null) {
      setAccentIndex(pickRandomAccentIndex())
    }
    const existing = document.getElementById(STYLE_ID)
    if (existing) existing.remove()
    const $style = document.createElement('style')
    $style.id = STYLE_ID
    $style.textContent = buildAccentStyle(getAccentIndex())
    document.head.appendChild($style)
  }

  inject()
  document.addEventListener('astro:after-swap', inject)
  window.addEventListener('accent-change', inject)
</script>
```

- [ ] **Step 2: Verify build + persistence**

Run: `pnpm build`
Run: `node scripts/screenshot.mjs` then open `docs/screenshots/home-light.png`
Expected: page background is warm cream `#faf7ef`-family; accent is the stored color (accent 0 = coral). Reload the same browser tab — accent does NOT change.

- [ ] **Step 3: Commit**

```bash
git add src/components/head/AccentColorInjector.astro
git commit -m "feat(theme): session-stable accent injection"
```

---

### Task 5: Accent switcher in footer

**Files:**

- Create: `src/components/footer/AccentSwitcher.tsx`
- Modify: `src/components/footer/Footer.astro`
- Modify: `tailwind.config.ts` (add `bg-surface` token)

**Interfaces:**

- Consumes: Task 2's `ACCENTS`, `ACCENT_COUNT`, `getAccentIndex`, `setAccentIndex`; Task 4's `accent-change` event.
- Produces: `<AccentSwitcher client:only="react" />` rendered in footer under the theme switch.

- [ ] **Step 1: Add surface color token to Tailwind**

In `tailwind.config.ts`, inside `backgroundColor`, add:

```ts
surface: 'rgb(var(--color-bg-surface) / <alpha-value>)',
```

- [ ] **Step 2: Create the switcher component**

`src/components/footer/AccentSwitcher.tsx`:

```tsx
import { useState } from 'react'
import { ACCENTS, getAccentIndex, setAccentIndex } from '@/utils/accent'

export function AccentSwitcher() {
  const [active, setActive] = useState(() => getAccentIndex())

  function select(index: number) {
    setAccentIndex(index)
    setActive(index)
    window.dispatchEvent(new CustomEvent('accent-change'))
  }

  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="选择主题强调色">
      {ACCENTS.map((accent, i) => (
        <button
          key={accent.light}
          type="button"
          role="radio"
          aria-checked={i === active}
          aria-label={`强调色 ${i + 1}`}
          onClick={() => select(i)}
          className={`size-5 rounded-full border-2 transition-transform hover:scale-110 ${
            i === active ? 'border-primary scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: accent.light }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Wire into footer**

In `src/components/footer/Footer.astro`, below the theme switch block (`<div class="mt-4 flex justify-center"><ThemeSwitch .../></div>`), add:

```astro
<div class="mt-3 flex justify-center">
  <AccentSwitcher client:only="react" />
</div>
```

And add the import at the top of the frontmatter:

```astro
import {AccentSwitcher} from './AccentSwitcher'
```

- [ ] **Step 4: Verify build + interaction**

Run: `pnpm build`
Run: `node scripts/screenshot.mjs`, open `home-light.png` — the footer shows 8 color dots under the theme switch.
Manual check in `astro dev`: clicking a dot changes the accent across the whole page immediately; after reload the same accent persists.

- [ ] **Step 5: Commit**

```bash
git add src/components/footer/AccentSwitcher.tsx src/components/footer/Footer.astro tailwind.config.ts
git commit -m "feat(theme): add accent color switcher"
```

---

## Phase 3 — Motion Language & Component Polish

### Task 6: Unified scroll-reveal motion

**Files:**

- Modify: `src/styles/animations.css` (`.reveal` stagger-delay support)
- Modify: `src/components/post/PostCard.astro` (switch to `.reveal`)

**Interfaces:**

- Consumes: the `--i` index prop already passed by `PostList.astro`.
- Produces: cards reveal once on scroll with a staggered delay, matching `SectionBlock`'s `.reveal`; no more load-time `animate-stagger-fade-up` on cards.

- [ ] **Step 1: Add stagger-delay support to `.reveal`**

In `src/styles/animations.css`, replace the `.reveal` rule:

```css
/* --- Scroll-triggered reveal --- */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.6s ease-out,
    transform 0.6s ease-out;
  transition-delay: calc(var(--i, 0) * 80ms);
}
.reveal.revealed {
  opacity: 1;
  transform: translateY(0);
}
```

- [ ] **Step 2: Switch PostCard to scroll-reveal**

In `PostCard.astro`, change the `<a>` class list: remove `animate-stagger-fade-up`, keep `reveal` with the existing `--i` style. The class attribute becomes (full redesign happens in Task 7; here only the animation swap):

```astro
<a
  class="block group relative py-8 focus-visible:outline-0 reveal card-lift rounded-lg"
  href={`/posts/${entry.slug}`}
  style={`--i: ${index}`}></a>
```

- [ ] **Step 3: Verify no double animation**

Run: `pnpm build`
Run: `node scripts/screenshot.mjs`, open `home-light.png` — cards are visible (revealed). Scroll in dev server: below-fold cards fade up once when entering viewport; section headers reveal the same way; no card animates twice.

- [ ] **Step 4: Commit**

```bash
git add src/styles/animations.css src/components/post/PostCard.astro
git commit -m "feat(motion): unify scroll-reveal animation language"
```

---

### Task 7: PostCard redesign

**Files:**

- Modify: `src/components/post/PostCard.astro`

**Interfaces:**

- Consumes: `remarkPluginFrontmatter` (words/readingMinutes), `entry.data` (title/summary/cover/date/tags/sticky), `--i` index from `PostList.astro`.
- Produces: refined card — accent left bar on hover, 4:3 cover thumb, date/reading-time badges, tag chips, hover title→accent.

- [ ] **Step 1: Rewrite PostCard**

Replace the entire file body (frontmatter unchanged) with:

```astro
---
import type { CollectionEntry } from 'astro:content'
import RelativeDate from './RelativeDate.astro'

interface Props {
  entry: CollectionEntry<'posts'>
  index?: number
}

const { entry, index = 0 } = Astro.props

const { remarkPluginFrontmatter } = await entry.render()
const tags = entry.data.tags.slice(0, 3)
---

<a
  class="group relative block py-6 px-5 -mx-5 rounded-xl focus-visible:outline-0 reveal card-lift"
  href={`/posts/${entry.slug}`}
  style={`--i: ${index}`}
>
  <!-- accent left bar (hover) -->
  <div
    class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 rounded-full bg-accent transition-all duration-300 group-hover:h-16"
  >
  </div>

  <div class="min-w-0">
    <h2 class="relative text-2xl font-bold transition-colors group-hover:text-accent">
      {entry.data.title}
      {entry.data.sticky > 0 && <i class="ml-2 align-middle iconfont icon-pushpin text-red-500" />}
    </h2>

    {entry.data.summary && <p class="mt-3 text-secondary line-clamp-2">{entry.data.summary}</p>}

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <span
        class="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary"
      >
        <i class="iconfont icon-calendar"></i>
        <RelativeDate date={entry.data.date} />
      </span>
      <span
        class="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary"
      >
        <i class="iconfont icon-timer"></i>
        <span>{Math.ceil(remarkPluginFrontmatter.readingMinutes)} 分钟</span>
      </span>
      {
        tags.map((tag) => (
          <span class="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent">#{tag}</span>
        ))
      }
      <span class="grow"></span>
      <span
        class="flex items-center gap-1 text-sm text-accent opacity-0 transition-opacity group-hover:opacity-100"
      >
        继续阅读
        <i class="iconfont icon-arrow-right arrow-stretch"></i>
      </span>
    </div>
  </div>

  {
    entry.data.cover && (
      <div class="mt-4 size-28 shrink-0 overflow-hidden rounded-lg border border-primary/50">
        <img
          class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          src={entry.data.cover}
          alt={entry.data.title}
          width="112"
          height="112"
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }
</a>
```

> Note: the cover sits below the text block (flex-row on md+ is an option; this stacked layout reads well on all viewports). `arrow-stretch` comes from `animations.css`.

- [ ] **Step 2: Verify build + visuals**

Run: `pnpm build`
Run: `node scripts/screenshot.mjs`, open `home-light.png`
Expected: cards now show date/reading-time badges, tag chips, an accent left bar on hover, title shifts to accent on hover. `astro check` passes (React/Astro types fine).

- [ ] **Step 3: Commit**

```bash
git add src/components/post/PostCard.astro
git commit -m "feat(post): redesign post card"
```

---

### Task 8: Hero accent ring + entrance unification

**Files:**

- Modify: `src/components/hero/Hero.astro`

**Interfaces:**

- Consumes: `author.avatar`, accent CSS vars (via `bg-accent`).
- Produces: avatar wrapped in an accent glow ring with subtle float; subtitle entrance unified to `fade-slide-up`; char-bounce + arrow scroll indicator retained.

- [ ] **Step 1: Update the avatar block**

Replace the avatar `<div>` in `Hero.astro`:

```astro
<div class="mt-20 lg:mt-0 relative">
  <div class="relative size-[200px] lg:size-[300px] group">
    <div
      class="absolute -inset-3 rounded-full bg-accent/20 blur-2xl opacity-70 transition-opacity group-hover:opacity-100"
    >
    </div>
    <div
      class="relative size-full rounded-full overflow-hidden border-2 border-accent/40 bg-gradient-to-br from-white/10 to-black/10 dark:from-zinc-800 dark:to-zinc-900 animate-popup-spring avatar-clickable"
    >
      <img
        class="size-full object-cover transition-transform duration-700 group-hover:scale-105"
        src={author.avatar}
        alt={`${hero.name} 的头像`}
        width="300"
        height="300"
        loading="lazy"
        decoding="async"
      />
    </div>
  </div>
</div>
```

- [ ] **Step 2: Verify build + screenshot**

Run: `pnpm build` then `node scripts/screenshot.mjs`
Open `home-light.png`: avatar has a soft accent halo; `cin` chars bounce in; subtitle fades up. No layout shift.

- [ ] **Step 3: Commit**

```bash
git add src/components/hero/Hero.astro
git commit -m "feat(hero): add accent ring and unify entrance"
```

---

### Task 9: Section header decor + tag/category chips

**Files:**

- Modify: `src/components/SectionBlock.astro`
- Modify: `src/components/TagList.astro`
- Modify: `src/components/CategoryList.astro`

**Interfaces:**

- Consumes: existing props (`title`, `tags`, `categories`).
- Produces: section titles with a fading divider line; tags/categories as rounded chips with count.

- [ ] **Step 1: SectionBlock divider line**

Replace the title row in `SectionBlock.astro`:

```astro
<section>
  <div class="mb-8 flex items-center gap-3 reveal">
    <span class="section-accent"></span>
    <h2 class="font-bold uppercase tracking-widest text-accent">{title}</h2>
    <span class="h-px flex-1 bg-gradient-to-r from-primary to-transparent"></span>
  </div>
  <slot />
</section>
```

- [ ] **Step 2: TagList chips**

In `TagList.astro`, change the inner link container from `rounded-lg` to `rounded-full`:

```astro
<a class="relative block group stretch-hover" href={`/tags/${tag.slug}`}>
  <div
    class="absolute -z-1 inset-0 rounded-full bg-accent/10 group-hover:transition group-hover:bg-accent/20 group-hover:scale-105"
  >
  </div>
  <div class="px-3 py-1.5 text-sm flex items-baseline gap-1 select-none">
    <span>{tag.name}</span>
    {tag.count && <span class="text-xs">({tag.count})</span>}
  </div>
</a>
```

- [ ] **Step 3: CategoryList chips**

In `CategoryList.astro`, change the link container to `rounded-full`:

```astro
<a class="relative block group stretch-hover" href={`/categories/${category.slug}`}>
  <div
    class="absolute -z-1 inset-0 rounded-full bg-accent/10 group-hover:transition group-hover:bg-accent/20 group-hover:scale-105"
  >
  </div>
  <div class="px-3 py-1.5 text-sm flex gap-1 select-none">
    <i class="shrink-0 iconfont icon-folder"></i>
    <span class="grow">{category.name}</span>
    <span class="shrink-0">{category.count}</span>
  </div>
</a>
```

- [ ] **Step 4: Verify build + screenshot**

Run: `pnpm build` + `node scripts/screenshot.mjs`
Open `home-light.png`: section titles have a fading divider; tags/categories are pill-shaped.

- [ ] **Step 5: Commit**

```bash
git add src/components/SectionBlock.astro src/components/TagList.astro src/components/CategoryList.astro
git commit -m "feat(ui): refine section header and tag chips"
```

---

## Phase 4 — Performance

### Task 10: KaTeX on-demand loading

**Files:**

- Modify: `src/layouts/MarkdownLayout.astro`
- Modify: `src/pages/posts/[...slug].astro`

**Interfaces:**

- Produces: `hasMath` prop on `MarkdownLayout`; katex CSS only referenced on posts whose raw body contains `$` math.

- [ ] **Step 1: Detect math and pass through**

In `src/pages/posts/[...slug].astro` frontmatter, after `const { headings, Content, remarkPluginFrontmatter } = await current.render()`:

```ts
const hasMath = /(?<!\\)\$/u.test(current.body ?? '')
```

Pass it to the layout:

```astro
<MarkdownLayout hasMath={hasMath}
title={current.data.title}
...
```

- [ ] **Step 2: Conditionally reference katex CSS in the layout**

In `src/layouts/MarkdownLayout.astro`:

1. Remove the static `import 'katex/dist/katex.min.css'` line.
2. Add to the `Props` interface: `hasMath?: boolean`
3. Destructure `hasMath = false` from `Astro.props`.
4. Add frontmatter:

```astro
let katexCssUrl: string | undefined if (hasMath) {
  (katexCssUrl = (await import('katex/dist/katex.min.css?url')).default)
}
```

5. In the `<Layout>` opening, add the conditional stylesheet link:

```astro
{katexCssUrl && <link rel="stylesheet" href={katexCssUrl} is:inline />}
```

- [ ] **Step 3: Verify katex CSS is absent on non-math pages**

Run: `pnpm build`
Run: `node scripts/screenshot.mjs`
Check the generated HTML for a non-math post (e.g. `/posts/tools/modelsim`):

```bash
grep -o 'katex[^"]*\.css' dist/posts/tools/modelsim/index.html || echo "no katex css referenced"
```

Expected: `no katex css referenced`. For a math post (if any exists), katex CSS IS referenced. The katex font files may remain in `dist/_astro` — that's acceptable; the key win is non-math pages don't request them.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/MarkdownLayout.astro src/pages/posts/[...slug].astro
git commit -m "perf(katex): load katex css only on math posts"
```

---

### Task 11: woff2 fonts

**Files:**

- Modify: `src/styles/global.css`
- Modify: `src/layouts/Layout.astro`
- Create: `scripts/fetch-fonts.mjs`

**Interfaces:**

- Produces: `public/fonts/atkinson-regular.woff2` + `atkinson-bold.woff2`; `@font-face` + preloads point at woff2.

- [ ] **Step 1: Fetch Atkinson woff2 from Google Fonts**

Create `scripts/fetch-fonts.mjs`:

```js
import { writeFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
const css = execSync(
  `curl -s -A "${UA}" "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap"`,
  { encoding: 'utf8' },
)

// css2 response groups each face into `/* <subset> */` comment blocks; inspect each block for its
// font-weight and first gstatic woff2 url.
const blocks = css.split('/*')
for (const block of blocks) {
  const weightMatch = block.match(/font-weight:\s*(400|700)/)
  const urlMatch = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)
  if (!weightMatch || !urlMatch) continue
  const name = weightMatch[1] === '700' ? 'atkinson-bold.woff2' : 'atkinson-regular.woff2'
  const resp = execSync(`curl -s -A "${UA}" "${urlMatch[1]}"`, { maxBuffer: 10 * 1024 * 1024 })
  await writeFile(`public/fonts/${name}`, resp)
  console.log('saved', name, resp.length, 'bytes')
}
console.log('fonts fetched')
```

Run: `node scripts/fetch-fonts.mjs`
Expected: `saved atkinson-regular.woff2` + `saved atkinson-bold.woff2` in `public/fonts/`.

> Fallback if Google Fonts is unreachable: keep existing `.woff` files and skip this task (report to user).

- [ ] **Step 2: Point @font-face at woff2**

In `src/styles/global.css`, change both `src: url('/fonts/...woff')` to `src: url('/fonts/atkinson-regular.woff2') format('woff2')` and `src: url('/fonts/atkinson-bold.woff2') format('woff2')`.

- [ ] **Step 3: Update preloads**

In `src/layouts/Layout.astro`, change both preload links:

```astro
<link rel="preload" as="font" href="/fonts/atkinson-regular.woff2" crossorigin type="font/woff2" />
<link rel="preload" as="font" href="/fonts/atkinson-bold.woff2" crossorigin type="font/woff2" />
```

- [ ] **Step 4: Verify**

Run: `pnpm build`
Check dist:

```bash
ls -la dist/fonts/  # woff2 present, woff2 smaller than old woff
```

Run `node scripts/screenshot.mjs` — text renders (font applied). Old `.woff` files can remain in `public/fonts` (unused) or be deleted; prefer deleting to avoid shipping both.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-fonts.mjs src/styles/global.css src/layouts/Layout.astro public/fonts/atkinson-regular.woff2 public/fonts/atkinson-bold.woff2
git rm public/fonts/atkinson-regular.woff public/fonts/atkinson-bold.woff
git commit -m "perf(fonts): switch Atkinson to woff2"
```

---

### Task 12: Image width/height for local images (TDD)

**Files:**

- Modify: `src/plugins/rehypeImage.js`
- Modify: `package.json` (devDependency `image-size`)
- Create: `src/plugins/rehypeImage.test.ts`

**Interfaces:**

- Produces: exported `resolveImageSize(src): { width?: number; height?: number }`; `rehypeImage` adds `width`/`height` to local `<img>` (src starts with `/`), resolving against `public/`.

- [ ] **Step 1: Add dep + write failing test**

```bash
pnpm add -D image-size
```

`src/plugins/rehypeImage.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { resolveImageSize } from './rehypeImage'

const FIXTURE_DIR = path.join(process.cwd(), 'node_modules/.tmp-image-test')
const FIXTURE = path.join(FIXTURE_DIR, 'fix.png')

// 4x3 1px png
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAACe5tRKAAAAEklEQVR42mP8z8AARAzDgUYgBgD24wQbYwBQlQAAAABJRU5ErkJggg=='

beforeAll(() => {
  writeFileSync(FIXTURE, Buffer.from(PNG, 'base64'))
})

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true })
})

describe('resolveImageSize', () => {
  it('reads dimensions of a local png', () => {
    expect(resolveImageSize(FIXTURE)).toEqual({ width: 4, height: 3 })
  })
  it('returns empty object for missing file', () => {
    expect(resolveImageSize('/does/not/exist.png')).toEqual({})
  })
})
```

- [ ] **Step 2: Run tests — verify fail**

Run: `pnpm test src/plugins/rehypeImage.test.ts`
Expected: FAIL — `resolveImageSize` not exported.

- [ ] **Step 3: Implement**

Replace `src/plugins/rehypeImage.js` with:

```js
import { h } from 'hastscript'
import { visit } from 'unist-util-visit'
import { imageSize } from 'image-size'
import path from 'node:path'
import fs from 'node:fs'

export function resolveImageSize(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const { width, height } = imageSize(filePath)
      if (width && height) return { width, height }
    }
  } catch {
    // ignore unreadable / unsupported images
  }
  return {}
}

export function rehypeImage() {
  return function (tree) {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'p' && node.children.length === 1) {
        const child = node.children[0]
        if (child.tagName === 'img') {
          parent.children[index] = buildFigure(child)
        }
      } else if (node.tagName === 'img') {
        parent.children[index] = buildImage(node)
      }
    })
  }
}

function buildImage(node) {
  const props = { ...node.properties, loading: 'lazy', decoding: 'async' }
  const src = node.properties.src
  if (typeof src === 'string' && src.startsWith('/')) {
    const filePath = path.join(process.cwd(), 'public', src)
    const size = resolveImageSize(filePath)
    if (size.width) props.width = size.width
    if (size.height) props.height = size.height
  }
  return h('img', props)
}

function buildFigure(node) {
  const imgProps = node.properties
  let imgTitle = node.properties.title
  if (imgTitle) {
    imgTitle = imgTitle.trim()
  }
  return h('figure', null, [buildImage(node), imgTitle ? h('figcaption', imgTitle) : null])
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `pnpm test`
Expected: all pass (accent + image tests).

- [ ] **Step 5: Verify build output has width/height**

Run: `pnpm build`

```bash
grep -o '<img[^>]*width="[0-9]*"[^>]*height="[0-9]*"' dist/posts/pytorch/pytorch/index.html | head -3
```

Expected: local images now carry explicit width/height (no CLS on lazy load).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/plugins/rehypeImage.js src/plugins/rehypeImage.test.ts
git commit -m "perf(images): add width/height to local images"
```

---

### Task 13: Lazy-load Waline client

**Files:**

- Modify: `src/components/comment/Waline.tsx`

**Interfaces:**

- Consumes: `@waline/client` (now dynamically imported); existing `serverURL` prop.
- Produces: Waline chunk fetched only when the comments island hydrates (it is rendered `client:visible`).

- [ ] **Step 1: Convert to dynamic imports**

Replace `src/components/comment/Waline.tsx`:

```tsx
import { useEffect, useRef } from 'react'

export function Waline({ serverURL }: { serverURL: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let inst: { destroy?: () => void } | null = null

    Promise.all([import('@waline/client'), import('@waline/client/style')])
      .then(([{ init }]) => {
        if (cancelled || !ref.current) return
        inst = init({
          el: ref.current,
          serverURL,
          dark: "[data-theme='dark']",
          login: 'force',
          imageUploader: false,
          search: false,
          locale: { placeholder: '发条友善的评论吧（支持 Markdown 语法）…' },
          emoji: ['//unpkg.com/@waline/emojis@1.1.0/bilibili'],
        })
      })
      .catch(() => {
        /* waline load failure is non-fatal */
      })

    return () => {
      cancelled = true
      inst?.destroy?.()
    }
  }, [serverURL])

  return <div ref={ref}></div>
}
```

- [ ] **Step 2: Verify build + chunk split**

Run: `pnpm build`

```bash
find dist/_astro -name '*Waline*' -o -name '*waline*' | head
```

Expected: Waline is now a separate async chunk (loaded on demand), no longer part of the eagerly-loaded island graph. Confirm post-page HTML still references the comments island with `client:visible`.

- [ ] **Step 3: Inspect PostCopyright chunk (report-only)**

```bash
ls -la dist/_astro/PostCopyright*
```

If `PostCopyright` still ships ~96K, inspect its imports (`node -e` on the bundle is overkill; instead note that it pulls the toast/modal store + framer-motion shared chunk). Do NOT refactor it in this task — record the finding in the task completion note for the user. Only trim if an obviously-unused dep is found.

- [ ] **Step 4: Commit**

```bash
git add src/components/comment/Waline.tsx
git commit -m "perf(comments): lazy-load waline client"
```

---

## Phase 5 — Final Verification

### Task 14: Build, screenshots, before/after compare, report

**Files:**

- No source changes.

- [ ] **Step 1: Full build + tests**

Run: `pnpm test`
Run: `pnpm build`
Expected: all green.

- [ ] **Step 2: Fresh screenshots**

Run: `node scripts/screenshot.mjs`
Compare `docs/screenshots/home-light.png` against the baseline captured in Task 1. Confirm:

- Accent is session-stable and consistent
- Cards have badges/chips/accent-left-bar
- Section titles have divider lines
- Avatar has accent halo
- Colors are harmonious in light + dark

- [ ] **Step 3: Performance delta**

```bash
du -sh dist && du -sh dist/_astro
grep -o 'katex[^"]*\.css' dist/posts/tools/modelsim/index.html || echo "no katex css on non-math post"
find dist/_astro -name '*Waline*' -o -name '*waline*'
```

Report before/after for: dist total, JS total, non-math pages no longer shipping katex, waline chunk lazy.

- [ ] **Step 4: Commit any leftover changes + final report to user**

```bash
git add -A && git status
```

Commit if anything outstanding:

```bash
git commit -m "chore: final polish verification"
```

- [ ] **Step 5: Update design spec status**

Mark the design doc's success criteria as met in a short note appended to `docs/superpowers/specs/2026-08-06-frontend-polish-design.md` (or leave for the human; do not rewrite the spec).

---

## Self-Review Notes

- **Spec coverage:** color system (Tasks 3–5), motion (Task 6, 8), card polish (Task 7), sidebar/section (Task 9), performance (Tasks 10–13). Image lazy-load already existed in `rehypeImage`; Task 12 adds the missing width/height. Non-goals respected (no WebP, no framer-motion replacement).
- **Type consistency:** `resolveImageSize` returns `{width?, height?}` and is consumed only in `rehypeImage.js`. `buildAccentStyle`/`getAccentIndex`/`setAccentIndex` names used identically across Tasks 2, 4, 5.
- **Placeholders:** none — all code blocks are complete.
