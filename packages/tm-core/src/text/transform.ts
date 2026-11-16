/**
 * Text transformations — pure string helpers, no platform access.
 *
 * Two groups are deliberately different from `codec/encoding.ts`:
 * the Base64/URL/HTML helpers here are *lenient* (they return the input
 * unchanged instead of throwing), because the text-utility UI applies them to
 * whatever the user pasted. That difference is preserved on purpose: the
 * encoding module's strict versions are what a form validator wants, these are
 * what a "try it" button wants.
 */

export interface TextStats {
  chars: number
  charsNoSpaces: number
  words: number
  lines: number
  paragraphs: number
  readingTimeMinutes: number
}

export function toUpperCase(text: string): string {
  return text.toUpperCase()
}

export function toLowerCase(text: string): string {
  return text.toLowerCase()
}

export function toCapitalize(text: string): string {
  return text.replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

export function toSentenceCase(text: string): string {
  return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, letter => letter.toUpperCase())
}

function splitWords(text: string): string[] {
  return text
    .trim()
    .replace(/[^\w\s-]/g, '')
    .split(/[\s-_]+/)
    .filter(Boolean)
}

export function toCamelCase(text: string): string {
  const words = splitWords(text)
  const first = words[0]
  if (!first) return ''
  return first.toLowerCase() + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')
}

export function toPascalCase(text: string): string {
  return splitWords(text).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')
}

export function toKebabCase(text: string): string {
  return text
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]+/g, '')
    .toLowerCase()
}

export function toSnakeCase(text: string): string {
  return text
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/[^\w_]+/g, '')
    .toLowerCase()
}

export function toConstantCase(text: string): string {
  return toSnakeCase(text).toUpperCase()
}

export function toAlternatingCase(text: string): string {
  let flag = false
  return text
    .split('')
    .map((char) => {
      if (/[a-zA-Z]/.test(char)) {
        flag = !flag
        return flag ? char.toUpperCase() : char.toLowerCase()
      }
      return char
    })
    .join('')
}

export function toInverseCase(text: string): string {
  return text
    .split('')
    .map((char) => {
      if (char === char.toUpperCase()) return char.toLowerCase()
      return char.toUpperCase()
    })
    .join('')
}

export function removeVietnameseAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

/**
 * Slug for the text utility, which treats `_` as a separator so
 * `hello_world` becomes `hello-world`. `slug/index.ts`'s `toSlug` deletes the
 * underscore instead, so the two are not interchangeable and carry distinct
 * names rather than one pretending to be the other.
 */
export function slugify(text: string): string {
  return removeVietnameseAccents(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function cleanSpaces(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim().replace(/\s+/g, ' '))
    .join('\n')
}

export function removeEmptyLines(text: string): string {
  return text
    .split('\n')
    .filter(line => line.trim().length > 0)
    .join('\n')
}

export function removeDuplicateLines(text: string): string {
  const lines = text.split('\n')
  const seen = new Set<string>()
  const result: string[] = []
  for (const line of lines) {
    if (!seen.has(line)) {
      seen.add(line)
      result.push(line)
    }
  }
  return result.join('\n')
}

export function sortLinesAsc(text: string): string {
  return text
    .split('\n')
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .join('\n')
}

export function sortLinesDesc(text: string): string {
  return text
    .split('\n')
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))
    .join('\n')
}

export function reverseLines(text: string): string {
  return text.split('\n').reverse().join('\n')
}

export function reverseCharacters(text: string): string {
  return Array.from(text).reverse().join('')
}

export function numberLines(text: string): string {
  const lines = text.split('\n')
  const pad = String(lines.length).length
  return lines.map((line, idx) => `${String(idx + 1).padStart(pad, ' ')}. ${line}`).join('\n')
}

/** Lenient Base64: unencodable input passes through unchanged. */
export function encodeBase64Safe(text: string): string {
  try {
    const bytes = new TextEncoder().encode(text)
    const binString = Array.from(bytes, b => String.fromCharCode(b)).join('')
    return btoa(binString)
  } catch {
    return text
  }
}

/** Lenient Base64 decode: undecodable input passes through unchanged. */
export function decodeBase64Safe(text: string): string {
  try {
    const binString = atob(text.trim())
    const bytes = Uint8Array.from(binString, m => m.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return text
  }
}

export function encodeUrlSafe(text: string): string {
  return encodeURIComponent(text)
}

export function decodeUrlSafe(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

export function escapeHtmlSafe(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function unescapeHtmlSafe(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, '\'')
}

export function countStats(text: string): TextStats {
  const chars = text.length
  const charsNoSpaces = text.replace(/\s/g, '').length
  const words = text.trim() ? (text.trim().match(/[\p{L}\p{N}]+/gu) || []).length : 0
  const lines = text ? text.split('\n').length : 0
  const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length : 0
  const readingTimeMinutes = Math.ceil(words / 200)

  return {
    chars,
    charsNoSpaces,
    words,
    lines,
    paragraphs,
    readingTimeMinutes
  }
}
