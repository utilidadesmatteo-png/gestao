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
import { Badge } from "@/components/ui/badge"
import { EditProductDialog } from "@/components/edit-product-dialog"
import { RestockDialog } from "@/components/restock-dialog"
import { Plus, Trash2, Pencil } from "lucide-react"
import type { Product } from "@/lib/types"
import { removeProduct } from "@/lib/store"
import { formatBRL, formatPercent, unitProfit, profitMargin } from "@/lib/calculations"

function marginTone(margin: number): string {
  if (margin < 0) return "border-transparent bg-destructive/10 text-destructive"
  if (margin < 20) return "border-transparent bg-muted text-muted-foreground"
  return "border-transparent bg-success/10 text-success"
}

function ProductRow({ product }: { product: Product }) {
  const [editOpen, setEditOpen] = useState(false)
  const [restockOpen, setRestockOpen] = useState(false)

  const profit = unitProfit(product.costPrice, product.salePrice)
  const margin = profitMargin(product.costPrice, product.salePrice)
  const invested = product.costPrice * product.quantity

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{product.name}</TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">
          {formatBRL(product.costPrice)}
        </TableCell>
        <TableCell className="text-right tabular-nums">{formatBRL(product.salePrice)}</TableCell>
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
          <Badge variant={product.quantity > 0 ? "secondary" : "outline"}>{product.quantity} un.</Badge>
        </TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">{formatBRL(invested)}</TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
              <span className="sr-only">Editar produto</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRestockOpen(true)}>
              <Plus className="size-4" />
              Repor
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeProduct(product.id)}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Excluir produto</span>
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <EditProductDialog product={product} open={editOpen} onOpenChange={setEditOpen} />
      <RestockDialog product={product} open={restockOpen} onOpenChange={setRestockOpen} />
    </>
  )
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
    <div className="overflow-x-auto rounded-xl border bg-card">
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
          {products.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
