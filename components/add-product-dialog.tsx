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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CurrencyInput } from "@/components/currency-input"
import { Plus, Trash2, Package, Megaphone, Truck } from "lucide-react"
import { addProduct } from "@/lib/store"
import { formatBRL, formatPercent, unitProfit, profitMargin } from "@/lib/calculations"

// Custo extra em edição: o valor pode ficar vazio (null) enquanto o usuário digita.
type EditableExtra = { id: string; label: string; value: number | null }

// Atalhos de custos comuns. Ao clicar, o custo é adicionado à lista.
const quickCosts = [
  { label: "Embalagem", icon: Package },
  { label: "Shopee Ads", icon: Megaphone },
  { label: "Frete", icon: Truck },
] as const

export function AddProductDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [cost, setCost] = useState<number | null>(null)
  const [sale, setSale] = useState<number | null>(null)
  const [quantity, setQuantity] = useState("")
  const [extras, setExtras] = useState<EditableExtra[]>([])
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const extrasTotal = extras.reduce((acc, e) => acc + (e.value ?? 0), 0)
  const hasValues = cost !== null && sale !== null
  const totalCost = hasValues ? cost + extrasTotal : null
  const profit = totalCost !== null && sale !== null ? unitProfit(totalCost, sale) : null
  const margin = totalCost !== null && sale !== null ? profitMargin(totalCost, sale) : null

  function addExtra(label = "") {
    setExtras((prev) => [...prev, { id: crypto.randomUUID(), label, value: null }])
  }

  function updateExtra(id: string, patch: Partial<EditableExtra>) {
    setExtras((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function removeExtra(id: string) {
    setExtras((prev) => prev.filter((e) => e.id !== id))
  }

  function reset() {
    setName("")
    setCost(null)
    setSale(null)
    setQuantity("")
    setExtras([])
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = Number.parseInt(quantity, 10)
    if (!name.trim()) return setError("Informe o nome do produto.")
    if (cost === null || cost < 0) return setError("Custo inválido.")
    if (sale === null || sale < 0) return setError("Preço de venda inválido.")
    if (!Number.isInteger(q) || q < 0) return setError("Quantidade inválida.")

    setSaving(true)
    // O custo salvo é o investimento total por unidade: preço de custo + custos adicionais.
    const result = await addProduct({
      name: name.trim(),
      costPrice: cost + extrasTotal,
      salePrice: sale,
      quantity: q,
    })
    setSaving(false)
    if (!result.ok) return setError(result.error)
    reset()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger render={<Button className="shadow-sm" />}>
        <Plus className="size-4" />
        Adicionar produto
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar produto ao estoque</DialogTitle>
          <DialogDescription>
            Cadastre um produto com custo, custos adicionais, preço de venda e quantidade inicial.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="product-name">Nome do produto</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Fone Bluetooth"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="product-cost">Preço de custo</Label>
              <CurrencyInput
                id="product-cost"
                value={cost}
                onValueChange={setCost}
                placeholder="0,00"
                autoDecimal
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-sale">Preço de venda</Label>
              <CurrencyInput
                id="product-sale"
                value={sale}
                onValueChange={setSale}
                placeholder="0,00"
                autoDecimal
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Custos adicionais (por unidade)</Label>
              <span className="text-xs text-muted-foreground">{formatBRL(extrasTotal)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickCosts.map(({ label, icon: Icon }) => (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addExtra(label)}
                >
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
                      autoDecimal
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
            <Label htmlFor="product-qty">Quantidade inicial</Label>
            <Input
              id="product-qty"
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>

          {hasValues && totalCost !== null && profit !== null && margin !== null ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Resumo por unidade (com taxa Shopee)
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Custo total</span>
                  <span className="font-medium">{formatBRL(totalCost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Venda</span>
                  <span className="font-medium">{formatBRL(sale!)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lucro</span>
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
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
