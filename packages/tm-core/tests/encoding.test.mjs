import assert from 'node:assert/strict'
import {
  encodeBase64, decodeBase64, encodeUrl, decodeUrl, escapeHtml, unescapeHtml,
  encodeHex, decodeHex, encodeBinary, decodeBinary, rot13, reverseText,
  md5, sha256, decodeJwt, encodeJwt, generateHexKey, runHash
} from '../dist/index.js'

// Round-trips: the point of a codec is that decode(encode(x)) === x.
const unicode = 'Xin chào 👋 — 你好'

assert.equal(decodeBase64(encodeBase64(unicode)), unicode, 'base64 survives non-ASCII')
assert.equal(decodeUrl(encodeUrl(unicode)), unicode, 'url encoding round-trips')
assert.equal(unescapeHtml(escapeHtml(`<a href="x">'&'</a>`)), `<a href="x">'&'</a>`, 'html entities round-trip')
assert.equal(decodeHex(encodeHex(unicode)), unicode, 'hex survives non-ASCII')
assert.equal(decodeBinary(encodeBinary('AB')), 'AB', 'binary round-trips')

assert.equal(rot13(rot13('Hello')), 'Hello', 'rot13 is its own inverse')
assert.equal(rot13('Hello'), 'Uryyb', 'rot13 shifts by thirteen')
assert.equal(reverseText('abc'), 'cba', 'reverse')
assert.equal(reverseText('a👋b'), 'b👋a', 'reverse keeps surrogate pairs whole')

// Known-answer hashes: a wrong implementation still produces a hash.
assert.equal(md5(''), 'd41d8cd98f00b204e9800998ecf8427e', 'md5 of empty string')
assert.equal(md5('abc'), '900150983cd24fb0d6963f7d28e17f72', 'md5 of abc')
assert.equal(
  await sha256('abc'),
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  'sha256 of abc'
)
assert.equal(await runHash('MD5', 'abc'), md5('abc'), 'runHash routes MD5 to the local implementation')

// A key is hex of the requested length and is not the same twice.
const key = generateHexKey(32)
assert.match(key, /^[0-9a-f]{32}$/, 'a 32-char key is 32 hex digits')
assert.notEqual(generateHexKey(32), generateHexKey(32), 'two keys differ')

// JWT: unsigned round-trip, and a malformed token reports rather than throws.
const unsigned = await encodeJwt({ sub: 'abc' }, { algorithm: 'none' })
const decoded = decodeJwt(unsigned)
assert.equal(decoded.valid, true, 'an unsigned token decodes')
assert.equal(decoded.payload.sub, 'abc', 'the payload survives')
assert.equal(decoded.header.alg, 'none', 'the header records the algorithm')

const signed = await encodeJwt({ sub: 'abc' }, { secret: 'k' })
assert.equal(decodeJwt(signed).header.alg, 'HS256', 'a secret implies HS256')
assert.notEqual(signed.split('.')[2], '', 'HS256 carries a signature')

assert.equal(decodeJwt('not-a-jwt').valid, false, 'a malformed token is reported, not thrown')
assert.equal(decodeJwt('not-a-jwt').error, 'invalid_format', 'and names the reason')

// Errors are errors: a form validator wants a throw, not a silent passthrough.
assert.throws(() => decodeHex('abc'), /even length/, 'odd-length hex throws')
assert.throws(() => decodeBinary('2'), /Invalid binary byte/, 'a non-binary byte throws')
assert.throws(() => decodeBase64('!!!not base64!!!'), Error, 'invalid base64 throws')

console.log('encoding: all assertions passed')
