import assert from 'node:assert/strict'
import { sanitizeSvg } from '../dist/index.js'

const WITH_IDS = '<svg width="24" height="24" viewBox="0 0 24 24"><defs><clipPath id="clip0"><rect width="24" height="24"/></clipPath></defs><g clip-path="url(#clip0)"><path d="M0 0h24v24H0z" fill="url(#grad)"/></g></svg>'

const prefixed = sanitizeSvg(WITH_IDS, 'mv-abc')
assert.ok(prefixed.includes('id="mv-abc-clip0"'), 'clipPath id must be prefixed')
assert.ok(prefixed.includes('url(#mv-abc-clip0)'), 'clip-path url must be rewritten')
assert.ok(!prefixed.includes('id="clip0"'), 'original unprefixed id must be gone')

const other = sanitizeSvg(WITH_IDS, 'mv-xyz')
assert.ok(other.includes('id="mv-xyz-clip0"'), 'a different prefix produces a different id')
assert.notEqual(prefixed, other, 'two instances must not share ids')

assert.ok(!/<svg[^>]*\swidth=/i.test(prefixed), 'width attribute is stripped')
assert.ok(!/<svg[^>]*\sheight=/i.test(prefixed), 'height attribute is stripped')

const noViewBox = '<svg width="48" height="32"><rect/></svg>'
const derived = sanitizeSvg(noViewBox, 'p')
assert.ok(derived.includes('viewBox="0 0 48 32"'), 'viewBox is derived from width/height when absent')

const hasViewBox = '<svg width="48" height="32" viewBox="0 0 10 10"><rect/></svg>'
const kept = sanitizeSvg(hasViewBox, 'p')
assert.ok(kept.includes('viewBox="0 0 10 10"'), 'an existing viewBox is left alone')

const danglingFilter = '<svg viewBox="0 0 8 8"><g filter="url(#missing)"><rect/></g></svg>'
assert.ok(!sanitizeSvg(danglingFilter, 'p').includes('filter='), 'a filter pointing at nothing is removed')

const realFilter = '<svg viewBox="0 0 8 8"><defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter></defs><g filter="url(#blur)"><rect/></g></svg>'
assert.ok(sanitizeSvg(realFilter, 'p').includes('filter="url(#p-blur)"'), 'a filter with a definition survives, and is prefixed')

assert.equal(sanitizeSvg('', 'p'), '', 'empty input returns empty')
assert.equal(sanitizeSvg('<div>not svg</div>', 'p'), '<div>not svg</div>', 'non-svg content passes through')

const hrefSvg = '<svg viewBox="0 0 8 8"><defs><linearGradient id="g"><stop/></linearGradient></defs><use href="#g"/><use xlink:href="#g"/></svg>'
const hrefOut = sanitizeSvg(hrefSvg, 'z')
assert.ok(hrefOut.includes('href="#z-g"'), 'plain href reference is rewritten')
assert.ok(hrefOut.includes('xlink:href="#z-g"'), 'xlink:href reference is rewritten')

console.log('tm-core sanitizeSvg tests passed')
