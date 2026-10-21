// Contract: `astro preview` serves the existing dist/. Run `pnpm build` first so dist/ is freshly built.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'

// Default away from the dev-server port so a running `astro dev` cannot be captured by mistake.
const PORT = Number(process.env.SCREENSHOT_PORT ?? 4322)
const OUT = 'docs/screenshots'
// Use the IPv4 address explicitly: on Windows `localhost` can resolve to ::1,
// which may belong to a different dev server on the same port.
const BASE = `http://127.0.0.1:${PORT}`

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const server = spawn(
  process.execPath,
  ['node_modules/astro/astro.js', 'preview', '--port', String(PORT), '--host', '127.0.0.1'],
  { stdio: 'ignore' },
)

async function waitForServer(timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE)
      if (res.ok) return
    } catch {
      /* server not up yet */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Preview server did not start on ${BASE}. Is port ${PORT} already in use?`)
}

try {
  await waitForServer()

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
    // Scroll through first so IntersectionObserver reveals below-fold content.
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.6)
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 100))
      }
      window.scrollTo(0, 0)
      await new Promise((r) => setTimeout(r, 300))
    })
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
    await ctx.close()
  }

  await shot('light', 0, '/', 'home-light')
  await shot('dark', 0, '/', 'home-dark')
  await shot('light', 0, '/posts/embedded/yuv0', 'post-light')
  await shot('light', 0, '/archives', 'archives-light')

  await browser.close()
  console.log('Screenshots written to', OUT)
} finally {
  server.kill()
}
