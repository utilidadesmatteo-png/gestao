"use client"

import { useSyncExternalStore } from "react"
import { createClient } from "@/lib/supabase/client"

export const RANK_SALES_THRESHOLD = 15
export const PROFIT_SALES_THRESHOLD = 100
export const ROAS_UNLOCK = 8
export const ROAS_RANK = 10
export const ROAS_TRACTION = 12
export const PROFIT_LADDER = [20, 25, 34]
export const DAILY_BUDGET = 10

export type RoasInputs = {
  productName: string
  salePrice: number
  productCost: number
  shopeePercent: number
  shopeeFixed: number
  otherCosts: number
  salesCount: number
  realRoas: number
  configuredRoas: number
  /** Vendas nos últimos 3 dias; null quando não informado. */
  recentSales?: number | null
}

export type RoasStatus =
  | "RANK"
  | "TRAÇÃO"
  | "LUCRO"
  | "ESCALAR"
  | "AJUSTAR"
  | "MANTER"
  | "MARGEM BAIXA"
  | "AGUARDANDO"

export type Direction = "AUMENTAR" | "DIMINUIR" | "MANTER" | null

export type Stage = "RANK" | "TRAÇÃO" | "LUCRO"

export type RoasAnalysis = {
  shopeeFee: number
  totalCostNoAds: number
  profitBeforeAds: number
  margin: number
  lowMargin: boolean
  breakEvenRoas: number
  stage: Stage
  stageTarget: number
  recommendedRoas: number
  cpa: number
  profitPerSale: number
  suggestedPrice: number | null
  suggestedPriceProfit: number
  noSales: boolean
  nextMilestone: number | null
  status: RoasStatus
  direction: Direction
  action: string
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.5

function stageOf(sales: number): Stage {
  if (sales < RANK_SALES_THRESHOLD) return "RANK"
  if (sales < PROFIT_SALES_THRESHOLD) return "TRAÇÃO"
  return "LUCRO"
}

// Menor preço terminado em ,90 que não dá prejuízo pagando ADS no ROAS informado.
function priceForRoas(input: RoasInputs, roas: number): number | null {
  const denom = 1 - input.shopeePercent / 100 - 1 / roas
  if (denom <= 0) return null
  const raw = (input.productCost + input.shopeeFixed + input.otherCosts) / denom
  return Math.ceil(raw - 0.9 - 1e-9) + 0.9
}

export function analyzeRoas(input: RoasInputs): RoasAnalysis {
  const sale = Math.max(input.salePrice, 0)
  const shopeeFee = sale * (input.shopeePercent / 100)
  const totalCostNoAds = input.productCost + shopeeFee + input.shopeeFixed + input.otherCosts
  const profitBeforeAds = sale - totalCostNoAds
  const margin = sale > 0 ? (profitBeforeAds / sale) * 100 : 0
  const lowMargin = sale > 0 && profitBeforeAds <= 0
  const breakEvenRoas = profitBeforeAds > 0 ? sale / profitBeforeAds : 0

  const stage = stageOf(input.salesCount)
  const stageTarget = stage === "RANK" ? ROAS_RANK : stage === "TRAÇÃO" ? ROAS_TRACTION : PROFIT_LADDER[0]
  const nextMilestone =
    stage === "RANK" ? RANK_SALES_THRESHOLD : stage === "TRAÇÃO" ? PROFIT_SALES_THRESHOLD : null

  const configured = input.configuredRoas
  const real = input.realRoas
  const noSales = input.recentSales === 0 && configured > 0

  let recommended = stageTarget
  let status: RoasStatus
  let direction: Direction = null
  let action: string

  if (sale <= 0) {
    status = "AGUARDANDO"
    action = "Preencha os dados do produto"
  } else if (stage !== "LUCRO") {
    const stageLabel = stage === "RANK" ? "15" : "100"
    if (noSales) {
      recommended = configured > ROAS_UNLOCK ? ROAS_UNLOCK : Math.max(configured - 2, 4)
      status = "AJUSTAR"
      direction = "DIMINUIR"
      action = `3 dias sem venda: baixe o ROAS para ${recommended}x. Não aumente.`
    } else if (configured <= 0) {
      status = stage
      action = `Configure ROAS ${stageTarget}x com R$ ${DAILY_BUDGET} por dia e deixe rodar 3 dias sem mexer`
    } else if (configured > stageTarget + 0.5) {
      status = "AJUSTAR"
      direction = "DIMINUIR"
      action = `ROAS ${formatRoas(configured)} é alto demais para esta fase. Baixe para ${stageTarget}x`
    } else if (configured < stageTarget - 0.5 && stage === "TRAÇÃO") {
      status = "AJUSTAR"
      direction = "AUMENTAR"
      action = `Bateu ${RANK_SALES_THRESHOLD} vendas: suba de ${formatRoas(configured)} para ${stageTarget}x`
    } else {
      recommended = near(configured, stageTarget) ? stageTarget : configured
      status = stage
      direction = "MANTER"
      action = `Mantenha ${formatRoas(recommended)} até bater ${stageLabel} vendas`
    }
  } else {
    const prev = [ROAS_TRACTION, ...PROFIT_LADDER].filter((r) => r < configured - 0.5).at(-1)
    const next = PROFIT_LADDER.find((r) => r > configured + 0.5)
    if (configured <= 0 || configured < PROFIT_LADDER[0] - 0.5) {
      recommended = PROFIT_LADDER[0]
      status = "LUCRO"
      direction = configured > 0 ? "AUMENTAR" : null
      action = `Bateu ${PROFIT_SALES_THRESHOLD} vendas: suba o ROAS para ${recommended}x para começar a lucrar`
    } else if (noSales) {
      recommended = prev ?? ROAS_TRACTION
      status = "AJUSTAR"
      direction = "DIMINUIR"
      action = `3 dias sem venda em ${formatRoas(configured)}: volte um degrau, para ${recommended}x`
    } else if (real <= 0) {
      recommended = configured
      status = "MANTER"
      direction = "MANTER"
      action = "Informe o ROAS real dos últimos 3 dias para saber se dá para subir"
    } else if (real >= configured - 0.01) {
      if (next) {
        recommended = next
        status = "ESCALAR"
        direction = "AUMENTAR"
        action = `ROAS real acima da meta: suba para ${next}x`
      } else {
        recommended = configured
        status = "MANTER"
        direction = "MANTER"
        action = `Topo da escada (${formatRoas(configured)}): mantenha e colha o lucro`
      }
    } else if (prev && prev >= PROFIT_LADDER[0]) {
      recommended = prev
      status = "AJUSTAR"
      direction = "DIMINUIR"
      action = `Entrega abaixo da meta: volte para ${prev}x`
    } else {
      recommended = configured
      status = "MANTER"
      direction = "MANTER"
      action = `Mantenha ${formatRoas(configured)} e acompanhe mais 3 dias`
    }
  }

  if (lowMargin) {
    status = "MARGEM BAIXA"
    direction = null
    action = "Mesmo sem ADS o produto dá prejuízo. Ajuste o preço antes de anunciar"
  }

  const cpa = sale > 0 && recommended > 0 ? sale / recommended : 0
  const profitPerSale = profitBeforeAds - cpa

  let suggestedPrice: number | null = null
  let suggestedPriceProfit = 0
  if (sale > 0 && profitPerSale < 0) {
    const roasForPrice = Math.max(recommended, ROAS_RANK)
    const p = priceForRoas(input, roasForPrice)
    if (p !== null && p > sale) {
      suggestedPrice = p
      suggestedPriceProfit =
        p - input.productCost - p * (input.shopeePercent / 100) - input.shopeeFixed - input.otherCosts - p / roasForPrice
    }
  }

  return {
    shopeeFee,
    totalCostNoAds,
    profitBeforeAds,
    margin,
    lowMargin,
    breakEvenRoas,
    stage,
    stageTarget,
    recommendedRoas: recommended,
    cpa,
    profitPerSale,
    suggestedPrice,
    suggestedPriceProfit,
    noSales,
    nextMilestone,
    status,
    direction,
    action,
  }
}

export function formatRoas(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—"
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",")
  return `${text}x`
}

export function formatPct(value: number, digits = 2): string {
  return `${value.toFixed(digits).replace(".", ",")}%`
}

// ---------- Histórico de análises ----------

export type RoasHistoryEntry = {
  id: string
  createdAt: string
  inputs: RoasInputs
  margin: number
  roasMin: number
  cpaMax: number
  status: RoasStatus
  action: string
}

type HistorySnapshot = {
  entries: RoasHistoryEntry[]
  loaded: boolean
  remote: boolean
}

const LOCAL_KEY = "gestao:roas-history"
const serverSnapshot: HistorySnapshot = { entries: [], loaded: false, remote: false }
let snapshot: HistorySnapshot = serverSnapshot
let started = false
const listeners = new Set<() => void>()

function setSnapshot(patch: Partial<HistorySnapshot>) {
  snapshot = { ...snapshot, ...patch }
  for (const l of listeners) l()
}

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === "42P01" || error.code === "PGRST205") return true
  return (error.message ?? "").toLowerCase().includes("roas_analyses")
}

function readLocal(): RoasHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(entries: RoasHistoryEntry[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(entries))
  } catch {}
}

type Row = {
  id: string
  created_at: string
  product_name: string
  inputs: RoasInputs
  margin: number
  roas_min: number
  cpa_max: number
  status: RoasStatus
  action: string
}

function fromRow(row: Row): RoasHistoryEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    inputs: { ...row.inputs, productName: row.product_name },
    margin: Number(row.margin),
    roasMin: Number(row.roas_min),
    cpaMax: Number(row.cpa_max),
    status: row.status,
    action: row.action,
  }
}

async function load() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("roas_analyses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    if (!isMissingTable(error)) console.error("Erro ao carregar histórico de ROAS:", error.message)
    setSnapshot({ entries: readLocal(), loaded: true, remote: false })
    return
  }
  setSnapshot({ entries: (data as Row[]).map(fromRow), loaded: true, remote: true })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!started) {
    started = true
    void load()
  }
  return () => {
    listeners.delete(listener)
  }
}

export function useRoasHistory() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot,
  )
}

export async function saveRoasAnalysis(inputs: RoasInputs, analysis: RoasAnalysis) {
  const entry: RoasHistoryEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    inputs,
    margin: analysis.margin,
    roasMin: analysis.recommendedRoas,
    cpaMax: analysis.cpa,
    status: analysis.status,
    action: analysis.action,
  }

  if (snapshot.remote) {
    const supabase = createClient()
    const { error } = await supabase.from("roas_analyses").insert({
      id: entry.id,
      product_name: inputs.productName,
      inputs,
      sales_count: inputs.salesCount,
      margin: entry.margin,
      roas_min: entry.roasMin,
      roas_configured: inputs.configuredRoas,
      roas_real: inputs.realRoas,
      cpa_max: entry.cpaMax,
      status: entry.status,
      action: entry.action,
    })
    if (!error) {
      setSnapshot({ entries: [entry, ...snapshot.entries] })
      return
    }
  }

  const entries = [entry, ...snapshot.entries].slice(0, 100)
  writeLocal(entries)
  setSnapshot({ entries })
}

export async function deleteRoasAnalysis(id: string) {
  const entries = snapshot.entries.filter((e) => e.id !== id)
  if (snapshot.remote) {
    const supabase = createClient()
    await supabase.from("roas_analyses").delete().eq("id", id)
  } else {
    writeLocal(entries)
  }
  setSnapshot({ entries })
}
