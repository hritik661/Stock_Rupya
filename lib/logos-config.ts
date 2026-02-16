/**
 * Centralized Logo Configuration
 * All app logos reference this file for consistency
 */

export const LOGOS = {
  // Main StockAI Application Logo
  main: "/logos.png",
  
  // Fallback logos (in priority order)
  fallback: [
    "/logos.png",
    "/stockai-logo-preview.html",
  ],
  
  // Favicon configurations
  favicon: {
    light: "/logos.png",
    dark: "/logos.png",
    svg: "/logos.svg",
    apple: "/logos.png",
    icon32: "/icon-light-32x32.png",
  },
  
  // Social/Metadata logos
  social: {
    og: "/logos.png",
    twitter: "/logos.png",
  },
  
  // Placeholder logos
  placeholder: {
    stock: "/placeholder-logo.svg",
    user: "/placeholder-user.jpg",
  },
}

/**
 * Get primary logo with fallback
 */
export function getPrimaryLogo(): string {
  return LOGOS.main
}

/**
 * Get logo with fallback chain
 */
export function getLogoWithFallback(fallbackIndex: number = 0): string {
  return fallbackIndex === 0 ? LOGOS.main : LOGOS.fallback[fallbackIndex - 1] || LOGOS.main
}

/**
 * All logo sources for error handling
 */
export function getAllLogoSources(): string[] {
  return [LOGOS.main, ...LOGOS.fallback]
}
