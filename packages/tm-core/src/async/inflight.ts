/**
 * Coalesce concurrent calls into a single in-flight run.
 *
 * While a run is pending, every caller receives the same promise instead of
 * starting another run. The lock clears when the run settles (resolve or
 * reject), so the next call after that starts fresh. Used to stop duplicated
 * network fetches (e.g. notifications) from exhausting the shared rate limit.
 */
export function createInflight<T>() {
  let pending: Promise<T> | null = null
  return (task: () => Promise<T>): Promise<T> => {
    if (pending) return pending
    pending = task().finally(() => {
      pending = null
    })
    return pending
  }
}