"use client"

import { useSyncExternalStore } from "react"
import { setFeeConfig } from "./calculations"

export type ThemeMode = "light" | "dark"

export type Settings = {
  // Comissão em percentual "humano" (ex.: 20 = 20%). null = ainda não configurado.
  commissionPercent: number | null
  // Taxa fixa por venda em reais. null = ainda não configurado.
  fixedFee: number | null
  storeName: string
  // null = seguir o tema do sistema (comportamento padrão até o usuário escolher).
  theme: ThemeMode | null
}

const STORAGE_KEY = "estoque-shopee:settings"

const defaultSettings: Settings = {
  commissionPercent: null,
  fixedFee: null,
  storeName: "",
  theme: null,
}

let settings: Settings = defaultSettings
const listeners = new Set<() => void>()
let initialized = false

function emit() {
  for (const listener of listeners) listener()
}

// Aplica o tema escolhido às classes do <html>. O globals.css usa
// `.dark` e `.light` para sobrescrever o tema do sistema.
function applyTheme(theme: ThemeMode | null) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.classList.remove("dark", "light")
  if (theme === "dark") root.classList.add("dark")
  else if (theme === "light") root.classList.add("light")
  // theme === null: sem classe, segue prefers-color-scheme do sistema.
}

// Mantém as taxas da calculadora em sincronia com as configurações.
// commissionPercent é "humano" (20) e vira fração (0.2) para os cálculos.
function syncFees(s: Settings) {
  const percent = s.commissionPercent != null ? s.commissionPercent / 100 : null
  setFeeConfig(percent, s.fixedFee)
}

function load() {
  if (initialized) return
  initialized = true
  if (typeof window === "undefined") return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>
      settings = {
        commissionPercent:
          typeof parsed.commissionPercent === "number" && Number.isFinite(parsed.commissionPercent)
            ? parsed.commissionPercent
            : null,
        fixedFee:
          typeof parsed.fixedFee === "number" && Number.isFinite(parsed.fixedFee) ? parsed.fixedFee : null,
        storeName: typeof parsed.storeName === "string" ? parsed.storeName : "",
        theme: parsed.theme === "dark" || parsed.theme === "light" ? parsed.theme : null,
      }
    }
  } catch {
    // Ignora dados corrompidos e mantém os padrões.
  }
  syncFees(settings)
  applyTheme(settings.theme)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  load()
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): Settings {
  return settings
}

function getServerSnapshot(): Settings {
  return defaultSettings
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// Persiste uma alteração parcial. Atualiza taxas/tema na hora e salva no
// localStorage para que as configurações fiquem permanentes entre sessões.
export function saveSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch }
  syncFees(settings)
  applyTheme(settings.theme)
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    }
  } catch {
    // Sem persistência disponível: mantém em memória ao menos nesta sessão.
  }
  emit()
}
