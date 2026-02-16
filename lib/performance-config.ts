// Performance optimization configuration

export const PERFORMANCE_CONFIG = {
  // Image optimization
  IMAGE_FORMATS: {
    webp: 'image/webp',
    jpeg: 'image/jpeg',
    png: 'image/png'
  },
  
  // Cache configuration (in seconds)
  CACHE_DURATIONS: {
    STOCK_DATA: 60, // 1 minute
    NEWS_DATA: 300, // 5 minutes
    MARKET_DATA: 30, // 30 seconds
    USER_DATA: 600, // 10 minutes
  },

  // API request optimization
  API_CONFIG: {
    TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY: 1000, // 1 second
  },

  // Component lazy loading config
  LAZY_LOAD_CONFIG: {
    THRESHOLD: 0.1, // Load when 10% visible
    ROOT_MARGIN: '50px', // Start loading 50px before visible
  },

  // Data pagination
  PAGINATION: {
    STOCK_LIST: 20,
    NEWS_LIST: 5,
    GAINERS_LOSERS: 10,
  },

  // Network optimization
  NETWORK: {
    COMPRESS_RESPONSES: true,
    GZIP_ENABLED: true,
    BROTLI_ENABLED: true,
  },

  // Performance budgets
  BUDGET: {
    LARGEST_CONTENTFUL_PAINT: 2500, // 2.5 seconds
    FIRST_INPUT_DELAY: 100, // 100ms
    CUMULATIVE_LAYOUT_SHIFT: 0.1,
    TIME_TO_INTERACTIVE: 3500, // 3.5 seconds
  }
}

// Real-time data update intervals
export const UPDATE_INTERVALS = {
  STOCK_PRICE: 30000, // 30 seconds
  MARKET_STATUS: 60000, // 1 minute
  NEWS: 300000, // 5 minutes
  BALANCE: 60000, // 1 minute
}

// Batch request configuration
export const BATCH_CONFIG = {
  ENABLED: true,
  BATCH_SIZE: 10,
  MAX_BATCH_WAIT: 5000, // 5 seconds
}
