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
import { Plus } from "lucide-react"
import { addProduct } from "@/lib/store"
import { formatBRL, formatPercent, unitProfit, profitMargin } from "@/lib/calculations"

export function AddProductDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [cost, setCost] = useState<number | null>(null)
  const [sale, setSale] = useState<number | null>(null)
  const [quantity, setQuantity] = useState("")
  const [error, setError] = useState("")

  const hasValues = cost !== null && sale !== null
  const profit = hasValues ? unitProfit(cost, sale) : null
  const margin = hasValues ? profitMargin(cost, sale) : null

  function reset() {
    setName("")
    setCost(null)
    setSale(null)
    setQuantity("")
    setError("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = Number.parseInt(quantity, 10)
    if (!name.trim()) return setError("Informe o nome do produto.")
    if (cost === null || cost < 0) return setError("Custo inválido.")
    if (sale === null || sale < 0) return setError("Preço de venda inválido.")
    if (!Number.isInteger(q) || q < 0) return setError("Quantidade inválida.")

    addProduct({ name: name.trim(), costPrice: cost, salePrice: sale, quantity: q })
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar produto ao estoque</DialogTitle>
          <DialogDescription>
            Cadastre um produto com custo, preço de venda e quantidade inicial.
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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-sale">Preço de venda</Label>
              <CurrencyInput
                id="product-sale"
                value={sale}
                onValueChange={setSale}
                placeholder="0,00"
              />
            </div>
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

          {hasValues && profit !== null && margin !== null ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Resumo por unidade (com taxa Shopee)
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Custo</span>
                  <span className="font-medium">{formatBRL(cost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Venda</span>
                  <span className="font-medium">{formatBRL(sale)}</span>
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
            <Button type="submit">Salvar produto</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
