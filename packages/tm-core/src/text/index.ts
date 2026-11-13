export const minifySvg = (svg: string): string => {
  return svg
    .trim()
    .replace(/<!--.*?-->/gs, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .replace(/\r?\n|\r/g, '')
}

export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
