"use client"

import { useSyncExternalStore } from "react"
import type { Product, Sale, StoreState } from "./types"

const STORAGE_KEY = "estoque-shopee-v1"

const emptyState: StoreState = { products: [], sales: [] }

let state: StoreState = emptyState
let loaded = false
const listeners = new Set<() => void>()

function read(): StoreState {
  if (typeof window === "undefined") return emptyState
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState
    const parsed = JSON.parse(raw) as StoreState
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
    }
  } catch {
    return emptyState
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    state = read()
    loaded = true
  }
}

function persist() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}

function emit() {
  for (const listener of listeners) listener()
}

function setState(next: StoreState) {
  state = next
  persist()
  emit()
}

function subscribe(listener: () => void) {
  ensureLoaded()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): StoreState {
  ensureLoaded()
  return state
}

function getServerSnapshot(): StoreState {
  return emptyState
}

function id() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function addProduct(input: {
  name: string
  costPrice: number
  salePrice: number
  quantity: number
}) {
  const product: Product = {
    id: id(),
    name: input.name,
    costPrice: input.costPrice,
    salePrice: input.salePrice,
    quantity: input.quantity,
    createdAt: Date.now(),
  }
  setState({ ...state, products: [product, ...state.products] })
}

export function addStock(productId: string, amount: number) {
  setState({
    ...state,
    products: state.products.map((p) =>
      p.id === productId ? { ...p, quantity: p.quantity + amount } : p,
    ),
  })
}

export function removeProduct(productId: string) {
  setState({
    ...state,
    products: state.products.filter((p) => p.id !== productId),
  })
}

export function registerSale(input: {
  productId: string
  salePrice: number
  quantity: number
}) {
  const product = state.products.find((p) => p.id === input.productId)
  if (!product) return { ok: false as const, error: "Produto não encontrado." }
  if (input.quantity <= 0) return { ok: false as const, error: "Quantidade inválida." }
  if (input.quantity > product.quantity) {
    return { ok: false as const, error: "Quantidade maior que o estoque disponível." }
  }

  const sale: Sale = {
    id: id(),
    productId: product.id,
    productName: product.name,
    costPrice: product.costPrice,
    salePrice: input.salePrice,
    quantity: input.quantity,
    createdAt: Date.now(),
  }

  setState({
    products: state.products.map((p) =>
      p.id === product.id ? { ...p, quantity: p.quantity - input.quantity } : p,
    ),
    sales: [sale, ...state.sales],
  })

  return { ok: true as const }
}
