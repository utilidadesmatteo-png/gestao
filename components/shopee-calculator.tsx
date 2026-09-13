"use client"

import { useState } from "react"
import { CurrencyInput } from "@/components/currency-input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  computeCalculator,
  formatBRL,
  formatPercent,
  SHOPEE_FIXED,
  SHOPEE_PERCENT,
  type ExtraCost,
} from "@/lib/calculations"
import { Plus, Trash2, Package, Megaphone, Truck, TrendingUp } from "lucide-react"

export function ShopeeCalculator() {
  const [costPrice, setCostPrice] = useState(0)
  const [salePrice, setSalePrice] = useState(0)
  const [packaging, setPackaging] = useState(0)
  const [ads, setAds] = useState(0)
  const [freight, setFreight] = useState(0)
  const [extras, setExtras] = useState<ExtraCost[]>([])

  const result = computeCalculator({ costPrice, salePrice, packaging, ads, freight, extras })

  function addExtra() {
    setExtras((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", value: 0 },
    ])
  }

  function updateExtra(id: string, patch: Partial<ExtraCost>) {
    setExtras((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function removeExtra(id: string) {
    setExtras((prev) => prev.filter((e) => e.id !== id))
  }

  const profitPositive = result.netProfit >= 0

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* Entradas */}
      <div className="flex flex-col gap-6">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Produto
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calc-cost">Custo do produto</Label>
              <CurrencyInput id="calc-cost" value={costPrice} onValueChange={setCostPrice} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calc-sale">Preço de venda</Label>
              <CurrencyInput id="calc-sale" value={salePrice} onValueChange={setSalePrice} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Custos adicionais
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calc-pack" className="flex items-center gap-1.5">
                <Package className="size-3.5 text-muted-foreground" /> Embalagem
              </Label>
              <CurrencyInput id="calc-pack" value={packaging} onValueChange={setPackaging} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calc-ads" className="flex items-center gap-1.5">
                <Megaphone className="size-3.5 text-muted-foreground" /> Shopee Ads
              </Label>
              <CurrencyInput id="calc-ads" value={ads} onValueChange={setAds} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calc-freight" className="flex items-center gap-1.5">
                <Truck className="size-3.5 text-muted-foreground" /> Frete
              </Label>
              <CurrencyInput id="calc-freight" value={freight} onValueChange={setFreight} />
            </div>
          </div>

          {extras.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              {extras.map((extra) => (
                <div key={extra.id} className="flex items-end gap-2">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor={`extra-label-${extra.id}`} className="text-xs">
                      Nome do custo
                    </Label>
                    <Input
                      id={`extra-label-${extra.id}`}
                      value={extra.label}
                      onChange={(e) => updateExtra(extra.id, { label: e.target.value })}
                      placeholder="Ex.: etiqueta, brinde"
                    />
                  </div>
                  <div className="flex w-32 flex-col gap-1.5">
                    <Label htmlFor={`extra-value-${extra.id}`} className="text-xs">
                      Valor
                    </Label>
                    <CurrencyInput
                      id={`extra-value-${extra.id}`}
                      value={extra.value}
                      onValueChange={(v) => updateExtra(extra.id, { value: v })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeExtra(extra.id)}
                    aria-label="Remover custo"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={addExtra}>
            <Plus className="size-4" /> Adicionar custo extra
          </Button>
        </section>
      </div>

      {/* Resultado */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b bg-muted/40 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4" /> Resultado da simulação
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`text-3xl font-bold tracking-tight ${profitPositive ? "text-[var(--color-profit)]" : "text-destructive"}`}
              >
                {formatBRL(result.netProfit)}
              </span>
              <span className="text-sm text-muted-foreground">lucro líquido / venda</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-background p-3">
                <p className="text-xs text-muted-foreground">Margem</p>
                <p
                  className={`mt-0.5 text-lg font-semibold ${profitPositive ? "text-[var(--color-profit)]" : "text-destructive"}`}
                >
                  {formatPercent(result.margin)}
                </p>
              </div>
              <div className="rounded-lg bg-background p-3">
                <p className="text-xs text-muted-foreground">ROI (sobre o custo)</p>
                <p
                  className={`mt-0.5 text-lg font-semibold ${profitPositive ? "text-[var(--color-profit)]" : "text-destructive"}`}
                >
                  {formatPercent(result.roi)}
                </p>
              </div>
            </div>
          </div>

          <dl className="flex flex-col divide-y text-sm">
            <Row label="Preço de venda" value={formatBRL(salePrice)} />
            <Row label="Custo do produto" value={`- ${formatBRL(costPrice)}`} muted />
            <Row
              label={`Comissão Shopee (${SHOPEE_PERCENT * 100}%)`}
              value={`- ${formatBRL(result.commission)}`}
              muted
            />
            <Row label="Taxa fixa" value={`- ${formatBRL(result.fixedFee)}`} muted />
            <Row label="Embalagem" value={`- ${formatBRL(packaging)}`} muted />
            <Row label="Shopee Ads" value={`- ${formatBRL(ads)}`} muted />
            <Row label="Frete" value={`- ${formatBRL(freight)}`} muted />
            {result.extrasTotal > 0 && (
              <Row label="Custos extras" value={`- ${formatBRL(result.extrasTotal)}`} muted />
            )}
            <Row label="Custo total" value={formatBRL(result.totalCost)} strong />
            <Row
              label="Lucro líquido"
              value={formatBRL(result.netProfit)}
              strong
              highlight={profitPositive ? "profit" : "loss"}
            />
          </dl>
        </div>
      </aside>
    </div>
  )
}

function Row({
  label,
  value,
  muted,
  strong,
  highlight,
}: {
  label: string
  value: string
  muted?: boolean
  strong?: boolean
  highlight?: "profit" | "loss"
}) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <dt className={`${muted ? "text-muted-foreground" : ""} ${strong ? "font-semibold" : ""}`}>
        {label}
      </dt>
      <dd
        className={`tabular-nums ${strong ? "font-semibold" : ""} ${
          highlight === "profit"
            ? "text-[var(--color-profit)]"
            : highlight === "loss"
              ? "text-destructive"
              : ""
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
