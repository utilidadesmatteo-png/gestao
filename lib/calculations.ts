import type { Product, Sale } from "./types"

// Valores padrão usados enquanto o usuário não configura as taxas nas Configurações.
export const DEFAULT_SHOPEE_PERCENT = 0.2
export const DEFAULT_SHOPEE_FIXED = 4.5

// Configuração de taxas ativa. É sobrescrita pelas Configurações do usuário
// (lib/settings.ts) e usada por todos os cálculos de lucro e margem.
let activePercent = DEFAULT_SHOPEE_PERCENT
let activeFixed = DEFAULT_SHOPEE_FIXED

/**
 * Define as taxas ativas. Valores inválidos/nulos voltam ao padrão,
 * garantindo que os cálculos nunca quebrem.
 */
export function setFeeConfig(percent: number | null | undefined, fixed: number | null | undefined) {
  activePercent =
    typeof percent === "number" && Number.isFinite(percent) && percent >= 0 ? percent : DEFAULT_SHOPEE_PERCENT
  activeFixed = typeof fixed === "number" && Number.isFinite(fixed) && fixed >= 0 ? fixed : DEFAULT_SHOPEE_FIXED
}

export function getShopeePercent(): number {
  return activePercent
}

export function getShopeeFixed(): number {
  return activeFixed
}

/**
 * Taxa da Shopee por item: comissão (%) sobre o PREÇO DE VENDA + taxa fixa.
 * A taxa incide sobre a venda, como no extrato real da Shopee.
 */
export function shopeeFee(salePrice: number): number {
  return salePrice * activePercent + activeFixed
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
  const safe = Number.isFinite(value) ? value : 0
  return `${safe.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

export function formatBRL(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  return safe.toLocaleString("pt-BR", {
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
  investment: number
  totalCost: number
  netProfit: number
  margin: number
  roi: number
}

/**
 * Calculadora de precificação Shopee.
 * Comissão = 20% sobre o preço de venda. Taxa fixa = R$4,50 por item.
 * Custo total = custo + embalagem + ads + frete + extras + taxa Shopee.
 * Lucro líquido = preço de venda - custo total.
 * Margem = lucro líquido / preço de venda.
 * ROI = lucro líquido / investimento do bolso (custo + extras, SEM taxas da Shopee).
 */
export function computeCalculator(input: CalculatorInput): CalculatorResult {
  const commission = input.salePrice * activePercent
  const fixedFee = activeFixed
  const shopeeFee = commission + fixedFee
  const extrasTotal = input.extras.reduce((acc, e) => acc + e.value, 0)

  // Investimento do bolso: o que o usuário realmente desembolsa (custo + custos adicionais).
  // As taxas da Shopee NÃO entram aqui — são descontadas da venda, não pagas antecipadamente.
  const investment = input.costPrice + input.packaging + input.ads + input.freight + extrasTotal

  const totalCost = investment + shopeeFee

  const netProfit = input.salePrice - totalCost
  const margin = input.salePrice > 0 ? (netProfit / input.salePrice) * 100 : 0
  const roi = investment > 0 ? (netProfit / investment) * 100 : 0

  return {
    commission,
    fixedFee,
    shopeeFee,
    extrasTotal,
    investment,
    totalCost,
    netProfit,
    margin,
    roi,
  }
}

export const LOW_STOCK_THRESHOLD = 5

export type Summary = {
  productCount: number
  totalUnits: number
  investment: number
  potentialRevenue: number
  realRevenue: number
  potentialProfit: number
  realProfit: number
  averageMargin: number
  averageTicket: number
  salesCount: number
  topProduct: { name: string; unitsSold: number } | null
  mostProfitable: { name: string; unitProfit: number; margin: number } | null
  lowStock: { id: string; name: string; quantity: number }[]
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

  // Margem média do estoque: quanto do faturamento potencial vira lucro, em %.
  // Ponderada pelo valor de venda de cada produto (lucro potencial / faturamento potencial).
  const averageMargin = potentialRevenue > 0 ? (potentialProfit / potentialRevenue) * 100 : 0

  // Ticket médio do estoque: preço de venda médio por unidade em estoque
  // (faturamento potencial / total de unidades). Baseado no estoque, não nas vendas.
  const salesCount = sales.length
  const averageTicket = totalUnits > 0 ? potentialRevenue / totalUnits : 0

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

  // Produto mais lucrativo: maior lucro líquido por unidade entre os cadastrados.
  let mostProfitable: Summary["mostProfitable"] = null
  for (const p of products) {
    const profit = unitProfit(p.costPrice, p.salePrice)
    if (!mostProfitable || profit > mostProfitable.unitProfit) {
      mostProfitable = {
        name: p.name,
        unitProfit: profit,
        margin: profitMargin(p.costPrice, p.salePrice),
      }
    }
  }

  // Estoque baixo: produtos com quantidade no ou abaixo do limite, do menor para o maior.
  const lowStock = products
    .filter((p) => p.quantity <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.quantity - b.quantity)
    .map((p) => ({ id: p.id, name: p.name, quantity: p.quantity }))

  return {
    productCount,
    totalUnits,
    investment,
    potentialRevenue,
    realRevenue,
    potentialProfit,
    realProfit,
    averageMargin,
    averageTicket,
    salesCount,
    topProduct,
    mostProfitable,
    lowStock,
  }
}
