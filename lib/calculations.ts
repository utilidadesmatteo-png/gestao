import type { Product, Sale } from "./types"

export const SHOPEE_PERCENT = 0.2
export const SHOPEE_FIXED = 4

/**
 * Taxa da Shopee por item: 20% sobre o CUSTO do produto + R$4 fixo.
 * Definido pelo usuário: a taxa incide sobre o custo, não sobre a venda.
 */
export function shopeeFee(costPrice: number): number {
  return costPrice * SHOPEE_PERCENT + SHOPEE_FIXED
}

/** Lucro líquido de uma unidade: venda - custo - taxa. */
export function unitProfit(costPrice: number, salePrice: number): number {
  return salePrice - costPrice - shopeeFee(costPrice)
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

export type Summary = {
  productCount: number
  totalUnits: number
  investment: number
  potentialProfit: number
  realProfit: number
  topProduct: { name: string; unitsSold: number } | null
}

export function computeSummary(products: Product[], sales: Sale[]): Summary {
  const productCount = products.length
  const totalUnits = products.reduce((acc, p) => acc + p.quantity, 0)
  const investment = products.reduce((acc, p) => acc + p.costPrice * p.quantity, 0)

  const potentialProfit = products.reduce(
    (acc, p) => acc + unitProfit(p.costPrice, p.salePrice) * p.quantity,
    0,
  )

  const realProfit = sales.reduce(
    (acc, s) => acc + unitProfit(s.costPrice, s.salePrice) * s.quantity,
    0,
  )

  const soldByProduct = new Map<string, { name: string; unitsSold: number }>()
  for (const s of sales) {
    const current = soldByProduct.get(s.productId)
    if (current) {
      current.unitsSold += s.quantity
    } else {
      soldByProduct.set(s.productId, { name: s.productName, unitsSold: s.quantity })
    }
  }

  let topProduct: Summary["topProduct"] = null
  for (const entry of soldByProduct.values()) {
    if (!topProduct || entry.unitsSold > topProduct.unitsSold) {
      topProduct = entry
    }
  }

  return { productCount, totalUnits, investment, potentialProfit, realProfit, topProduct }
}
