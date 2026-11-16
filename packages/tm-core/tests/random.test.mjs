import assert from 'node:assert/strict'
import {
  generatePassword, generatePasswordBatch, generatePin, generateUuid,
  generateToken, generateApiKey, generateUsername, generateUsernameBatch,
  generateEmail, generateName, generateRandomKeyBatch, DEFAULT_PASSWORD_OPTIONS
} from '../dist/index.js'

const pw = generatePassword()
assert.equal(pw.length, 16, 'the default is sixteen characters')
assert.match(pw, /[A-Z]/, 'default options include upper-case')
assert.match(pw, /[a-z]/, 'default options include lower-case')
assert.match(pw, /[0-9]/, 'default options include digits')

// The length is clamped, not trusted: a caller passing 1 gets the floor.
assert.equal(generatePassword({ length: 1 }).length, 4, 'length below the floor is clamped')
assert.equal(generatePassword({ length: 500 }).length, 128, 'length above the ceiling is clamped')
assert.notEqual(generatePassword(), generatePassword(), 'two passwords differ')

const noSymbols = generatePassword({ symbols: false, excludeAmbiguous: true })
assert.doesNotMatch(noSymbols, /[Il1O0o]/, 'ambiguous characters are excluded when asked')

assert.match(generatePin(), /^[0-9]{6}$/, 'a pin is six digits')
assert.equal(generatePin(4).length, 4, 'pin length is honoured')

assert.match(
  generateUuid(),
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  'uuid is v4 and well-formed'
)

const token = generateToken(32)
assert.match(token, /^[A-Za-z0-9_-]+$/, 'a token is url-safe')
assert.doesNotMatch(token, /[+/=]/, 'and carries no base64 padding or symbols')

assert.match(generateApiKey(), /^tm_/, 'an api key is prefixed')
assert.match(generateApiKey('xyz'), /^xyz_/, 'the prefix is a parameter')

assert.match(generateUsername({ style: 'handle' }), /^[a-z]+\.[a-z]+[0-9]*$/, 'handle is adjective.noun')
assert.match(generateUsername({ style: 'email-like' }), /^[a-z]+\.[a-z]+@/, 'email-like carries a domain')
assert.match(generateUsername({ style: 'pin' in {} ? 'handle' : 'name' }), /^[a-z]+[0-9]*$/, 'name style is a single word')

assert.match(generateEmail(), /@/, 'email has an at-sign')
assert.match(generateName(), /^[a-z]+ [A-Z][a-z]+$/, 'a display name is two capitalised words')

assert.equal(generatePasswordBatch(5).length, 5, 'batch honours the count')
assert.equal(generatePasswordBatch(0).length, 1, 'batch clamps to at least one')
assert.equal(generatePasswordBatch(999).length, 50, 'batch clamps to fifty')

const names = generateUsernameBatch(20)
assert.equal(names.length, 20, 'username batch honours the count')
assert.equal(new Set(names).size, 20, 'and every entry is unique')

const keys = generateRandomKeyBatch(3, 32)
assert.equal(keys.length, 3, 'key batch honours the count')
for (const k of keys) assert.match(k, /^[0-9a-f]{32}$/, 'each key is 32 hex digits')

assert.equal(DEFAULT_PASSWORD_OPTIONS.length, 16, 'the exported default is the one used')

console.log('random: all assertions passed')
