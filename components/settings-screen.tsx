"use client"

import { useState } from "react"
import { useSettings, saveSettings, type ThemeMode } from "@/lib/settings"
import { DEFAULT_SHOPEE_FIXED, DEFAULT_SHOPEE_PERCENT, formatBRL } from "@/lib/calculations"
import { CurrencyInput } from "@/components/currency-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Percent, Store, Sun, Moon, Monitor, Check } from "lucide-react"

const themeOptions: { id: ThemeMode | "system"; label: string; icon: React.ReactNode }[] = [
  { id: "system", label: "Sistema", icon: <Monitor className="size-[18px]" /> },
  { id: "light", label: "Claro", icon: <Sun className="size-[18px]" /> },
  { id: "dark", label: "Escuro", icon: <Moon className="size-[18px]" /> },
]

export function SettingsScreen() {
  const settings = useSettings()

  // Estado local dos campos, iniciado com o que está salvo.
  const [commission, setCommission] = useState<string>(
    settings.commissionPercent != null ? String(settings.commissionPercent).replace(".", ",") : "",
  )
  const [fixedFee, setFixedFee] = useState<number | null>(settings.fixedFee)
  const [storeName, setStoreName] = useState<string>(settings.storeName)
  const [saved, setSaved] = useState(false)

  const commissionNumber = (() => {
    const parsed = Number.parseFloat(commission.replace(",", "."))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  })()

  function handleSave() {
    saveSettings({
      commissionPercent: commissionNumber,
      fixedFee,
      storeName: storeName.trim(),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleTheme(theme: ThemeMode | "system") {
    saveSettings({ theme: theme === "system" ? null : theme })
  }

  const activeTheme: ThemeMode | "system" = settings.theme ?? "system"

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {/* Taxas da Shopee */}
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Percent className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Taxas da Shopee</h2>
            <p className="text-sm text-muted-foreground text-pretty">
              Usadas em todos os cálculos de lucro, margem e na calculadora.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="commission">Comissão (%)</Label>
            <div className="relative">
              <Input
                id="commission"
                inputMode="decimal"
                value={commission}
                onChange={(e) => setCommission(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder={String(DEFAULT_SHOPEE_PERCENT * 100)}
                className="pr-9"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Padrão: {DEFAULT_SHOPEE_PERCENT * 100}%. Incide sobre o preço de venda.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fixed-fee">Taxa fixa por venda</Label>
            <CurrencyInput id="fixed-fee" value={fixedFee} onValueChange={setFixedFee} />
            <p className="text-xs text-muted-foreground">Padrão: {formatBRL(DEFAULT_SHOPEE_FIXED)} por item vendido.</p>
          </div>
        </div>
      </section>

      {/* Loja */}
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Store className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Loja</h2>
            <p className="text-sm text-muted-foreground text-pretty">O nome que identifica o seu negócio.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Label htmlFor="store-name">Nome da loja</Label>
          <Input
            id="store-name"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Minha Loja"
          />
        </div>
      </section>

      {/* Aparência */}
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sun className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Aparência</h2>
            <p className="text-sm text-muted-foreground text-pretty">
              Escolha o tema. &quot;Sistema&quot; segue a configuração do seu aparelho.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => {
            const active = activeTheme === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleTheme(opt.id)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            )
          })}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} className="gap-2">
          {saved ? (
            <>
              <Check className="size-4" />
              Salvo
            </>
          ) : (
            "Salvar alterações"
          )}
        </Button>
        <span className="text-xs text-muted-foreground">O tema é aplicado imediatamente ao selecionar.</span>
      </div>
    </div>
  )
}
