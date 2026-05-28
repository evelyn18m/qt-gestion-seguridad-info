/**
 * Catalog composable — fetches catalog data from the API with deduplication.
 */
import type { CatalogoItem } from '~/types/api'

export function useCatalog() {
  const { apiFetch } = useApi()

  // In-flight request deduplication per catalog type
  const pendingRequests = new Map<string, Promise<CatalogoItem[]>>()

  async function fetchCatalog(tipo: string): Promise<CatalogoItem[]> {
    // Handle comma-separated multiple catalog types — fetch in parallel
    if (tipo.includes(',')) {
      const results = await Promise.all(
        tipo.split(',').map(t => fetchCatalog(t.trim()))
      )
      return results.flat()
    }

    // Deduplicate in-flight requests
    const existing = pendingRequests.get(tipo)
    if (existing) return existing

    const promise = apiFetch<CatalogoItem[]>(`/catalogos/${tipo}`)
      .then(data => {
        pendingRequests.delete(tipo)
        return data
      })
      .catch(err => {
        pendingRequests.delete(tipo)
        throw err
      })

    pendingRequests.set(tipo, promise)
    return promise
  }

  return { fetchCatalog }
}