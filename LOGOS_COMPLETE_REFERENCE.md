📁 **All Logos - Complete Reference Guide**

## Primary Application Logo

**Logo File**: [logos.png](../../public/logos.png)

### Where logos.png is Used:

#### 1. **Layout Configuration** 
   - **File**: [app/layout.tsx](../../app/layout.tsx)
   - **Usage**: Favicon metadata for browser tabs and bookmarks
   - **Configuration**: Uses LOGOS.favicon settings
   - **Sizes**: Multiple sizes for different devices (light/dark modes, SVG fallback)

#### 2. **Header Component**
   - **File**: [components/header.tsx](../../components/header.tsx)
   - **Usage**: Main navigation header logo
   - **Size**: 8×8 (mobile) to 10×10 (desktop)
   - **Features**: Hover opacity effect, SVG fallback
   - **Import**: LOGOS.main + LOGOS.fallback[0]

#### 3. **Hero Section**
   - **File**: [components/hero-section.tsx](../../components/hero-section.tsx)
   - **Usage**: Landing page hero section logo with glow effect
   - **Size**: 128×128 (mobile, 32 × 16 rem) to 160×160 (desktop, 40 × 10 rem)
   - **Features**: Animated glow effect, blend mode screen, brightness filter
   - **Import**: LOGOS.main + LOGOS.fallback[0]

#### 4. **Login Form Component**
   - **File**: [components/login-form.tsx](../../components/login-form.tsx)
   - **Usage**: Login card sidebar logo
   - **Size**: 64×64 pixels (h-16 w-16)
   - **Features**: Drop shadow effect, desktop-only display
   - **Import**: LOGOS.main + LOGOS.fallback[0]

---

## Centralized Logo Configuration

**File**: [lib/logos-config.ts](../../lib/logos-config.ts)

### Exported Functions:
- `getPrimaryLogo()` - Returns main logo path
- `getLogoWithFallback(index)` - Returns logo with fallback chain
- `getAllLogoSources()` - Returns all available logo sources for error handling

### Logo Configuration Object:
```typescript
LOGOS = {
  main: "/logos.png",                    // Primary app logo
  fallback: ["/stockai-logo.svg", ...],  // Fallback sequence
  favicon: {
    light: "/logos.png",                 // Light mode favicon
    dark: "/logos.png",                  // Dark mode favicon
    svg: "/logos.svg",                   // SVG favicon
    apple: "/logos.png",                 // Apple touch icon
    icon32: "/icon-light-32x32.png",    // 32×32 icon
  },
  social: {
    og: "/logos.png",                    // Open Graph meta
    twitter: "/logos.png",               // Twitter card
  },
  placeholder: {
    stock: "/placeholder-logo.svg",      // Stock logo placeholder
    user: "/placeholder-user.jpg",       // User avatar placeholder
  },
}
```

---

## Supporting Logo Files

Located in [public/](../../public/) folder:

### Vector Logos
- [stockai-logo.svg](../../public/stockai-logo.svg) - SVG version (fallback)
- [icon.svg](../../public/icon.svg) - Additional SVG icon

### Raster Logos
- [logo.png](../../public/logo.png) - Alternative PNG logo
- [apple-icon.png](../../public/apple-icon.png) - Apple device icon
- [icon-light-32x32.png](../../public/icon-light-32x32.png) - 32×32 light icon
- [icon-dark-32x32.png](../../public/icon-dark-32x32.png) - 32×32 dark icon

### HTML/Preview
- [stockai-logo-preview.html](../../public/stockai-logo-preview.html) - Logo preview file

### Placeholder Assets
- [placeholder-logo.svg](../../public/placeholder-logo.svg) - Generic logo placeholder
- [placeholder-logo.png](../../public/placeholder-logo.png) - Generic PNG placeholder

### Stock Company Logos
- Individual stock logos (ADANIENT, BAJAJFINANCE, etc.)
- Index logos (NIFTY50, BANKNIFTY, etc.)
- See [public/ folder](../../public/) for complete list

---

## Error Handling & Fallback Chain

All logo components use a fallback error handler:

```typescript
onError={(e) => { 
  e.currentTarget.src = LOGOS.fallback[0]  // Falls back to SVG
}}
```

This ensures if logos.png fails to load, the browser automatically uses the SVG fallback.

---

## How to Update

To change the primary logo:
1. Replace [logos.png](../../public/logos.png) with your new image
2. Update [lib/logos-config.ts](../../lib/logos-config.ts) if needed
3. All components will automatically use the new logo ✅

---

## 🎯 Summary

✅ **Primary Logo**: logos.png
✅ **4 Major Components** use logos.png
✅ **Centralized Config** ensures consistency
✅ **Automatic Fallback** to SVG if PNG fails
✅ **Multiple Sizes** for different devices
✅ **Social Media Ready** with OG and Twitter tags
