import { writeFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
const css = execSync(
  `curl -s -A "${UA}" "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap"`,
  { encoding: 'utf8' },
)

// css2 groups each face into a `/* <subset> */` block; parse every @font-face
// rule individually so 400 and 700 (both under "latin") are captured separately.
const faces = [...css.matchAll(/@font-face\s*{([^}]+)}/g)].map((m) => m[1])
const wanted = new Map()
for (const body of faces) {
  const weight = body.match(/font-weight:\s*(400|700)/)?.[1]
  const url = body.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)?.[1]
  if (!weight || !url) continue
  // Prefer the first subset (latin) seen for each weight
  if (!wanted.has(weight)) wanted.set(weight, url)
}

if (!wanted.has('400') || !wanted.has('700')) {
  console.error('Could not find both weights. css head:', css.slice(0, 500))
  process.exit(1)
}

const targets = [
  ['400', 'public/fonts/atkinson-regular.woff2'],
  ['700', 'public/fonts/atkinson-bold.woff2'],
]
for (const [weight, dest] of targets) {
  const url = wanted.get(weight)
  const resp = execSync(`curl -s -A "${UA}" "${url}"`, { maxBuffer: 10 * 1024 * 1024 })
  await writeFile(dest, resp)
  console.log('saved', dest, resp.length, 'bytes')
}
console.log('fonts fetched')
