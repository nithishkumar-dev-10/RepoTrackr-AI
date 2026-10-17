/** Simulated latency for mock calls so loading/empty states are exercised. */
export function delay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
