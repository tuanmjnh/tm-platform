import { z } from 'zod'

export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(500).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional()
})
export type PaginationParams = z.infer<typeof PaginationParamsSchema>

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.array(z.string())).optional()
})
export type ApiError = z.infer<typeof ApiErrorSchema>

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional(),
    meta: z.object({
      page: z.number().int().optional(),
      limit: z.number().int().optional(),
      total: z.number().int().optional()
    }).optional()
  })

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: ApiError
  meta?: { page?: number, limit?: number, total?: number }
}