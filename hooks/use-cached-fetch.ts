"use client"

import { useCallback, useRef, useEffect } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class RequestCache {
  private cache: Map<string, CacheEntry<any>> = new Map()

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

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }
}

const globalCache = new RequestCache()

export function useCachedFetch<T>(
  url: string,
  ttl: number = 60000, // Default 1 minute
  dependencies: any[] = []
) {
  const cacheKeyRef = useRef<string>(`${url}`)

  const fetchData = useCallback(async (): Promise<T | null> => {
    const cacheKey = cacheKeyRef.current

    // Check cache first
    if (globalCache.has(cacheKey)) {
      return globalCache.get<T>(cacheKey)
    }

    try {
      const response = await fetch(url, {
        // Add request optimization headers
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
        },
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const data = await response.json()

      // Store in cache
      globalCache.set(cacheKey, data, ttl)

      return data
    } catch (error) {
      console.error(`Error fetching from ${url}:`, error)
      return null
    }
  }, [url, ttl])

  return fetchData
}

export function usePrefetch(urls: string[]) {
  const prefetch = useCallback(async () => {
    await Promise.allSettled(
      urls.map(url => {
        const cacheKey = url
        if (!globalCache.has(cacheKey)) {
          return fetch(url).then(r => r.json()).then(data => {
            globalCache.set(cacheKey, data, 60000)
          })
        }
        return Promise.resolve()
      })
    )
  }, [urls])

  return prefetch
}

export function clearCache() {
  globalCache.clear()
}

// Web Worker support for heavy computations
export function createWorkerTask<T, R>(
  fn: (data: T) => R,
  data: T
): Promise<R> {
  return new Promise((resolve, reject) => {
    try {
      const result = fn(data)
      resolve(result)
    } catch (error) {
      reject(error)
    }
  })
}
