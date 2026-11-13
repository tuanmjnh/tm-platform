import { toSlug } from '../slug/index.js'
import { isIconify, isRawSvg } from '../media/image.js'

const KNOWN_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf', 'mp3', 'mp4', 'zip', 'json', 'csv']

const parseCsvLine = (line: string): string[] => {
  const result: string[] = []
  let startValueIndex = 0
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      let value = line.substring(startValueIndex, i)
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/""/g, '"')
      result.push(value)
      startValueIndex = i + 1
    }
  }

  let lastValue = line.substring(startValueIndex)
  if (lastValue.startsWith('"') && lastValue.endsWith('"')) lastValue = lastValue.slice(1, -1).replace(/""/g, '"')
  result.push(lastValue)

  return result
}

export const readCsv = (csvText: string): Record<string, string>[] => {
  const cleanCsv = csvText.startsWith('\ufeff') ? csvText.slice(1) : csvText
  const lines = cleanCsv.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0] || '')
  const result: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const currentLine = parseCsvLine(lines[i] || '')
    if (currentLine.length !== headers.length) continue
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header.trim()] = currentLine[index]?.trim() || ''
    })
    result.push(row)
  }

  return result
}

export const readJson = (jsonText: string): any[] => {
  const data = JSON.parse(jsonText)
  return Array.isArray(data) ? data : [data]
}

const hasDocument = (): boolean => typeof document !== 'undefined' && !!document.body

const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const cleanFilename = (baseName: string, fallbackExt: string): string => {
  const lastDotIndex = baseName.lastIndexOf('.')
  let namePart = baseName
  let extPart = fallbackExt

  if (lastDotIndex > 0) {
    const possibleExt = baseName.substring(lastDotIndex + 1).toLowerCase()
    if (KNOWN_EXTENSIONS.includes(possibleExt)) {
      namePart = baseName.substring(0, lastDotIndex)
      extPart = possibleExt
    }
  }

  return `${toSlug(namePart)}.${extPart}`
}

const extensionFromContentType = (contentType: string | null, fallback: string): string => {
  if (!contentType) return fallback
  if (contentType.includes('image/png')) return 'png'
  if (contentType.includes('image/jpeg')) return 'jpg'
  if (contentType.includes('image/gif')) return 'gif'
  if (contentType.includes('image/webp')) return 'webp'
  if (contentType.includes('image/svg+xml')) return 'svg'
  if (contentType.includes('application/pdf')) return 'pdf'
  if (contentType.includes('audio/')) return contentType.split('/')[1] || 'mp3'
  if (contentType.includes('video/')) return contentType.split('/')[1] || 'mp4'
  return fallback
}

export const downloadFile = async (url: string, filename?: string): Promise<void> => {
  if (!url) return
  if (!hasDocument()) return

  const urlExtMatch = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i)
  let ext = urlExtMatch ? urlExtMatch[1]! : 'bin'

  if (isRawSvg(url)) {
    saveBlob(new Blob([url], { type: 'image/svg+xml' }), cleanFilename(filename || 'image', 'svg'))
    return
  }

  if (isIconify(url)) return

  try {
    const response = await fetch(url)
    const blob = await response.blob()
    ext = extensionFromContentType(response.headers.get('content-type'), ext)
    saveBlob(blob, cleanFilename(filename || 'download', ext))
  } catch {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.download = cleanFilename(filename || 'download', ext)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
