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
import { ShoppingCart, Check, Minus, Plus } from "lucide-react"
import { registerSale, useStore } from "@/lib/store"
import { formatBRL, unitProfit } from "@/lib/calculations"
import { cn } from "@/lib/utils"

export function RegisterSaleDialog() {
  const { products } = useStore()
  const [open, setOpen] = useState(false)
  const [productId, setProductId] = useState("")
  const [price, setPrice] = useState<number | null>(null)
  const [qtyText, setQtyText] = useState("1")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const selected = products.find((p) => p.id === productId)
  const maxQty = selected?.quantity ?? 0
  const quantity = Number.parseInt(qtyText, 10)
  const qtyValid = Number.isInteger(quantity) && quantity >= 1 && quantity <= maxQty
  const preview =
    selected && price !== null && qtyValid ? unitProfit(selected.costPrice, price) * quantity : null

  const hasStock = products.some((p) => p.quantity > 0)
  const available = products.filter((p) => p.quantity > 0)

  function reset() {
    setProductId("")
    setPrice(null)
    setQtyText("1")
    setError("")
  }

  function selectProduct(id: string) {
    setProductId(id)
    setError("")
    const p = products.find((x) => x.id === id)
    if (p) {
      setPrice(p.salePrice)
      setQtyText("1")
    }
  }

  function changeQty(next: number) {
    const base = Number.isFinite(next) ? next : 1
    const clamped = Math.max(1, Math.min(base, maxQty || 1))
    setQtyText(String(clamped))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return setError("Selecione um produto.")
    if (price === null || price < 0) return setError("Preço de venda inválido.")
    if (!qtyValid) return setError("Quantidade inválida.")

    setSaving(true)
    const result = await registerSale({ productId, salePrice: price, quantity })
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
      <DialogTrigger
        render={<Button variant="secondary" className="shadow-sm" disabled={!hasStock} />}
      >
        <ShoppingCart className="size-4" />
        Registrar venda
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar venda</DialogTitle>
          <DialogDescription>
            Escolha o produto, ajuste o preço e a quantidade, e dê baixa no estoque.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Produto</Label>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {available.map((p) => {
                const isSelected = p.id === productId
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProduct(p.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:bg-muted/50",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.quantity} em estoque · sugerido {formatBRL(p.salePrice)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30",
                      )}
                    >
                      {isSelected ? <Check className="size-3.5" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {selected ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sale-price">Preço de venda</Label>
                <CurrencyInput
                  id="sale-price"
                  value={price}
                  onValueChange={setPrice}
                  placeholder="0,00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sale-qty">Quantidade</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => changeQty((qtyValid ? quantity : 1) - 1)}
                    disabled={!qtyValid || quantity <= 1}
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    id="sale-qty"
                    type="number"
                    step="1"
                    min="1"
                    max={maxQty}
                    inputMode="numeric"
                    className="text-center"
                    value={qtyText}
                    onChange={(e) => setQtyText(e.target.value)}
                    onBlur={() => changeQty(Number.parseInt(qtyText, 10))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => changeQty((qtyValid ? quantity : 0) + 1)}
                    disabled={qtyValid && quantity >= maxQty}
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {selected && price !== null && qtyValid ? (
            <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total da venda</span>
                <span className="font-semibold text-foreground">{formatBRL(price * quantity)}</span>
              </div>
              {preview !== null ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lucro (com taxa Shopee)</span>
                  <span
                    className={
                      preview >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"
                    }
                  >
                    {formatBRL(preview)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={saving || !selected}>
              {saving ? "Registrando..." : "Confirmar venda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
