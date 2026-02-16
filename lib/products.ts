export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
}

export const PRODUCTS: Product[] = [
  {
    id: "prediction-service",
    name: "Hrtik Stocks Prediction Service",
    description: "Unlock lifetime access to AI-powered stock predictions with growth signals",
    priceInCents: 10000, // ₹100 in paise
  },
]
