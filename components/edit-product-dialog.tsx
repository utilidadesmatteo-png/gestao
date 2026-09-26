"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CurrencyInput } from "@/components/currency-input"
import { Plus, Trash2, Package, Megaphone, Truck } from "lucide-react"
import type { Product } from "@/lib/types"
import { updateProduct } from "@/lib/store"
import { formatBRL, formatPercent, unitProfit, profitMargin, shopeeFee } from "@/lib/calculations"

// Custo extra em edição: o valor pode ficar vazio (null) enquanto o usuário digita.
type EditableExtra = { id: string; label: string; value: number | null }

// Atalhos de custos comuns. Ao clicar, o custo é adicionado à lista.
const quickCosts = [
  { label: "Embalagem", icon: Package },
  { label: "Shopee Ads", icon: Megaphone },
  { label: "Frete", icon: Truck },
] as const

// Soma dos custos extras já salvos no produto.
function storedExtrasTotal(product: Product) {
  return product.extraCosts.reduce((acc, e) => acc + e.value, 0)
}

// Custo base = investimento total salvo - custos extras salvos (arredondado em centavos).
function baseCostOf(product: Product) {
  const base = product.costPrice - storedExtrasTotal(product)
  return Math.max(0, Math.round(base * 100) / 100)
}

function extrasFromProduct(product: Product): EditableExtra[] {
  return product.extraCosts.map((e) => ({ id: crypto.randomUUID(), label: e.label, value: e.value }))
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(product.name)
  const [cost, setCost] = useState<number | null>(baseCostOf(product))
  const [sale, setSale] = useState<number | null>(product.salePrice)
  const [quantity, setQuantity] = useState(String(product.quantity))
  const [extras, setExtras] = useState<EditableExtra[]>(extrasFromProduct(product))
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  // Ao (re)abrir, reinicia os campos com os dados atuais do produto.
  function reset() {
    setName(product.name)
    setCost(baseCostOf(product))
    setSale(product.salePrice)
    setQuantity(String(product.quantity))
    setExtras(extrasFromProduct(product))
    setError("")
  }

  function addExtra(label = "") {
    setExtras((prev) => [...prev, { id: crypto.randomUUID(), label, value: null }])
  }

  function updateExtra(id: string, patch: Partial<EditableExtra>) {
    setExtras((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function removeExtra(id: string) {
    setExtras((prev) => prev.filter((e) => e.id !== id))
  }

  const extrasTotal = extras.reduce((acc, e) => acc + (e.value ?? 0), 0)
  const hasValues = cost !== null && sale !== null
  // Investimento do bolso por unidade: preço de custo + custos adicionais.
  const investment = hasValues ? cost + extrasTotal : null
  const fee = sale !== null ? shopeeFee(sale) : null
  const totalCost = investment !== null && fee !== null ? investment + fee : null
  const profit = investment !== null && sale !== null ? unitProfit(investment, sale) : null
  const margin = investment !== null && sale !== null ? profitMargin(investment, sale) : null
  // ROI: retorno sobre o investimento do bolso (custo + custos adicionais, sem taxas da Shopee).
  const roi = investment !== null && investment > 0 && profit !== null ? (profit / investment) * 100 : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = Number.parseInt(quantity, 10)
    if (!name.trim()) return setError("Informe o nome do produto.")
    if (cost === null || cost < 0) return setError("Custo inválido.")
    if (sale === null || sale < 0) return setError("Preço de venda inválido.")
    if (!Number.isInteger(q) || q < 0) return setError("Quantidade inválida.")

    // Guarda o detalhamento e o investimento total (custo base + extras).
    const cleanedExtras = extras
      .filter((e) => (e.value ?? 0) > 0)
      .map((e) => ({ label: e.label.trim() || "Custo extra", value: e.value ?? 0 }))

    setSaving(true)
    const result = await updateProduct(product.id, {
      name: name.trim(),
      costPrice: cost + extrasTotal,
      salePrice: sale,
      quantity: q,
      extraCosts: cleanedExtras,
    })
    setSaving(false)
    if (!result.ok) return setError(result.error)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (o) reset()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>
          <DialogDescription>Altere o nome, os preços, os custos adicionais e a quantidade.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Nome do produto</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Fone Bluetooth"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-cost">Preço de custo</Label>
              <CurrencyInput id="edit-cost" value={cost} onValueChange={setCost} placeholder="0,00" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-sale">Preço de venda</Label>
              <CurrencyInput id="edit-sale" value={sale} onValueChange={setSale} placeholder="0,00" />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Custos adicionais (por unidade)</Label>
              <span className="text-xs text-muted-foreground">{formatBRL(extrasTotal)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickCosts.map(({ label, icon: Icon }) => (
                <Button key={label} type="button" variant="outline" size="sm" onClick={() => addExtra(label)}>
                  <Icon className="size-3.5" />
                  {label}
                </Button>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addExtra()}>
                <Plus className="size-3.5" />
                Outro
              </Button>
            </div>

            {extras.length > 0 ? (
              <div className="grid gap-2 pt-1">
                {extras.map((extra) => (
                  <div key={extra.id} className="flex items-center gap-2">
                    <Input
                      value={extra.label}
                      onChange={(e) => updateExtra(extra.id, { label: e.target.value })}
                      placeholder="Descrição do custo"
                      className="flex-1"
                    />
                    <CurrencyInput
                      value={extra.value}
                      onValueChange={(v) => updateExtra(extra.id, { value: v })}
                      placeholder="0,00"
                      className="w-28"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExtra(extra.id)}
                      aria-label="Remover custo"
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-qty">Quantidade em estoque</Label>
            <Input
              id="edit-qty"
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>

          {hasValues && totalCost !== null && fee !== null && profit !== null && margin !== null ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Resumo por unidade
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Preço de custo</span>
                  <span className="font-medium">{formatBRL(cost!)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Custos adicionais</span>
                  <span className="font-medium">{formatBRL(extrasTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Taxa Shopee (20% + R$ 4,50)</span>
                  <span className="font-medium text-destructive">{formatBRL(fee)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-muted-foreground">Custo total</span>
                  <span className="font-semibold">{formatBRL(totalCost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Preço de venda</span>
                  <span className="font-medium">{formatBRL(sale!)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-muted-foreground">Lucro líquido</span>
                  <span className={profit >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>
                    {formatBRL(profit)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Margem</span>
                  <span className={margin >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>
                    {formatPercent(margin)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ROI</span>
                  <span
                    className={
                      (roi ?? 0) >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"
                    }
                  >
                    {roi !== null ? formatPercent(roi) : "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
