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
import { Minus, Plus } from "lucide-react"
import type { Product } from "@/lib/types"
import { addStock } from "@/lib/store"
import { formatBRL } from "@/lib/calculations"

export function RestockDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [amount, setAmount] = useState("")
  const [saving, setSaving] = useState(false)

  const add = Number.parseInt(amount, 10)
  const validAdd = Number.isInteger(add) && add > 0
  const newTotal = product.quantity + (validAdd ? add : 0)
  const addedInvestment = validAdd ? product.costPrice * add : 0

  function step(delta: number) {
    const current = Number.isInteger(add) ? add : 0
    const next = Math.max(0, current + delta)
    setAmount(next === 0 ? "" : String(next))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validAdd) return
    setSaving(true)
    await addStock(product.id, add)
    setSaving(false)
    setAmount("")
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (o) setAmount("")
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Repor estoque</DialogTitle>
          <DialogDescription>{product.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="restock-qty">Quantidade a adicionar</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                onClick={() => step(-1)}
                aria-label="Diminuir"
              >
                <Minus className="size-4" />
              </Button>
              <Input
                id="restock-qty"
                type="number"
                step="1"
                min="1"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="h-11 text-center text-base"
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                onClick={() => step(1)}
                aria-label="Aumentar"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estoque atual</span>
                <span className="font-medium tabular-nums">{product.quantity} un.</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Investimento adicional</span>
                <span className="font-medium tabular-nums">{formatBRL(addedInvestment)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground">Novo estoque</span>
                <span className="font-semibold tabular-nums text-success">{newTotal} un.</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!validAdd || saving}>
              {saving ? "Salvando..." : "Confirmar reposição"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
