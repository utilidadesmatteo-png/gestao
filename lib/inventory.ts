import type { Product, Sale } from "./types"
import { unitProfit } from "./calculations"

const DAY = 24 * 60 * 60 * 1000
const VELOCITY_WINDOW_DAYS = 30
const ABC_WINDOW_DAYS = 90
const CRITICAL_DAYS = 7
const WARNING_DAYS = 15

export type StockStatus = "sem-estoque" | "critico" | "atencao" | "ok" | "parado" | "novo"
export type AbcClass = "A" | "B" | "C"

export type ProductInsight = {
  product: Product
  status: StockStatus
  dailySales: number
  daysLeft: number | null
  lastSaleAt: number | null
  soldLast30: number
  suggestedQty: number
  suggestedCost: number
  invested: number
  abc: AbcClass
  profit90: number
}

export const statusLabel: Record<StockStatus, string> = {
  "sem-estoque": "Sem estoque",
  critico: "Crítico",
  atencao: "Atenção",
  ok: "OK",
  parado: "Parado",
  novo: "Novo",
}

function classifyAbc(profits: Map<string, number>): Map<string, AbcClass> {
  const ranked = [...profits.entries()].sort((a, b) => b[1] - a[1])
  const total = ranked.reduce((sum, [, p]) => sum + Math.max(0, p), 0)
  const result = new Map<string, AbcClass>()
  let cumulative = 0
  for (const [id, profit] of ranked) {
    if (total <= 0 || profit <= 0) {
      result.set(id, "C")
      continue
    }
    // A classe é decidida pela fatia acumulada ANTES do produto entrar,
    // para que o maior produto seja sempre A mesmo que sozinho passe de 80%.
    const shareBefore = cumulative / total
    cumulative += profit
    result.set(id, shareBefore < 0.8 ? "A" : shareBefore < 0.95 ? "B" : "C")
  }
  return result
}

export function computeInsights(
  products: Product[],
  sales: Sale[],
  coverageDays: number,
  now: number = Date.now(),
): ProductInsight[] {
  const soldRecent = new Map<string, number>()
  const lastSale = new Map<string, number>()
  const profit90 = new Map<string, number>()

  for (const sale of sales) {
    const age = now - sale.createdAt
    if (age <= VELOCITY_WINDOW_DAYS * DAY) {
      soldRecent.set(sale.productId, (soldRecent.get(sale.productId) ?? 0) + sale.quantity)
    }
    if (age <= ABC_WINDOW_DAYS * DAY) {
      const profit = unitProfit(sale.costPrice, sale.salePrice) * sale.quantity
      profit90.set(sale.productId, (profit90.get(sale.productId) ?? 0) + profit)
    }
    if (sale.createdAt > (lastSale.get(sale.productId) ?? 0)) lastSale.set(sale.productId, sale.createdAt)
  }

  const abcInput = new Map(products.map((p) => [p.id, profit90.get(p.id) ?? 0]))
  const abc = classifyAbc(abcInput)

  return products.map((product) => {
    const ageDays = Math.max(1, (now - product.createdAt) / DAY)
    const windowDays = Math.min(VELOCITY_WINDOW_DAYS, ageDays)
    const sold = soldRecent.get(product.id) ?? 0
    const dailySales = sold / windowDays
    const daysLeft = dailySales > 0 ? product.quantity / dailySales : null

    let status: StockStatus
    if (product.quantity <= 0) status = "sem-estoque"
    else if (dailySales === 0) status = ageDays < VELOCITY_WINDOW_DAYS ? "novo" : "parado"
    else if (daysLeft !== null && daysLeft <= CRITICAL_DAYS) status = "critico"
    else if (daysLeft !== null && daysLeft <= WARNING_DAYS) status = "atencao"
    else status = "ok"

    const suggestedQty = Math.max(0, Math.ceil(dailySales * coverageDays - product.quantity))

    return {
      product,
      status,
      dailySales,
      daysLeft,
      lastSaleAt: lastSale.get(product.id) ?? null,
      soldLast30: sold,
      suggestedQty,
      suggestedCost: suggestedQty * product.costPrice,
      invested: product.costPrice * product.quantity,
      abc: abc.get(product.id) ?? "C",
      profit90: profit90.get(product.id) ?? 0,
    }
  })
}

export type InventoryTotals = {
  stockValue: number
  units: number
  criticalCount: number
  criticalRestockCost: number
  stagnantCount: number
  stagnantValue: number
  outOfStockCount: number
  totalRestockCost: number
}

export function computeTotals(insights: ProductInsight[]): InventoryTotals {
  const totals: InventoryTotals = {
    stockValue: 0,
    units: 0,
    criticalCount: 0,
    criticalRestockCost: 0,
    stagnantCount: 0,
    stagnantValue: 0,
    outOfStockCount: 0,
    totalRestockCost: 0,
  }
  for (const i of insights) {
    totals.stockValue += i.invested
    totals.units += Math.max(0, i.product.quantity)
    totals.totalRestockCost += i.suggestedCost
    if (i.status === "critico" || i.status === "sem-estoque") {
      totals.criticalCount += 1
      totals.criticalRestockCost += i.suggestedCost
    }
    if (i.status === "sem-estoque") totals.outOfStockCount += 1
    if (i.status === "parado") {
      totals.stagnantCount += 1
      totals.stagnantValue += i.invested
    }
  }
  return totals
}

export function formatDays(days: number | null): string {
  if (days === null) return "—"
  if (days < 1) return "< 1 dia"
  const rounded = Math.floor(days)
  if (rounded > 365) return "+ 1 ano"
  return `${rounded} ${rounded === 1 ? "dia" : "dias"}`
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts)
}
