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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ShoppingCart } from "lucide-react"
import { registerSale, useStore } from "@/lib/store"
import { formatBRL, unitProfit } from "@/lib/calculations"

export function RegisterSaleDialog() {
  const { products } = useStore()
  const [open, setOpen] = useState(false)
  const [productId, setProductId] = useState("")
  const [price, setPrice] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [error, setError] = useState("")

  const selected = products.find((p) => p.id === productId)
  const priceNum = Number.parseFloat(price)
  const qtyNum = Number.parseInt(quantity, 10)
  const preview =
    selected && Number.isFinite(priceNum)
      ? unitProfit(selected.costPrice, priceNum) * (Number.isFinite(qtyNum) ? qtyNum : 0)
      : null

  const hasStock = products.some((p) => p.quantity > 0)

  function reset() {
    setProductId("")
    setPrice("")
    setQuantity("1")
    setError("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return setError("Selecione um produto.")
    if (!Number.isFinite(priceNum) || priceNum < 0) return setError("Preço de venda inválido.")
    if (!Number.isInteger(qtyNum) || qtyNum <= 0) return setError("Quantidade inválida.")

    const result = registerSale({ productId, salePrice: priceNum, quantity: qtyNum })
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
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!hasStock}>
          <ShoppingCart className="size-4" />
          Registrar venda
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar venda</DialogTitle>
          <DialogDescription>
            Dê baixa no estoque. O preço de venda é digitado na hora.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sale-product">Produto</Label>
            <Select
              value={productId}
              onValueChange={(v) => {
                setProductId(v)
                const p = products.find((x) => x.id === v)
                if (p) setPrice(String(p.salePrice))
              }}
            >
              <SelectTrigger id="sale-product">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={p.quantity <= 0}>
                    {p.name} ({p.quantity} em estoque)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sale-price">Preço de venda (R$)</Label>
              <Input
                id="sale-price"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sale-qty">Quantidade</Label>
              <Input
                id="sale-qty"
                type="number"
                step="1"
                min="1"
                max={selected?.quantity}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          {preview !== null ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">Lucro desta venda (com taxa Shopee): </span>
              <span className={preview >= 0 ? "font-semibold text-primary" : "font-semibold text-destructive"}>
                {formatBRL(preview)}
              </span>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit">Confirmar venda</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
