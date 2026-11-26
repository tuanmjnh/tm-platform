import assert from 'node:assert/strict'
import {
  toUpperCase, toLowerCase, toCapitalize, toSentenceCase,
  toCamelCase, toPascalCase, toKebabCase, toSnakeCase, toConstantCase,
  toAlternatingCase, toInverseCase, removeVietnameseAccents, slugify,
  cleanSpaces, removeEmptyLines, removeDuplicateLines,
  sortLinesAsc, sortLinesDesc, reverseLines, reverseCharacters, numberLines,
  encodeBase64Safe, decodeBase64Safe, decodeUrlSafe, escapeHtmlSafe, unescapeHtmlSafe,
  countStats
} from '../dist/index.js'

assert.equal(toUpperCase('ab'), 'AB', 'upper')
assert.equal(toLowerCase('AB'), 'ab', 'lower')
assert.equal(toCapitalize('hello world'), 'Hello World', 'each word capitalised')
assert.equal(toSentenceCase('hello. world'), 'Hello. World', 'sentence starts capitalised')

// `\b` and `\w` are ASCII-only in JavaScript, so a Vietnamese or accented word
// was mangled rather than capitalised: `đây` became `đâY` because `đ` and `â`
// never matched `\w`, and the case helpers that strip non-`\w` characters dropped
// the letters entirely (`đây → y`). These pin the Unicode behaviour.
assert.equal(toCapitalize('đây là câu'), 'Đây Là Câu', 'capitalise keeps đ and â')
assert.equal(toCapitalize('tiếng việt rất đẹp'), 'Tiếng Việt Rất Đẹp', 'every Vietnamese word')
assert.equal(toCapitalize('ñandú es'), 'Ñandú Es', 'accented letters outside Vietnamese too')
assert.equal(toCapitalize('ĐÂY LÀ CÂU'), 'Đây Là Câu', 'a shouting sentence is normalised, not left loud')
assert.equal(toSentenceCase('ĐÂY LÀ CÂU. THỨ HAI ĐÂY!'), 'Đây là câu. Thứ hai đây!', 'only the sentence start stays capital')
assert.equal(toSentenceCase('tiếng việt. rất đẹp'), 'Tiếng việt. Rất đẹp', 'sentence case after a full stop')
assert.equal(toCamelCase('đây là câu'), 'đâyLàCâu', 'camel case keeps Vietnamese letters')
assert.equal(toCamelCase('tiếng việt'), 'tiếngViệt', 'camel case does not strip diacritics')
assert.equal(toKebabCase('Tiếng Việt'), 'tiếng-việt', 'kebab keeps Vietnamese letters')

assert.equal(toCamelCase('hello world-example'), 'helloWorldExample', 'camel')
assert.equal(toPascalCase('hello world'), 'HelloWorld', 'pascal')
assert.equal(toKebabCase('helloWorld'), 'hello-world', 'kebab splits camel humps')
assert.equal(toSnakeCase('helloWorld'), 'hello_world', 'snake splits camel humps')
assert.equal(toConstantCase('hello world'), 'HELLO_WORLD', 'constant')

assert.equal(toAlternatingCase('abcd'), 'AbCd', 'alternating starts upper-case, as the app always rendered it')
assert.equal(toInverseCase('aB'), 'Ab', 'inverse swaps case')

assert.equal(removeVietnameseAccents('Tiếng Việt'), 'Tieng Viet', 'accents are stripped')
assert.equal(slugify('Tiếng Việt 2026!'), 'tieng-viet-2026', 'slug is ascii and hyphenated')
assert.equal(
  slugify('hello_world'),
  'hello-world',
  'the utility treats underscore as a separator — toSlug in slug/ does not'
)

assert.equal(cleanSpaces('  a   b \n  c  '), 'a b\nc', 'spaces collapse per line')
assert.equal(removeEmptyLines('a\n\nb'), 'a\nb', 'blank lines go')
assert.equal(removeDuplicateLines('a\nb\na'), 'a\nb', 'duplicates go, first wins')
assert.equal(sortLinesAsc('b\na'), 'a\nb', 'ascending')
assert.equal(sortLinesDesc('a\nb'), 'b\na', 'descending')
assert.equal(reverseLines('a\nb'), 'b\na', 'lines reversed')
assert.equal(reverseCharacters('abc'), 'cba', 'characters reversed')
assert.equal(numberLines('a\nb'), '1. a\n2. b', 'lines numbered')

// The lenient codecs return the input rather than throwing — that difference
// from codec/ is the reason they carry their own names.
assert.equal(encodeBase64Safe('hello'), 'aGVsbG8=', 'lenient base64 encodes')
assert.equal(decodeBase64Safe('aGVsbG8='), 'hello', 'lenient base64 decodes')
assert.equal(decodeBase64Safe('!!!'), '!!!', 'undecodable input passes through')
assert.equal(decodeUrlSafe('%E0%A4%A'), '%E0%A4%A', 'malformed percent-encoding passes through')
assert.equal(unescapeHtmlSafe(`'`), `'`, 'the apostrophe entity uses &#039; here')
assert.equal(unescapeHtmlSafe(escapeHtmlSafe(`'`)), `'`, 'and round-trips')

const stats = countStats('hello world\nsecond line')
assert.equal(stats.chars, 23, 'chars counts everything')
assert.equal(stats.words, 4, 'words split on whitespace')
assert.equal(stats.lines, 2, 'lines')
assert.equal(stats.paragraphs, 1, 'one paragraph')
assert.equal(countStats('').words, 0, 'empty text has no words')
assert.equal(countStats(Array(401).join('word ')).words, 400, '400 words counted')
assert.equal(countStats(Array(401).join('word ')).readingTimeMinutes, 2, '400 words is two minutes at 200 wpm')

console.log('text transform: all assertions passed')
