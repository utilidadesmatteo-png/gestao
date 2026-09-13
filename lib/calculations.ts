import type { Product, Sale } from "./types"

export const SHOPEE_PERCENT = 0.2
export const SHOPEE_FIXED = 4

/**
 * Taxa da Shopee por item: 20% sobre o PREÇO DE VENDA + R$4 fixo.
 * Definido pelo usuário: a taxa incide sobre a venda, como no extrato real da Shopee.
 */
export function shopeeFee(salePrice: number): number {
  return salePrice * SHOPEE_PERCENT + SHOPEE_FIXED
}

/** Lucro líquido de uma unidade: venda - custo - taxa. */
export function unitProfit(costPrice: number, salePrice: number): number {
  return salePrice - costPrice - shopeeFee(salePrice)
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

export type ExtraCost = {
  id: string
  label: string
  value: number
}

export type CalculatorInput = {
  costPrice: number
  salePrice: number
  packaging: number
  ads: number
  freight: number
  extras: ExtraCost[]
}

export type CalculatorResult = {
  commission: number
  fixedFee: number
  shopeeFee: number
  extrasTotal: number
  totalCost: number
  netProfit: number
  margin: number
  roi: number
}

/**
 * Calculadora de precificação Shopee.
 * Comissão = 20% sobre o preço de venda. Taxa fixa = R$4 por item.
 * Custo total = custo + embalagem + ads + frete + extras + taxa Shopee.
 * Lucro líquido = preço de venda - custo total.
 * Margem = lucro líquido / preço de venda. ROI = lucro líquido / custo total.
 */
export function computeCalculator(input: CalculatorInput): CalculatorResult {
  const commission = input.salePrice * SHOPEE_PERCENT
  const fixedFee = SHOPEE_FIXED
  const shopeeFee = commission + fixedFee
  const extrasTotal = input.extras.reduce((acc, e) => acc + e.value, 0)

  const totalCost =
    input.costPrice + input.packaging + input.ads + input.freight + extrasTotal + shopeeFee

  const netProfit = input.salePrice - totalCost
  const margin = input.salePrice > 0 ? (netProfit / input.salePrice) * 100 : 0
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0

  return {
    commission,
    fixedFee,
    shopeeFee,
    extrasTotal,
    totalCost,
    netProfit,
    margin,
    roi,
  }
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
