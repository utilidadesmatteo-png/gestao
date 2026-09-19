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
import type { Product } from "@/lib/types"
import { updateProduct } from "@/lib/store"
import { formatBRL, formatPercent, unitProfit, profitMargin, shopeeFee } from "@/lib/calculations"

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
  const [cost, setCost] = useState<number | null>(product.costPrice)
  const [sale, setSale] = useState<number | null>(product.salePrice)
  const [quantity, setQuantity] = useState(String(product.quantity))
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  // Ao (re)abrir, reinicia os campos com os dados atuais do produto.
  function reset() {
    setName(product.name)
    setCost(product.costPrice)
    setSale(product.salePrice)
    setQuantity(String(product.quantity))
    setError("")
  }

  const hasValues = cost !== null && sale !== null
  const fee = sale !== null ? shopeeFee(sale) : null
  const totalCost = cost !== null && fee !== null ? cost + fee : null
  const profit = cost !== null && sale !== null ? unitProfit(cost, sale) : null
  const margin = cost !== null && sale !== null ? profitMargin(cost, sale) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = Number.parseInt(quantity, 10)
    if (!name.trim()) return setError("Informe o nome do produto.")
    if (cost === null || cost < 0) return setError("Custo inválido.")
    if (sale === null || sale < 0) return setError("Preço de venda inválido.")
    if (!Number.isInteger(q) || q < 0) return setError("Quantidade inválida.")

    setSaving(true)
    const result = await updateProduct(product.id, {
      name: name.trim(),
      costPrice: cost,
      salePrice: sale,
      quantity: q,
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
          <DialogDescription>Altere o nome, os preços e a quantidade em estoque.</DialogDescription>
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
