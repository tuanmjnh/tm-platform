import assert from 'node:assert/strict'
import { formatDate, formatTimeAgo, formatNumber } from '../dist/index.js'

const iso = '2026-03-05T10:30:00Z'

assert.equal(formatDate(iso, 'vi'), new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }), 'vi uses vi-VN')
assert.equal(formatDate(iso, 'en'), new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }), 'en uses en-US')
assert.equal(formatDate(iso), formatDate(iso, 'vi'), 'omitting the locale keeps the previous vi behaviour')
assert.equal(formatDate(null), '', 'empty input returns empty')
assert.equal(formatDate('not-a-date'), 'Invalid Date', 'an unparsable date is not silently swallowed')

const now = Date.now()
assert.equal(typeof formatTimeAgo(now, 'vi'), 'string', 'vi returns a string')
assert.equal(typeof formatTimeAgo(now, 'en'), 'string', 'en returns a string')
assert.equal(formatTimeAgo(null), '', 'empty input returns empty')
assert.equal(formatTimeAgo('not-a-date'), '', 'an unparsable date returns empty rather than "Invalid Date"')

// Known defect, preserved deliberately: the original maps 'vi' to 'en-VN', which
// is English (Vietnam region), so a Vietnamese UI renders "2 hours ago". Fixing
// it would change visible text in three apps at once, so this wave keeps the
// behaviour and records it instead of changing it silently.
assert.equal(
  formatTimeAgo(now - 7200_000, 'vi'),
  new Intl.RelativeTimeFormat('en-VN', { numeric: 'auto' }).format(-2, 'hour'),
  'vi currently resolves to English, matching the pre-existing behaviour'
)

assert.equal(formatNumber(1234567, undefined, 'vi-VN'), new Intl.NumberFormat('vi-VN').format(1234567))
assert.equal(formatNumber('abc'), '0', 'a non-numeric value becomes 0')
assert.equal(formatNumber(null), '0', 'null becomes 0')

console.log('tm-core format tests passed')
