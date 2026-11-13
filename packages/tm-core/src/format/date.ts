const RELATIVE_LOCALE: Record<string, string> = {
  vi: 'en-VN',
  en: 'en-US'
}

const relativeLocale = (locale?: string | null): string => {
  if (!locale) return 'en-VN'
  return RELATIVE_LOCALE[locale] || locale
}

export const formatDate = (
  dateString?: string | number | Date | null,
  locale?: string | null
): string => {
  if (!dateString) return ''
  const intlLocale = locale === 'en' ? 'en-US' : 'vi-VN'
  return new Date(dateString).toLocaleDateString(intlLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export const formatTimeAgo = (
  date: string | Date | number | undefined | null,
  locale?: string | null
): string => {
  if (!date) return ''
  const then = new Date(date).getTime()
  if (Number.isNaN(then)) return ''
  const diff = (Date.now() - then) / 1000

  const rtf = new Intl.RelativeTimeFormat(relativeLocale(locale), { numeric: 'auto' })

  if (diff < 60) return rtf.format(-Math.floor(diff), 'second')
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute')
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), 'hour')
  return rtf.format(-Math.floor(diff / 86400), 'day')
}

export const formatNumber = (
  value: number | string | undefined | null,
  intlOptions?: Intl.NumberFormatOptions,
  locale?: string | null
): string => {
  if (value === undefined || value === null || value === '') return '0'
  const num = Number(value)
  if (Number.isNaN(num)) return '0'
  return new Intl.NumberFormat(locale || 'vi-VN', intlOptions).format(num)
}
