"use client"

import { useSyncExternalStore } from "react"
import { createClient } from "@/lib/supabase/client"

export const RANK_SALES_THRESHOLD = 15

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
}

export type RoasStatus = "RANK" | "ESCALAR" | "AJUSTAR" | "MANTER" | "MARGEM BAIXA" | "AGUARDANDO"

export type Direction = "AUMENTAR" | "DIMINUIR" | "MANTER" | null

export type RoasAnalysis = {
  shopeeFee: number
  totalCostNoAds: number
  profitBeforeAds: number
  margin: number
  lowMargin: boolean
  adsMaxPercent: number
  roasMinExact: number
  roasMin: number
  cpaMax: number
  phase: "RANK" | "ESCALA"
  rankRange: [number, number]
  status: RoasStatus
  direction: Direction
  action: string
  configuredBelowFloor: boolean
  atFloor: boolean
}

// Tabela de segurança: a margem define o teto de ADS, e o teto define o ROAS mínimo.
function adsTier(margin: number): { percent: number } | null {
  if (margin < 10) return null
  if (margin <= 15) return { percent: 3 }
  if (margin <= 20) return { percent: 5 }
  return { percent: 8 }
}

export function analyzeRoas(input: RoasInputs): RoasAnalysis {
  const sale = Math.max(input.salePrice, 0)
  const shopeeFee = sale * (input.shopeePercent / 100)
  const totalCostNoAds = input.productCost + shopeeFee + input.shopeeFixed + input.otherCosts
  const profitBeforeAds = sale - totalCostNoAds
  const margin = sale > 0 ? (profitBeforeAds / sale) * 100 : 0

  const tier = adsTier(margin)
  const lowMargin = tier === null
  const adsMaxPercent = tier?.percent ?? 0
  const roasMinExact = adsMaxPercent > 0 ? 100 / adsMaxPercent : 0
  // Arredonda para cima; o epsilon evita que 20,0000001 vire 21.
  const roasMin = roasMinExact > 0 ? Math.ceil(roasMinExact - 1e-9) : 0
  const cpaMax = sale * (adsMaxPercent / 100)

  const phase = input.salesCount < RANK_SALES_THRESHOLD ? "RANK" : "ESCALA"
  const rankRange: [number, number] = [roasMin + 1, roasMin + 2]

  const configuredBelowFloor = !lowMargin && input.configuredRoas > 0 && input.configuredRoas < roasMin
  const atFloor = !lowMargin && input.configuredRoas > 0 && input.configuredRoas <= roasMin

  let status: RoasStatus
  let direction: Direction = null
  let action: string

  if (sale <= 0) {
    status = "AGUARDANDO"
    action = "Preencha os dados do produto"
  } else if (lowMargin) {
    status = "MARGEM BAIXA"
    action = "Revisar preço, custo ou taxas antes de investir em ADS"
  } else if (phase === "RANK") {
    status = "RANK"
    action = `Usar ROAS entre ${rankRange[0]}x e ${rankRange[1]}x`
  } else if (input.realRoas <= 0 || input.configuredRoas <= 0) {
    status = "AGUARDANDO"
    action = "Informe o ROAS configurado e o ROAS real dos últimos 3 dias"
  } else if (configuredBelowFloor) {
    status = "AJUSTAR"
    direction = "AUMENTAR"
    action = `Subir o ROAS da campanha para no mínimo ${roasMin}x`
  } else if (Math.abs(input.realRoas - input.configuredRoas) < 0.01) {
    status = "MANTER"
    direction = "MANTER"
    action = "Manter o ROAS atual"
  } else if (input.realRoas > input.configuredRoas) {
    status = "ESCALAR"
    direction = "AUMENTAR"
    action = "Aumentar gradualmente o ROAS alvo"
  } else if (atFloor) {
    // Já está no piso: a lógica pediria redução, mas o limite de segurança impede.
    status = "AJUSTAR"
    direction = "MANTER"
    action = `Manter em ${roasMin}x (limite de segurança)`
  } else {
    status = "AJUSTAR"
    direction = "DIMINUIR"
    action = `Diminuir o ROAS da campanha, sem ficar abaixo de ${roasMin}x`
  }

  return {
    shopeeFee,
    totalCostNoAds,
    profitBeforeAds,
    margin,
    lowMargin,
    adsMaxPercent,
    roasMinExact,
    roasMin,
    cpaMax,
    phase,
    rankRange,
    status,
    direction,
    action,
    configuredBelowFloor,
    atFloor,
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
    roasMin: analysis.roasMin,
    cpaMax: analysis.cpaMax,
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
