"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Check, X } from "lucide-react"
import type { Product } from "@/lib/types"
import { addStock, removeProduct } from "@/lib/store"
import { formatBRL, formatPercent, unitProfit, profitMargin } from "@/lib/calculations"

function AddStockCell({ product }: { product: Product }) {
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState("")

  async function confirm() {
    const n = Number.parseInt(amount, 10)
    if (Number.isInteger(n) && n > 0) await addStock(product.id, n)
    setAmount("")
    setEditing(false)
  }

  if (!editing) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
        <Plus className="size-4" />
        Repor
      </Button>
    )
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return
          if (e.key === "Enter") confirm()
          if (e.key === "Escape") setEditing(false)
        }}
        className="h-8 w-20"
        placeholder="Qtd"
        autoFocus
      />
      <Button variant="ghost" size="icon" className="size-8" onClick={confirm}>
        <Check className="size-4" />
        <span className="sr-only">Confirmar reposição</span>
      </Button>
      <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing(false)}>
        <X className="size-4" />
        <span className="sr-only">Cancelar</span>
      </Button>
    </div>
  )
}

function marginTone(margin: number): string {
  if (margin < 0) return "border-transparent bg-destructive/10 text-destructive"
  if (margin < 20) return "border-transparent bg-muted text-muted-foreground"
  return "border-transparent bg-success/10 text-success"
}

export function ProductsTable({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        Nenhum produto cadastrado. Clique em <span className="font-medium text-foreground">Adicionar produto</span> para começar.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead className="text-right">Venda</TableHead>
            <TableHead className="text-right">Lucro/un.</TableHead>
            <TableHead className="text-center">Margem</TableHead>
            <TableHead className="text-center">Estoque</TableHead>
            <TableHead className="text-right">Investido</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => {
            const profit = unitProfit(p.costPrice, p.salePrice)
            const margin = profitMargin(p.costPrice, p.salePrice)
            const invested = p.costPrice * p.quantity
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatBRL(p.costPrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(p.salePrice)}</TableCell>
                <TableCell
                  className={`text-right tabular-nums font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {formatBRL(profit)}
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums ${marginTone(margin)}`}
                  >
                    {formatPercent(margin)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={p.quantity > 0 ? "secondary" : "outline"}>
                    {p.quantity} un.
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatBRL(invested)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <AddStockCell product={p} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeProduct(p.id)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Excluir produto</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
