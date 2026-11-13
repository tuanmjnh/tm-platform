import assert from 'node:assert/strict'
import {
  getImage, cleanImageUrl, isRawSvg, isIconify, isSpecialImage,
  isImage, detectDisplayType, ensureForwardSlash
} from '../dist/index.js'

assert.equal(getImage(null), '/placeholder.png', 'null falls back to the placeholder')
assert.equal(getImage('https://x/y.png'), 'https://x/y.png', 'a string passes through')
assert.equal(getImage({ url: 'u.png' }), 'u.png', 'the default key is url')
assert.equal(getImage({ image: 'i.png' }, 'image'), 'i.png', 'a custom key is honoured')
assert.equal(getImage({ a: 'a.png', b: 'b.png' }, ['b']), 'b.png', 'an array of keys is honoured')
assert.equal(getImage({}), '/placeholder.png', 'a missing key falls back')

assert.equal(
  cleanImageUrl('https://images.unsplash.com/photo-1?w=800&h=600&q=80'),
  'https://images.unsplash.com/photo-1?q=80',
  'unsplash w/h are stripped, other params survive'
)
assert.equal(cleanImageUrl('data:image/png;base64,AAA'), 'data:image/png;base64,AAA', 'data urls are untouched')
assert.equal(cleanImageUrl('/local/a.png'), '/local/a.png', 'a relative path is untouched')

assert.ok(isRawSvg('<svg><rect/></svg>'))
assert.ok(isRawSvg('<?xml version="1.0"?><svg/>'))
assert.ok(!isRawSvg('/a.svg'), 'a path is not raw svg')
assert.ok(!isRawSvg(null))

assert.ok(isIconify('i-lucide-home'))
assert.ok(isIconify('lucide:home'))
assert.ok(!isIconify('https://x'), 'a url is not an iconify name')
assert.ok(!isIconify('/local.svg'), 'a path is not an iconify name')
assert.ok(!isIconify('<svg/>'), 'raw svg is not an iconify name')

assert.ok(isSpecialImage('a.ico'))
assert.ok(isSpecialImage('a.svg'))
assert.ok(!isSpecialImage('a.png'))

assert.ok(isImage('a.png'))
assert.ok(isImage('https://x/y.webp'))
assert.ok(isImage('/local.jpg'))
assert.ok(!isImage('i-lucide-home'))

assert.equal(detectDisplayType('<svg/>'), 'svg')
assert.equal(detectDisplayType('https://x/a.png'), 'image')
assert.equal(detectDisplayType('i-lucide-home'), 'icon')
assert.equal(detectDisplayType(''), 'icon')

assert.equal(ensureForwardSlash('local/a.png'), '/local/a.png')
assert.equal(ensureForwardSlash('/local/a.png'), '/local/a.png')
assert.equal(ensureForwardSlash('https://x/a.png'), 'https://x/a.png')
assert.equal(ensureForwardSlash('data:x'), 'data:x')

console.log('tm-core media tests passed')
