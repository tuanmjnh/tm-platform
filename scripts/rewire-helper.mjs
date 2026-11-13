import fs from 'node:fs'

const target = process.argv[2]
if (!target) {
  console.error('usage: node rewire-helper.mjs <path-to-helper.ts>')
  process.exit(1)
}

const MOVED = [
  'toSlug', 'toCode', 'toNormalize', 'generateEan13',
  'minifySvg', 'escapeRegExp',
  'sanitizeSvg', 'getImage', 'cleanImageUrl', 'isRawSvg', 'isIconify',
  'isSpecialImage', 'isImage', 'detectDisplayType', 'ensureForwardSlash',
  'readCsv', 'readJson', 'downloadFile'
]

const src = fs.readFileSync(target, 'utf8')
let out = src

const removeBlock = (text, name) => {
  const start = text.indexOf(`export const ${name} =`)
  if (start === -1) return { text, removed: false }
  let depth = 0
  let i = text.indexOf('{', start)
  if (i === -1) return { text, removed: false }
  let seen = false
  for (; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') { depth++; seen = true }
    else if (ch === '}') {
      depth--
      if (seen && depth === 0) { i++; break }
    }
  }
  // swallow the trailing newline(s) so we do not leave a gap
  while (text[i] === '\n') i++
  return { text: text.slice(0, start) + text.slice(i), removed: true }
}

const removed = []
for (const name of MOVED) {
  const r = removeBlock(out, name)
  if (!r.removed) {
    console.error(`!! could not find ${name} in ${target}`)
    process.exit(1)
  }
  out = r.text
  removed.push(name)
}

// parseCsvLine is private and only readCsv used it; it must go too.
{
  const start = out.indexOf('const parseCsvLine =')
  if (start !== -1) {
    let depth = 0
    let i = out.indexOf('{', start)
    let seen = false
    for (; i < out.length; i++) {
      const ch = out[i]
      if (ch === '{') { depth++; seen = true }
      else if (ch === '}') {
        depth--
        if (seen && depth === 0) { i++; break }
      }
    }
    while (out[i] === '\n') i++
    out = out.slice(0, start) + out.slice(i)
    removed.push('parseCsvLine (private)')
  }
}

// formatTimeAgo keeps its name and its call sites; only the body moves.
{
  const start = out.indexOf('export const formatTimeAgo =')
  if (start === -1) {
    console.error(`!! could not find formatTimeAgo in ${target}`)
    process.exit(1)
  }
  let depth = 0
  let i = out.indexOf('{', start)
  let seen = false
  for (; i < out.length; i++) {
    const ch = out[i]
    if (ch === '{') { depth++; seen = true }
    else if (ch === '}') {
      depth--
      if (seen && depth === 0) { i++; break }
    }
  }
  const replacement = `export const formatTimeAgo = (date: string | Date | number | undefined | null) => {
  const { locale } = useI18n()
  return coreFormatTimeAgo(date, locale.value)
}`
  out = out.slice(0, start) + replacement + out.slice(i)
}

const imports = [
  `import {`,
  `  ${[...MOVED, 'formatTimeAgo as coreFormatTimeAgo'].join(',\n  ')}`,
  `} from '@tuanmjnh/tm-core'`,
  ``,
  `export {`,
  `  ${MOVED.join(',\n  ')}`,
  `} from '@tuanmjnh/tm-core'`,
  ``
].join('\n')

out = imports + '\n' + out

fs.writeFileSync(target, out)
console.log(`rewired ${target}`)
console.log(`  moved to tm-core: ${MOVED.length + 1} functions`)
console.log(`  kept locally: formatTimeAgo (locale wrapper), parseCsvLine removed`)
