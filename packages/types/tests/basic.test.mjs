import assert from 'node:assert/strict'
import * as types from '../dist/index.js'

// Type-only package: the runtime surface must exist and export nothing
// unexpected. Real assertions live in consumer packages.
assert.equal(typeof types, 'object')
console.log('tm-types import ok')