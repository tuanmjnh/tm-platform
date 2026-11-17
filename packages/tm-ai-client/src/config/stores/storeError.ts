import { AIClientError } from '../../errors'

/**
 * One failure shape for every driver so callers can attribute a store outage
 * through `.code` instead of parsing a plain Error message.
 */
export function storeFailure(operation: string, error: unknown): AIClientError {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error)
  return new AIClientError('ai.store-failed', `AI config store ${operation} failed: ${message}`)
}

/** Classifies an operation's failure, leaving already-classified errors untouched. */
export async function guardStore<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof AIClientError) throw error
    throw storeFailure(operation, error)
  }
}
