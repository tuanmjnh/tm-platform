import assert from 'node:assert/strict'
import { ApiResponseSchema, ApiErrorSchema, PaginationParamsSchema } from '../dist/index.js'

assert.deepEqual(
  PaginationParamsSchema.parse({ page: 2, limit: 50 }),
  { page: 2, limit: 50 }
)

assert.throws(() => PaginationParamsSchema.parse({ limit: 501 }), 'limit is capped at 500')
assert.throws(() => PaginationParamsSchema.parse({ page: 0 }), 'page is positive')

// zod 4 takes an explicit key schema; the v3 single-argument form threw at
// schema-construction time, which is why this pins the shape and a parse.
const error = ApiErrorSchema.parse({ code: 'error.notRoot', message: 'nope', details: { field: ['required'] } })
assert.deepEqual(error.details, { field: ['required'] })
assert.throws(() => ApiErrorSchema.parse({ code: 'e', message: 'm', details: { field: 'not-an-array' } }))

const response = ApiResponseSchema(ApiErrorSchema).parse({
  success: false,
  error: { code: 'error.bad_request', message: 'bad' }
})
assert.equal(response.success, false)
assert.equal(response.error.code, 'error.bad_request')

const ok = ApiResponseSchema(PaginationParamsSchema).parse({ success: true, data: { page: 1 }, meta: { total: 1 } })
assert.equal(ok.data.page, 1)
assert.equal(ok.meta.total, 1)

console.log('tm-validators api tests passed')
