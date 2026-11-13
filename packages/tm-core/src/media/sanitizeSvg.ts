import { escapeRegExp } from '../text/index.js'

export const sanitizeSvg = (svg: string, prefix?: string): string => {
  if (!svg || typeof svg !== 'string') return ''
  let content = svg.trim()

  const svgMatch = content.match(/<svg[^>]*>/i)
  if (!svgMatch) return content

  const openingTag = svgMatch[0]
  let sanitizedTag = openingTag
    .replace(/\s+(width|height)=["'][^"']*["']/gi, '')
    .replace(/\s+(width|height)=[^ >"']+/gi, '')

  if (!/viewBox=/i.test(openingTag)) {
    const wMatch = openingTag.match(/\bwidth=["']?(\d+(?:\.\d+)?)(?:px)?["']?/i)
    const hMatch = openingTag.match(/\bheight=["']?(\d+(?:\.\d+)?)(?:px)?["']?/i)
    if (wMatch && hMatch) {
      sanitizedTag = sanitizedTag.replace(/<svg/i, `<svg viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`)
    }
  }

  content = content.replace(openingTag, sanitizedTag)

  for (const match of Array.from(content.matchAll(/filter=["']url\(#([^)'"]+)\)["']/gi))) {
    const filterId = match[1]!
    if (!new RegExp(`<filter[^>]*id=["']${escapeRegExp(filterId)}["']`, 'i').test(content)) {
      content = content.replace(match[0], '')
    }
  }

  const isClient = typeof globalThis !== 'undefined' && 'window' in globalThis
  const effectivePrefix = prefix || (isClient ? `s-${Math.random().toString(36).slice(2, 8)}` : undefined)
  if (effectivePrefix) {
    const cleanPrefix = effectivePrefix.replace(/[^a-zA-Z0-9_-]/g, '')
    const idMatches = Array.from(content.matchAll(/\bid=["']([^"']+)["']/gi))
    for (const match of idMatches) {
      const oldId = match[1]
      if (!oldId) continue
      const newId = `${cleanPrefix}-${oldId}`
      const escaped = escapeRegExp(oldId)
      content = content
        .replace(new RegExp(`\\bid=["']${escaped}["']`, 'gi'), `id="${newId}"`)
        .replace(new RegExp(`url\\(\\s*['"]?#${escaped}['"]?\\s*\\)`, 'gi'), `url(#${newId})`)
        .replace(new RegExp(`\\bhref=["']#${escaped}["']`, 'gi'), `href="#${newId}"`)
        .replace(new RegExp(`\\bxlink:href=["']#${escaped}["']`, 'gi'), `xlink:href="#${newId}"`)
    }
  }

  return content
}
