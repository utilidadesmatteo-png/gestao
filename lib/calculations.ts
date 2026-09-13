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

/**
 * Margem de lucro: quanto do preço de venda vira lucro, em %.
 * Ex.: vender por R$50 com R$22 de lucro = 44% de margem.
 */
export function profitMargin(costPrice: number, salePrice: number): number {
  if (salePrice <= 0) return 0
  return (unitProfit(costPrice, salePrice) / salePrice) * 100
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
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
  potentialRevenue: number
  realRevenue: number
  potentialProfit: number
  realProfit: number
  topProduct: { name: string; unitsSold: number } | null
}

export function computeSummary(products: Product[], sales: Sale[]): Summary {
  const productCount = products.length
  const totalUnits = products.reduce((acc, p) => acc + p.quantity, 0)
  const investment = products.reduce((acc, p) => acc + p.costPrice * p.quantity, 0)

  // Faturamento = receita bruta da venda (preço de venda x quantidade), sem descontar custo nem taxa.
  const potentialRevenue = products.reduce((acc, p) => acc + p.salePrice * p.quantity, 0)
  const realRevenue = sales.reduce((acc, s) => acc + s.salePrice * s.quantity, 0)

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

  return {
    productCount,
    totalUnits,
    investment,
    potentialRevenue,
    realRevenue,
    potentialProfit,
    realProfit,
    topProduct,
  }
}
