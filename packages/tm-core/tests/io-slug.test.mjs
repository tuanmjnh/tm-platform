import assert from 'node:assert/strict'
import { readCsv, readJson, downloadFile, toSlug, toCode, toNormalize, generateEan13, minifySvg } from '../dist/index.js'

const csv = '\ufeffname,qty\n"Widget, large",3\nBolt,5\nbroken-line\n'
const rows = readCsv(csv)
assert.equal(rows.length, 2, 'the BOM is stripped and malformed rows are skipped')
assert.equal(rows[0].name, 'Widget, large', 'a quoted comma stays inside the field')
assert.equal(rows[1].qty, '5')

assert.deepEqual(readJson('[1,2]'), [1, 2])
assert.deepEqual(readJson('{"a":1}'), [{ a: 1 }], 'a bare object is wrapped in an array')
assert.throws(() => readJson('{bad'), 'invalid json still throws for the caller to handle')

await downloadFile('https://example.com/a.png')
console.log('downloadFile returned without a document (guarded)')

assert.equal(toSlug('  Đồ Án  Tốt Nghiệp!  '), 'do-an-tot-nghiep')
assert.equal(toCode('Đồ Án'), 'DO_AN')
assert.equal(toNormalize('  Đồ Án  '), 'do an')
assert.equal(toNormalize(''), '')

const ean = generateEan13()
assert.match(ean, /^\d{13}$/, 'ean13 is 13 digits')
const digits = [...ean].map(Number)
const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
assert.equal(digits[12], (10 - (sum % 10)) % 10, 'the checksum digit is correct')

assert.equal(minifySvg('<svg>  <!-- c -->  <rect/>  </svg>'), '<svg><rect/></svg>')

console.log('tm-core io and slug tests passed')
