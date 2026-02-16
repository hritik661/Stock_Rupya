export function hashStringToColor(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = s.charCodeAt(i) + ((h << 5) - h)
  }
  const c = (h & 0x00ffffff).toString(16).toUpperCase()
  return `#${"00000".slice(0, 6 - c.length)}${c}`
}

export function initials(nameOrSymbol: string) {
  if (!nameOrSymbol) return "?"
  const parts = nameOrSymbol.replace(/\.(NS|BO|BSE)$/i, "").split(/[\s_\-\/]+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1][0] || "")).toUpperCase()
}

export function getStockLogoDataUrl(symbol: string, name?: string, size = 64) {
  const label = initials(name || symbol || "?")
  const bg = hashStringToColor(symbol || name || "seed")

  // Create a more sophisticated logo design
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
      <!-- Background with gradient -->
      <defs>
        <linearGradient id='grad' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' style='stop-color:${bg};stop-opacity:1' />
          <stop offset='100%' style='stop-color:${bg}dd;stop-opacity:0.8' />
        </linearGradient>
        <filter id='shadow' x='-20%' y='-20%' width='140%' height='140%'>
          <feDropShadow dx='1' dy='1' stdDeviation='1' flood-color='#00000040'/>
        </filter>
      </defs>

      <!-- Main circle with gradient -->
      <circle cx='${size/2}' cy='${size/2}' r='${size * 0.45}' fill='url(#grad)' filter='url(#shadow)'/>

      <!-- Inner highlight -->
      <circle cx='${size * 0.35}' cy='${size * 0.35}' r='${size * 0.15}' fill='rgba(255,255,255,0.3)'/>

      <!-- Company initials -->
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
            font-family='Inter, Roboto, Arial, sans-serif'
            font-size='${Math.floor(size * 0.35)}'
            fill='#ffffff'
            font-weight='700'
            filter='url(#shadow)'>${label}</text>

      <!-- Small accent dot -->
      <circle cx='${size * 0.8}' cy='${size * 0.2}' r='${size * 0.05}' fill='#ffffff' opacity='0.8'/>
    </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// Try to return a sensible external logo URL (Clearbit) derived from company name or symbol.
// The browser will attempt to load this; components should fallback to `getStockLogoDataUrl` on error.
export function getStockLogoAttemptUrl(symbol: string, name?: string, size = 64) {
  // Known mapping for a few major tickers (optional override)
  const KNOWN: Record<string, string> = {
    // examples - these can be expanded
    "TCS.NS": "tcs.com",
    "INFY.NS": "/infosys-logo.svg",
    "TECHM.NS": "/techm-logo.svg",
    "WIPRO.NS": "wipro.com",
    "HCLTECH.NS": "hcltech.com",
    "RELIANCE.NS": "ril.com",
    "HDFCBANK.NS": "hdfcbank.com",
    "ICICIBANK.NS": "icicibank.com",
    "KOTAKBANK.NS": "/kotak-logo.svg",
    "HDFC.NS": "hdfc.com",
    "MARUTI.NS": "maruti.co.in",
    "TATAMOTORS.NS": "tatamotors.com",
    "ITC.NS": "itcportal.com",
    "ASIANPAINT.NS": "asianpaints.com",
    "BHARTIARTL.NS": "airtel.in",
    "BAJFINANCE.NS": "bajajfinserv.in",
    "HINDUNILVR.NS": "hindustanunilever.com",
    "TITAN.NS": "titancompany.in",
    "ULTRACEMCO.NS": "ultratechcement.com",
    "POWERGRID.NS": "powergrid.in",
    "NTPC.NS": "ntpc.co.in",
    "COALINDIA.NS": "coalindia.in",
    "ONGC.NS": "ongcindia.com",
    "DRREDDY.NS": "drreddys.com",
    "SUNPHARMA.NS": "sunpharma.com",
    "GRASIM.NS": "grasim.com",
    "ADANIPORTS.NS": "adaniports.com",
    "JSWSTEEL.NS": "jsw.in",
    "TATASTEEL.NS": "tatasteel.com",
    "HINDALCO.NS": "hindalco.com",
    "VEDL.NS": "vedanta.co.in",
    "SBIN.NS": "sbi.co.in",
    "AXISBANK.NS": "axisbank.com",
    "LT.NS": "ltindia.com",
    "CIPLA.NS": "cipla.com",
    "DIVISLAB.NS": "divislabs.com",
    "APOLLOHOSP.NS": "apollohospitals.com",
    "INDUSINDBK.NS": "/indusind-logo.svg",
    "GODREJCP.NS": "godrejcp.com",
    "DABUR.NS": "dabur.com",
    "PIDILITIND.NS": "pidilite.com",
    "BERGEPAINT.NS": "bergerpaints.com",
    "SHREECEM.NS": "shreecement.com",
    "HAVELLS.NS": "havells.com",
    "TRENT.NS": "trentlimited.com",
    "DMART.NS": "dmart.in",
    "ZOMATO.NS": "zomato.com",
    "PAYTM.NS": "paytm.com",
    "^NSEI": "/nifty50-logo.svg",
    "^NIFTY": "/nifty50-logo.svg",
  }

  const lookup = KNOWN[symbol]
  if (lookup) {
    if (lookup.startsWith('/')) {
      // Local path
      return lookup
    } else {
      // External domain for Clearbit
      return `https://logo.clearbit.com/${lookup}?size=${size}`
    }
  }

  // Enhanced heuristic: try multiple approaches
  if (name) {
    // Try first meaningful token
    const token = (name || "").split(/[\s,\.\-()&]+/).find(token => token.length >= 2)
    if (token) {
      const clean = token.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
      if (clean.length >= 2) {
        return `https://logo.clearbit.com/${clean}.com?size=${size}`
      }
    }

    // Try full cleaned name
    const fullClean = (name || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    if (fullClean.length >= 3) {
      return `https://logo.clearbit.com/${fullClean}.com?size=${size}`
    }
  }

  // Try symbol-based lookup
  const symbolBase = symbol.replace(/\.(NS|BO|BSE)$/i, "").toLowerCase()
  if (symbolBase.length >= 2) {
    return `https://logo.clearbit.com/${symbolBase}.com?size=${size}`
  }

  // fallback to generated SVG data URL
  return getStockLogoDataUrl(symbol, name, size)
}

// Provide multiple candidate logo URLs (external services first), falling back to generated SVG
export function getStockLogoCandidates(symbol: string, name?: string, size = 64) {
  const candidates: string[] = []

  const KNOWN_EXT: Record<string, string> = {
    // Large Indian companies - IT & Software Services
    "TCS.NS": "tcs.com",
    "INFY.NS": "/infosys-logo.svg",
    "TECHM.NS": "/techm-logo.svg",
    "WIPRO.NS": "/wipro-logo.svg",
    "HCLTECH.NS": "/hcltech-logo.svg",
    "LTIM.NS": "/ltim-logo.svg",
    "COFORGE.NS": "coforge.com",
    "MPHASIS.NS": "mphasis.com",
    "PERSISTENT.NS": "persistent.com",
    "NIFTYIT.NS": "niftyit.in",
    
    // Energy & Oil
    "RELIANCE.NS": "ril.com",
    "ONGC.NS": "ongcindia.com",
    "GAIL.NS": "gailonline.com",
    "POWERGRID.NS": "powergrid.in",
    "NTPC.NS": "/ntpc-logo.svg",
    "COALINDIA.NS": "/coalindia-logo.svg",
    
    // Banks & Finance
    "HDFCBANK.NS": "hdfcbank.com",
    "ICICIBANK.NS": "/icici-logo.svg",
    "KOTAKBANK.NS": "/kotak-logo.svg",
    "SBIN.NS": "sbi.co.in",
    "AXISBANK.NS": "axisbank.com",
    "INDUSINDBK.NS": "/indusind-logo.svg",
    "FEDERALBNK.NS": "/federalbank-logo.svg",
    "BANKBARODA.NS": "/bankofbaroda-logo.svg",
    "BANDHANBNK.NS": "/bandhanbank-logo.svg",
    "RBLBANK.NS": "rblbank.com",
    "IDFCFIRSTB.NS": "idfcbank.com",
    "AUBANK.NS": "aubank.in",
    "IDBIBANK.NS": "idbibank.com",
    "YES.NS": "yesbank.in",
    "HDFCAMC.NS": "hdfcamc.com",
    "HDFC.NS": "/hdfc-logo.svg",
    "BAJFINANCE.NS": "/bajajfinance-logo.svg",
    "BAJAJFINSV.NS": "/bajajfinserv-logo.svg",
    "SBILIFE.NS": "/sbilife-logo.svg",
    
    // Automobiles
    "BAJAJ-AUTO.NS": "/bajajauto-logo.svg",
    "MARUTI.NS": "/maruti-logo.svg",
    "TATAMOTORS.NS": "/tatamotors-logo.svg",
    "HEROMOTOCO.NS": "/heromotoco-logo.svg",
    "EICHERMOT.NS": "/eichermot-logo.svg",
    "M&M.NS": "/mm-logo.svg",
    
    // Infrastructure & Industrial
    "LT.NS": "ltindia.com",
    "ADANIPORTS.NS": "adaniports.com",
    "ADANIENT.NS": "/adani-logo.svg",
    "ADANIGREEN.NS": "adanigreen.com",
    "JSWSTEEL.NS": "/jswsteel-logo.svg",
    "TATASTEEL.NS": "tatasteel.com",
    "HINDALCO.NS": "/hindalco-logo.svg",
    "VEDL.NS": "vedanta.co.in",
    "NALCO.NS": "nalcoindia.com",
    "SHREECEM.NS": "shreecement.com",
    "AMBUJACEM.NS": "ambujacement.com",
    "ACC.NS": "acc.com",
    "JKCEMENT.NS": "jkcement.com",
    "DALBHARAT.NS": "dalmia.co.in",
    "MOTHERSON.NS": "motherson.com",
    "BALLBT.NS": "ballardindia.com",
    
    // Consumer Staples & FMCG
    "ITC.NS": "itcportal.com",
    "NESTLEIND.NS": "nestle.in",
    "BRITANNIA.NS": "britannia.co.in",
    "HINDUNILVR.NS": "/hindustan-logo.svg",
    "DABUR.NS": "/dabur-logo.svg",
    "MARICO.NS": "marico.com",
    "COLPAL.NS": "colpal.com",
    "GODFREY.NS": "godfreyphillips.com",
    "TATACONSUM.NS": "tataconsumerproducts.com",
    
    // Pharmaceuticals & Healthcare
    "DRREDDY.NS": "/drreddy-logo.svg",
    "SUNPHARMA.NS": "sunpharma.com",
    "CIPLA.NS": "/cipla-logo.svg",
    "DIVISLAB.NS": "divislabs.com",
    "APOLLOHOSP.NS": "apollohospitals.com",
    "MAXHEALTH.NS": "maxhealthcare.in",
    "FORTIS.NS": "fortishealthcare.com",
    "SHealthcare.NS": "stepphealth.com",
    "TORRENTPHARMA.NS": "torrentpharma.com",
    "LUMPYTECH.NS": "lumpistech.com",
    
    // Telecom & Communications
    "BHARTIARTL.NS": "/bharti-logo.svg",
    "IDEA.NS": "ideacellular.com",
    "VODAFONE.NS": "vodafone.in",
    
    // Paints & Chemicals
    "ASIANPAINT.NS": "asianpaints.com",
    "ULTRACEMCO.NS": "/ultratech-logo.svg",
    "GRASIM.NS": "/grasim-logo.svg",
    "BERGEPAINT.NS": "bergerpaints.com",
    
    // Real Estate & Construction
    "GODREJPROP.NS": "/godrej-logo.svg",
    "GODREJCP.NS": "godrejcp.com",
    "DLF.NS": "/dlf-logo.svg",
    "PRESTIGE.NS": "prestigeconstructions.com",
    "SOBHA.NS": "sobha.com",
    "BRIGADE.NS": "brigade.co.in",
    
    // Retail & E-commerce
    "DMART.NS": "/dmart-logo.svg",
    "AVENUE.NS": "/avenue-logo.svg",
    "TRENT.NS": "trentlimited.com",
    "ABFRL.NS": "abfrl.com",
    "ZOMATO.NS": "zomato.com",
    "PAYTM.NS": "paytm.com",
    "NYKAA.NS": "nykaa.com",
    "INFOEDGE.NS": "infoedge.in",
    "NAUKRI.NS": "naukri.com",
    
    // Transportation & Logistics
    "DELHIVERY.NS": "delhivery.com",
    "ALLCARGO.NS": "allcargo.in",
    "VBL.NS": "vasind.com",
    
    // Insurance & Others
    "POLICYBZR.NS": "policybazaar.com",
    
    // Appliances & Electronics
    "VOLTAS.NS": "/voltas-logo.svg",
    "BLUESTARCO.NS": "bluestarindia.com",
    "WHIRLPOOL.NS": "whirlpoolindia.com",
    "HAVELLS.NS": "/havells-logo.svg",
    "POLYCAB.NS": "polycab.com",
    "KEI.NS": "kei-ind.com",
    "BOSCHLTD.NS": "boschltd.com",
    "EXIDEIND.NS": "exideindustries.com",
    "AMARAJABAT.NS": "amararaja.co.in",
    
    // Chemicals & Specialty
    "PIDILITIND.NS": "pidilite.com",
    "GOJI.NS": "goji.in",
    
    // Defence & Electronics
    "BEL.NS": "bel-india.in",
    "HAL.NS": "hal-india.co.in",
    "BEML.NS": "bemlindia.in",
    "MIDHANI.NS": "midhani.gov.in",
    
    // Mining & Metals
    "NMDC.NS": "nmdc.co.in",
    "SAIL.NS": "sail.co.in",
    "JINDALSTEL.NS": "jindalsteel.com",
    "JSPL.NS": "jindal.com",
    
    // Leisure & Hospitality
    "TITAN.NS": "titancompany.in",
    "OBEROI.NS": "oberoihotels.com",
    "IHH.NS": "ihhworldwide.com",
    
    // Indices / exchanges
    "^NSEI": "/nifty50-logo.svg",
    "^NIFTY": "/nifty50-logo.svg",
    "^NIFTY50": "/nifty50-logo.svg",
    "^BSESN": "bseindia.com",
    "^CNXIT": "/niftyit-logo.svg",
    "^CNXNIFTYJR": "nseindia.com",
    "^NSEBANK": "/banknifty-logo.svg",
    "^CNXINFRA": "nseindia.com",
    "^CNXINFRA": "nseindia.com",
    "^NSEPSU": "nseindia.com",
    "^NSEPRIVATEBANK": "nseindia.com",
    "^DJI": "/dow30-logo.svg",
    "^NSEAUTOPLOT": "nseindia.com",
    
    // Metals / commodities
    "GC=F": "nseindia.com",
    "SI=F": "nseindia.com",
    "CL=F": "nseindia.com",
    "HG=F": "nseindia.com",
  }

  const lookup = KNOWN_EXT[symbol]
  if (lookup) {
    if (lookup.startsWith('/')) {
      // Local path
      candidates.push(lookup)
    } else {
      // External domain for Clearbit
      candidates.push(`https://logo.clearbit.com/${lookup}?size=${size}`)
    }
  }

  if (name) {
    // Try multiple tokens from company name
    const tokens = (name || "").split(/[\s,\.\-()&]+/).filter(token => token.length >= 2)

    tokens.forEach(token => {
      const clean = token.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
      if (clean.length >= 2) {
        // Try multiple TLD combinations
        candidates.push(`https://logo.clearbit.com/${clean}.com?size=${size}`)
        candidates.push(`https://logo.clearbit.com/${clean}.co.in?size=${size}`)
        candidates.push(`https://logo.clearbit.com/${clean}.in?size=${size}`)
        candidates.push(`https://logo.clearbit.com/${clean}india.com?size=${size}`)
        candidates.push(`https://logo.clearbit.com/${clean}group.com?size=${size}`)
        candidates.push(`https://logo.clearbit.com/${clean}corp.com?size=${size}`)
        candidates.push(`https://logo.clearbit.com/${clean}ltd.com?size=${size}`)

        // Try favicon services
        candidates.push(`https://icons.duckduckgo.com/ip3/${clean}.com.ico`)
        candidates.push(`https://www.google.com/s2/favicons?domain=${clean}.com&sz=${size}`)
      }
    })

    // Try full name as domain (cleaned)
    const fullNameClean = (name || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    if (fullNameClean.length >= 3) {
      candidates.push(`https://logo.clearbit.com/${fullNameClean}.com?size=${size}`)
      candidates.push(`https://logo.clearbit.com/${fullNameClean}.co.in?size=${size}`)
    }
  }

  // Try symbol-based lookups for unmapped stocks
  if (!KNOWN_EXT[symbol]) {
    const symbolBase = symbol.replace(/\.(NS|BO|BSE)$/i, "").toLowerCase()
    if (symbolBase.length >= 2) {
      candidates.push(`https://logo.clearbit.com/${symbolBase}.com?size=${size}`)
      candidates.push(`https://logo.clearbit.com/${symbolBase}.co.in?size=${size}`)
      candidates.push(`https://logo.clearbit.com/${symbolBase}india.com?size=${size}`)
    }
  }

  // Always include data-url fallback as last candidate
  candidates.push(getStockLogoDataUrl(symbol, name, size))

  return candidates
}
