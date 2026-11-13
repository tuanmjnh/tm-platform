// `unknown` rather than a Record type so interface-typed objects (which have no
// index signature) still pass, matching the original `any` signature at call
// sites without losing the narrowing inside.
export const getImage = (img: unknown, customKey?: string | string[] | null): string => {
  if (!img) return '/placeholder.png'
  if (typeof img === 'string') return img

  const keys = Array.isArray(customKey) ? customKey : [customKey || 'url']
  for (const key of keys) {
    const value = (img as Record<string, unknown>)[key]
    if (typeof value === 'string' && value) return value
  }

  return '/placeholder.png'
}

export const cleanImageUrl = (url: string): string => {
  if (!url || typeof url !== 'string' || url.startsWith('data:') || url.startsWith('<svg')) return url

  try {
    const urlObj = new URL(url)
    if (urlObj.hostname.includes('unsplash.com') || urlObj.hostname.includes('cloudinary.com')) {
      const searchParams = urlObj.searchParams
      for (const key of ['w', 'h', 'width', 'height', 'fit', 'crop']) searchParams.delete(key)
      const query = searchParams.toString()
      return urlObj.origin + urlObj.pathname + (query ? '?' + query : '')
    }
  } catch {
    return url
  }

  return url
}

export const isRawSvg = (val?: string): boolean => {
  if (!val || typeof val !== 'string') return false
  const trimmed = val.trim()
  return (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) && trimmed.includes('<svg')
}

export const isIconify = (url?: string): boolean => {
  if (!url) return false
  const value = typeof url === 'string' ? url.trim() : url
  if (value.startsWith('<svg')) return false
  return (value.includes(':') || value.startsWith('i-')) && !value.startsWith('http') && !value.startsWith('/')
}

export const isSpecialImage = (url?: string | null): boolean => {
  if (typeof url !== 'string') return false
  return /\.(ico|svg)$/i.test(url)
}

export const isImage = (url?: string): boolean => {
  if (!url || typeof url !== 'string') return false
  const value = url.trim().toLowerCase()
  if (isSpecialImage(value)) return true
  if (/\.(jpeg|jpg|gif|png|webp)$/.test(value)) return true
  if (value.startsWith('http') || value.startsWith('/')) return true
  return false
}

export type DisplayType = 'svg' | 'image' | 'icon'

export const detectDisplayType = (val?: string): DisplayType => {
  if (!val) return 'icon'
  if (isRawSvg(val)) return 'svg'
  if (isImage(val)) return 'image'
  return 'icon'
}

export const ensureForwardSlash = (url: string): string => {
  if (!url || typeof url !== 'string') return url
  const value = url.trim()
  if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('/') || value.startsWith('<svg')) {
    return value
  }
  return '/' + value
}
