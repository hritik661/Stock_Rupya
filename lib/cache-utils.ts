// Cache utilities for ultra-fast loading

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class QuoteCache {
  private cache = new Map<string, CacheEntry>()
  private pending = new Map<string, Promise<any>>()

  set(key: string, data: any, ttlMs = 60000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    })
  }

  get(key: string) {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    return entry.data
  }

  // Request deduplication - return pending promise if request already in flight
  async withDedup<T>(key: string, fetcher: () => Promise<T>, ttlMs = 60000): Promise<T> {
    // Check cache first
    const cached = this.get(key)
    if (cached !== null) return cached

    // Check if request is already in flight
    if (this.pending.has(key)) {
      return this.pending.get(key)!
    }

    // Create new request
    const promise = fetcher().then((data) => {
      this.set(key, data, ttlMs)
      this.pending.delete(key)
      return data
    }).catch((err) => {
      this.pending.delete(key)
      throw err
    })

    this.pending.set(key, promise)
    return promise
  }

  clear() {
    this.cache.clear()
    this.pending.clear()
  }

  clearOld() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Export singleton instance
export const quoteCache = new QuoteCache()

// Batch request optimizer - combine multiple symbol requests
export class BatchRequestOptimizer {
  private batchQueue: string[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private batchResolver: ((symbols: string[]) => void) | null = null

  async addToBatch(symbol: string, callback?: () => Promise<any>, batchSize = 50, delayMs = 50): Promise<any> {
    if (!this.batchQueue.includes(symbol)) {
      this.batchQueue.push(symbol)
    }

    return new Promise((resolve) => {
      const checkBatch = () => {
        if (this.batchQueue.length >= batchSize) {
          this.executeBatch()
          resolve(true)
        }
      }

      if (this.batchTimer) clearTimeout(this.batchTimer)

      // Execute immediately if batch is full
      if (this.batchQueue.length >= batchSize) {
        checkBatch()
      } else {
        // Otherwise schedule execution after delay
        this.batchTimer = setTimeout(() => {
          this.executeBatch()
          resolve(true)
        }, delayMs)
      }
    })
  }

  private executeBatch() {
    if (this.batchTimer) clearTimeout(this.batchTimer)
    if (this.batchResolver) {
      this.batchResolver(this.batchQueue)
    }
    this.batchQueue = []
  }

  clear() {
    if (this.batchTimer) clearTimeout(this.batchTimer)
    this.batchQueue = []
  }
}

// Preload common stocks instantly
export async function preloadCommonStocks() {
  try {
    const { INDIAN_STOCKS } = await import("@/lib/stocks-data")
    const { fetchMultipleQuotes } = await import("@/lib/yahoo-finance")
    
    // Preload top 30 stocks in background
    const topStocks = INDIAN_STOCKS.slice(0, 30).map(s => s.symbol)
    const cacheKey = `batch:${topStocks.join(',')}`
    
    // Only preload if not cached
    if (!quoteCache.get(cacheKey)) {
      fetchMultipleQuotes(topStocks)
        .then(quotes => {
          quoteCache.set(cacheKey, quotes, 30000) // Cache for 30s
          // Also cache individual stocks
          quotes.forEach(q => {
            quoteCache.set(`quote:${q.symbol}`, q, 30000)
          })
        })
        .catch(err => console.error('Preload failed:', err))
    }
  } catch (error) {
    console.error('Preload error:', error)
  }
}
