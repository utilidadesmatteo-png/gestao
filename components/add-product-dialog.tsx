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
import { Plus } from "lucide-react"
import { addProduct } from "@/lib/store"
import { formatBRL, unitProfit } from "@/lib/calculations"

export function AddProductDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [cost, setCost] = useState("")
  const [sale, setSale] = useState("")
  const [quantity, setQuantity] = useState("")
  const [error, setError] = useState("")

  const costNum = Number.parseFloat(cost)
  const saleNum = Number.parseFloat(sale)
  const preview =
    Number.isFinite(costNum) && Number.isFinite(saleNum)
      ? unitProfit(costNum, saleNum)
      : null

  function reset() {
    setName("")
    setCost("")
    setSale("")
    setQuantity("")
    setError("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = Number.parseInt(quantity, 10)
    if (!name.trim()) return setError("Informe o nome do produto.")
    if (!Number.isFinite(costNum) || costNum < 0) return setError("Custo inválido.")
    if (!Number.isFinite(saleNum) || saleNum < 0) return setError("Preço de venda inválido.")
    if (!Number.isInteger(q) || q < 0) return setError("Quantidade inválida.")

    addProduct({ name: name.trim(), costPrice: costNum, salePrice: saleNum, quantity: q })
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
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Adicionar produto
        </Button>
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
              <Label htmlFor="product-cost">Preço de custo (R$)</Label>
              <Input
                id="product-cost"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-sale">Preço de venda (R$)</Label>
              <Input
                id="product-sale"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={sale}
                onChange={(e) => setSale(e.target.value)}
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

          {preview !== null ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">Lucro por unidade (já com taxa Shopee): </span>
              <span className={preview >= 0 ? "font-semibold text-primary" : "font-semibold text-destructive"}>
                {formatBRL(preview)}
              </span>
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
