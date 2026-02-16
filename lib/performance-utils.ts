// Performance utilities for optimized data fetching and caching

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class ResponseCache {
  private cache = new Map<string, CacheEntry<any>>()

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs: number = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    })
  }

  clear(): void {
    this.cache.clear()
  }

  delete(key: string): void {
    this.cache.delete(key)
  }
}

export const apiCache = new ResponseCache()

// Debounce function for API calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Throttle function for API calls
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Optimized fetch with cache
export async function fetchWithCache<T>(
  url: string,
  options: RequestInit & { cacheTTL?: number } = {}
): Promise<T> {
  const { cacheTTL = 30000, ...fetchOptions } = options

  // Check cache first
  const cached = apiCache.get<T>(url)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        'Cache-Control': 'max-age=30',
      },
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = (await response.json()) as T
    apiCache.set(url, data, cacheTTL)
    return data
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error)
    throw error
  }
}

// Batch multiple fetches
export async function batchFetch<T>(
  urls: string[],
  cacheTTL = 30000
): Promise<T[]> {
  return Promise.allSettled(
    urls.map((url) =>
      fetchWithCache<T>(url, { cacheTTL }).catch((e) => {
        console.warn(`Failed to fetch ${url}:`, e)
        return null
      })
    )
  ).then((results) =>
    results
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter((v): v is T => v !== null)
  )
}

// Request idle callback polyfill
export function scheduleIdleTask(callback: () => void, timeout = 5000): void {
  if ('requestIdleCallback' in window) {
    ;(window as any).requestIdleCallback(callback, { timeout })
  } else {
    setTimeout(callback, Math.min(timeout, 1))
  }
}
