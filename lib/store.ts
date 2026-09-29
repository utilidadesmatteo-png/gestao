"use client"

import { useSyncExternalStore } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ExtraCost, Product, Restock, Sale } from "./types"

type StoreSnapshot = {
  products: Product[]
  sales: Sale[]
  restocks: Restock[]
  restocksAvailable: boolean
  loading: boolean
  loaded: boolean
}

let snapshot: StoreSnapshot = {
  products: [],
  sales: [],
  restocks: [],
  restocksAvailable: false,
  loading: false,
  loaded: false,
}
const listeners = new Set<() => void>()
let started = false

function emit() {
  for (const listener of listeners) listener()
}

function setSnapshot(patch: Partial<StoreSnapshot>) {
  snapshot = { ...snapshot, ...patch }
  emit()
}

// Lê a lista de custos extras (JSONB) de forma tolerante a dados inválidos.
function parseExtraCosts(raw: unknown): ExtraCost[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const value = Number((item as { value?: unknown }).value)
    if (!Number.isFinite(value)) return []
    const label = String((item as { label?: unknown }).label ?? "")
    return [{ label, value }]
  })
}

// Detecta o erro de "coluna extra_costs inexistente" para permitir fallback
// enquanto a migração no banco não foi aplicada.
function isMissingExtraCosts(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  if (error.code === "PGRST204" || error.code === "42703") return true
  return (error.message ?? "").toLowerCase().includes("extra_costs")
}

// Reserva local do detalhamento dos custos extras, usada enquanto a coluna
// extra_costs não existe no banco. O custo total continua salvo no banco.
const LOCAL_EXTRAS_KEY = "gestao:extra-costs"

function readLocalExtras(): Record<string, ExtraCost[]> {
  if (typeof window === "undefined") return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_EXTRAS_KEY) ?? "{}")
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeLocalExtras(productId: string, extras: ExtraCost[] | null) {
  if (typeof window === "undefined") return
  const all = readLocalExtras()
  if (extras && extras.length > 0) all[productId] = extras
  else delete all[productId]
  window.localStorage.setItem(LOCAL_EXTRAS_KEY, JSON.stringify(all))
}

// Converte as linhas do banco (snake_case) para os tipos do app (camelCase).
function mapProduct(row: Record<string, unknown>, localExtras: Record<string, ExtraCost[]>): Product {
  const id = String(row.id)
  const dbExtras = parseExtraCosts(row.extra_costs)
  return {
    id,
    name: String(row.name),
    costPrice: Number(row.cost_price),
    salePrice: Number(row.sale_price),
    quantity: Number(row.quantity),
    extraCosts: dbExtras.length > 0 ? dbExtras : parseExtraCosts(localExtras[id]),
    createdAt: row.created_at ? Date.parse(String(row.created_at)) : Date.now(),
  }
}

function mapSale(row: Record<string, unknown>): Sale {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productName: String(row.product_name),
    costPrice: Number(row.cost_price),
    salePrice: Number(row.sale_price),
    quantity: Number(row.quantity),
    createdAt: row.created_at ? Date.parse(String(row.created_at)) : Date.now(),
  }
}

function mapRestock(row: Record<string, unknown>): Restock {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productName: String(row.product_name ?? ""),
    quantity: Number(row.quantity),
    costPrice: Number(row.cost_price ?? 0),
    createdAt: row.created_at ? Date.parse(String(row.created_at)) : Date.now(),
  }
}

// Envia ao banco os extras que ficaram guardados só neste navegador
// (salvos antes da coluna extra_costs existir) e limpa a cópia local.
async function migrateLocalExtras(
  supabase: ReturnType<typeof createClient>,
  rows: Record<string, unknown>[],
  localExtras: Record<string, ExtraCost[]>,
) {
  for (const row of rows) {
    const id = String(row.id)
    const local = parseExtraCosts(localExtras[id])
    if (local.length === 0) continue
    if (parseExtraCosts(row.extra_costs).length > 0) {
      writeLocalExtras(id, null)
      continue
    }
    const { error } = await supabase.from("products").update({ extra_costs: local }).eq("id", id)
    if (error) return
    row.extra_costs = local
    writeLocalExtras(id, null)
  }
}

export async function refresh() {
  const supabase = createClient()
  setSnapshot({ loading: true })

  const [productsRes, salesRes, restocksRes] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("sales").select("*").order("created_at", { ascending: false }),
    supabase.from("restocks").select("*").order("created_at", { ascending: false }),
  ])

  if (productsRes.error) console.log("[v0] products fetch error:", productsRes.error.message)
  if (salesRes.error) console.log("[v0] sales fetch error:", salesRes.error.message)

  const localExtras = readLocalExtras()
  await migrateLocalExtras(supabase, productsRes.data ?? [], localExtras)
  setSnapshot({
    products: (productsRes.data ?? []).map((row) => mapProduct(row, localExtras)),
    sales: (salesRes.data ?? []).map(mapSale),
    // A tabela restocks é opcional: sem ela o histórico mostra só as vendas.
    restocks: restocksRes.error ? [] : (restocksRes.data ?? []).map(mapRestock),
    restocksAvailable: !restocksRes.error,
    loading: false,
    loaded: true,
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!started) {
    started = true
    void refresh()
  }
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): StoreSnapshot {
  return snapshot
}

const serverSnapshot: StoreSnapshot = {
  products: [],
  sales: [],
  restocks: [],
  restocksAvailable: false,
  loading: false,
  loaded: false,
}
function getServerSnapshot(): StoreSnapshot {
  return serverSnapshot
}

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

type Result = { ok: true } | { ok: false; error: string }

export async function addProduct(input: {
  name: string
  costPrice: number
  salePrice: number
  quantity: number
  extraCosts?: ExtraCost[]
}): Promise<Result> {
  const supabase = createClient()

  const base = {
    name: input.name,
    cost_price: input.costPrice,
    sale_price: input.salePrice,
    quantity: input.quantity,
  }
  const extras = input.extraCosts ?? []

  let { data, error } = await supabase
    .from("products")
    .insert({ ...base, extra_costs: extras })
    .select("id")
    .single()
  // Se a coluna extra_costs ainda não existe no banco, salva sem o detalhamento.
  let savedLocally = false
  if (error && isMissingExtraCosts(error)) {
    ;({ data, error } = await supabase.from("products").insert(base).select("id").single())
    savedLocally = true
  }

  if (error) {
    console.log("[v0] addProduct error:", error.message)
    return { ok: false, error: "Não foi possível salvar o produto." }
  }

  if (savedLocally && data?.id) writeLocalExtras(String(data.id), extras)

  await refresh()
  return { ok: true }
}

export async function updateProduct(
  productId: string,
  patch: { name?: string; costPrice?: number; salePrice?: number; quantity?: number; extraCosts?: ExtraCost[] },
): Promise<Result> {
  const supabase = createClient()

  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.costPrice !== undefined) row.cost_price = patch.costPrice
  if (patch.salePrice !== undefined) row.sale_price = patch.salePrice
  if (patch.quantity !== undefined) row.quantity = patch.quantity

  let error
  let savedLocally = false
  if (patch.extraCosts !== undefined) {
    ;({ error } = await supabase
      .from("products")
      .update({ ...row, extra_costs: patch.extraCosts })
      .eq("id", productId))
    // Se a coluna extra_costs ainda não existe, salva o resto normalmente.
    if (error && isMissingExtraCosts(error)) {
      ;({ error } = await supabase.from("products").update(row).eq("id", productId))
      savedLocally = true
    }
  } else {
    ;({ error } = await supabase.from("products").update(row).eq("id", productId))
  }

  if (error) {
    console.log("[v0] updateProduct error:", error.message)
    return { ok: false, error: "Não foi possível salvar as alterações." }
  }

  if (patch.extraCosts !== undefined) {
    writeLocalExtras(productId, savedLocally ? patch.extraCosts : null)
  }

  await refresh()
  return { ok: true }
}

export async function addStock(productId: string, amount: number): Promise<Result> {
  const supabase = createClient()
  const product = snapshot.products.find((p) => p.id === productId)
  if (!product) return { ok: false, error: "Produto não encontrado." }

  const { error } = await supabase
    .from("products")
    .update({ quantity: product.quantity + amount })
    .eq("id", productId)

  if (error) {
    console.log("[v0] addStock error:", error.message)
    return { ok: false, error: "Não foi possível repor o estoque." }
  }

  if (snapshot.restocksAvailable) {
    const { error: logError } = await supabase.from("restocks").insert({
      product_id: product.id,
      product_name: product.name,
      quantity: amount,
      cost_price: product.costPrice,
    })
    if (logError) console.log("[v0] restock log error:", logError.message)
  }

  await refresh()
  return { ok: true }
}

export async function removeProduct(productId: string): Promise<Result> {
  const supabase = createClient()
  const { error } = await supabase.from("products").delete().eq("id", productId)

  if (error) {
    console.log("[v0] removeProduct error:", error.message)
    return { ok: false, error: "Não foi possível excluir o produto." }
  }

  writeLocalExtras(productId, null)

  await refresh()
  return { ok: true }
}

export async function registerSale(input: {
  productId: string
  salePrice: number
  quantity: number
}): Promise<Result> {
  const supabase = createClient()

  const product = snapshot.products.find((p) => p.id === input.productId)
  if (!product) return { ok: false, error: "Produto não encontrado." }
  if (input.quantity <= 0) return { ok: false, error: "Quantidade inválida." }
  if (input.quantity > product.quantity) {
    return { ok: false, error: "Quantidade maior que o estoque disponível." }
  }

  const { error: saleError } = await supabase.from("sales").insert({
    product_id: product.id,
    product_name: product.name,
    cost_price: product.costPrice,
    sale_price: input.salePrice,
    quantity: input.quantity,
  })

  if (saleError) {
    console.log("[v0] registerSale insert error:", saleError.message)
    return { ok: false, error: "Não foi possível registrar a venda." }
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ quantity: product.quantity - input.quantity })
    .eq("id", product.id)

  if (updateError) {
    console.log("[v0] registerSale stock update error:", updateError.message)
    return { ok: false, error: "Venda registrada, mas o estoque não baixou. Recarregue a página." }
  }

  await refresh()
  return { ok: true }
}
