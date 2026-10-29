/**
 * Asks the browser not to clear our data when space runs low. Browsers decide
 * for themselves (installed apps usually get it), so this is a request only;
 * Settings shows the result.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator.storage?.persist !== 'function') return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
