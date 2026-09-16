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
import { CurrencyInput } from "@/components/currency-input"
import { Plus, Trash2, Check, X, Pencil } from "lucide-react"
import type { Product } from "@/lib/types"
import { addStock, removeProduct, updateProduct } from "@/lib/store"
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

function EditableRow({ product, onCancel }: { product: Product; onCancel: () => void }) {
  const [name, setName] = useState(product.name)
  const [costPrice, setCostPrice] = useState<number | null>(product.costPrice)
  const [salePrice, setSalePrice] = useState<number | null>(product.salePrice)
  const [quantity, setQuantity] = useState(String(product.quantity))
  const [saving, setSaving] = useState(false)

  const cost = costPrice ?? 0
  const sale = salePrice ?? 0
  const qty = Number.parseInt(quantity, 10)
  const profit = unitProfit(cost, sale)
  const margin = profitMargin(cost, sale)

  const valid = name.trim().length > 0 && sale > 0 && Number.isInteger(qty) && qty >= 0

  async function save() {
    if (!valid) return
    setSaving(true)
    const res = await updateProduct(product.id, {
      name: name.trim(),
      costPrice: cost,
      salePrice: sale,
      quantity: qty,
    })
    setSaving(false)
    if (res.ok) onCancel()
  }

  return (
    <TableRow className="bg-muted/30">
      <TableCell>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9"
          placeholder="Nome do produto"
          autoFocus
        />
      </TableCell>
      <TableCell>
        <CurrencyInput value={costPrice} onValueChange={setCostPrice} className="h-9 w-28" />
      </TableCell>
      <TableCell>
        <CurrencyInput value={salePrice} onValueChange={setSalePrice} className="h-9 w-28" />
      </TableCell>
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
        <Input
          type="number"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="mx-auto h-9 w-20 text-center"
        />
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatBRL(cost * (Number.isInteger(qty) ? qty : 0))}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-success"
            onClick={save}
            disabled={!valid || saving}
          >
            <Check className="size-4" />
            <span className="sr-only">Salvar alterações</span>
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={onCancel} disabled={saving}>
            <X className="size-4" />
            <span className="sr-only">Cancelar edição</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function ProductRow({ product }: { product: Product }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return <EditableRow product={product} onCancel={() => setEditing(false)} />
  }

  const profit = unitProfit(product.costPrice, product.salePrice)
  const margin = profitMargin(product.costPrice, product.salePrice)
  const invested = product.costPrice * product.quantity

  return (
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
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
            <span className="sr-only">Editar produto</span>
          </Button>
          <AddStockCell product={product} />
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
          {products.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
