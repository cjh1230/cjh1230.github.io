// Contract: `astro preview` serves the existing dist/. Run `pnpm build` first so dist/ is freshly built.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'

const PORT = 4321
const OUT = 'docs/screenshots'
const BASE = `http://localhost:${PORT}`

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const server = spawn(process.execPath, ['node_modules/astro/astro.js', 'preview', '--port', String(PORT)], {
  stdio: 'ignore',
})
await new Promise((r) => setTimeout(r, 3000))

try {
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
  console.log('Screenshots written to', OUT)
} finally {
  server.kill()
}
