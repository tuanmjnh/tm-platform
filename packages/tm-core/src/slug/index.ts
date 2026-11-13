export const toSlug = (str: string): string => {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const toCode = (str: string): string => toSlug(str).replace(/-/g, '_').toUpperCase()

export const toNormalize = (string: string): string => {
  if (!string) return ''
  return string
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
}

export const generateEan13 = (): string => {
  const digits: number[] = []
  for (let i = 0; i < 12; i++) digits.push(Math.floor(Math.random() * 10))

  let sum = 0
  for (let i = 0; i < 12; i++) sum += digits[i]! * (i % 2 === 0 ? 1 : 3)

  digits.push((10 - (sum % 10)) % 10)
  return digits.join('')
}
