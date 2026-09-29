"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, History, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EditProductDialog } from "@/components/edit-product-dialog"
import { RestockDialog } from "@/components/restock-dialog"
import { MovementHistoryDialog } from "@/components/movement-history-dialog"
import type { Product, Sale } from "@/lib/types"
import { removeProduct } from "@/lib/store"
import { formatBRL, formatPercent, profitMargin, unitProfit } from "@/lib/calculations"
import {
  computeInsights,
  computeTotals,
  formatDays,
  statusLabel,
  type AbcClass,
  type ProductInsight,
  type StockStatus,
} from "@/lib/inventory"

type Filter = "todos" | "critico" | "atencao" | "parado" | "sem-estoque"
type SortKey =
  | "name"
  | "cost"
  | "sale"
  | "profit"
  | "margin"
  | "quantity"
  | "daysLeft"
  | "suggested"
  | "invested"
  | "abc"
type Sort = { key: SortKey; dir: "asc" | "desc" }

const filters: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "critico", label: "Crítico" },
  { value: "atencao", label: "Atenção" },
  { value: "parado", label: "Parado" },
  { value: "sem-estoque", label: "Sem estoque" },
]

const statusTone: Record<StockStatus, string> = {
  "sem-estoque": "bg-destructive/15 text-destructive",
  critico: "bg-destructive/15 text-destructive",
  atencao: "bg-warning/15 text-warning",
  ok: "bg-success/10 text-success",
  parado: "bg-muted text-muted-foreground",
  novo: "bg-muted text-muted-foreground",
}

const abcTone: Record<AbcClass, string> = {
  A: "bg-primary text-primary-foreground",
  B: "bg-secondary text-secondary-foreground",
  C: "bg-muted text-muted-foreground",
}

const abcRank: Record<AbcClass, number> = { A: 3, B: 2, C: 1 }

function sortValue(i: ProductInsight, key: SortKey): number | string {
  const p = i.product
  switch (key) {
    case "name":
      return p.name.toLowerCase()
    case "cost":
      return p.costPrice
    case "sale":
      return p.salePrice
    case "profit":
      return unitProfit(p.costPrice, p.salePrice)
    case "margin":
      return profitMargin(p.costPrice, p.salePrice)
    case "quantity":
      return p.quantity
    case "daysLeft":
      return i.daysLeft ?? Number.POSITIVE_INFINITY
    case "suggested":
      return i.suggestedCost
    case "invested":
      return i.invested
    case "abc":
      return abcRank[i.abc]
  }
}

function matchesFilter(i: ProductInsight, filter: Filter): boolean {
  if (filter === "todos") return true
  return i.status === filter
}

export function InventoryView({ products, sales }: { products: Product[]; sales: Sale[] }) {
  const [coverageDays, setCoverageDays] = useState(30)
  const [filter, setFilter] = useState<Filter>("todos")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<Sort>({ key: "daysLeft", dir: "asc" })

  const insights = useMemo(() => computeInsights(products, sales, coverageDays), [products, sales, coverageDays])
  const totals = useMemo(() => computeTotals(insights), [insights])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { todos: insights.length, critico: 0, atencao: 0, parado: 0, "sem-estoque": 0 }
    for (const i of insights) if (i.status in c) c[i.status as Filter] += 1
    return c
  }, [insights])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = insights.filter((i) => matchesFilter(i, filter) && (!q || i.product.name.toLowerCase().includes(q)))
    return list.sort((a, b) => {
      const va = sortValue(a, sort.key)
      const vb = sortValue(b, sort.key)
      const cmp = typeof va === "string" ? va.localeCompare(String(vb), "pt-BR") : (va as number) - (vb as number)
      return sort.dir === "asc" ? cmp : -cmp
    })
  }, [insights, filter, query, sort])

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }))
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        Nenhum produto cadastrado. Clique em <span className="font-medium text-foreground">Adicionar produto</span> para
        começar.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Resumo do estoque" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Valor em estoque" value={formatBRL(totals.stockValue)} hint={`${totals.units} unidades`} />
        <SummaryCard
          label="Repor agora"
          value={formatBRL(totals.criticalRestockCost)}
          hint={`${totals.criticalCount} ${totals.criticalCount === 1 ? "produto crítico" : "produtos críticos"}`}
          tone={totals.criticalCount > 0 ? "danger" : undefined}
        />
        <SummaryCard
          label={`Compra para ${coverageDays} dias`}
          value={formatBRL(totals.totalRestockCost)}
          hint="Todos os produtos com venda"
        />
        <SummaryCard
          label="Dinheiro parado"
          value={formatBRL(totals.stagnantValue)}
          hint={`${totals.stagnantCount} sem venda há 30+ dias`}
          tone={totals.stagnantCount > 0 ? "muted" : undefined}
        />
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Filtrar produtos" className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              <span className="tabular-nums opacity-70">{counts[f.value]}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-64 lg:flex-none">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produto"
              aria-label="Buscar produto"
              className="pl-8"
            />
          </div>
          <Select value={String(coverageDays)} onValueChange={(v) => setCoverageDays(Number(v))}>
            <SelectTrigger className="w-40" aria-label="Cobertura da sugestão de compra">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[15, 30, 45, 60, 90].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  Cobrir {d} dias
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <SortHead label="Produto" k="name" sort={sort} onSort={toggleSort} />
              <SortHead label="ABC" k="abc" sort={sort} onSort={toggleSort} align="center" />
              <SortHead label="Custo" k="cost" sort={sort} onSort={toggleSort} align="right" />
              <SortHead label="Venda" k="sale" sort={sort} onSort={toggleSort} align="right" />
              <SortHead label="Lucro/un." k="profit" sort={sort} onSort={toggleSort} align="right" />
              <SortHead label="Margem" k="margin" sort={sort} onSort={toggleSort} align="center" />
              <SortHead label="Estoque" k="quantity" sort={sort} onSort={toggleSort} align="center" />
              <SortHead label="Acaba em" k="daysLeft" sort={sort} onSort={toggleSort} />
              <SortHead label="Sugestão de compra" k="suggested" sort={sort} onSort={toggleSort} align="right" />
              <SortHead label="Investido" k="invested" sort={sort} onSort={toggleSort} align="right" />
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum produto neste filtro.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((i) => <InventoryRow key={i.product.id} insight={i} coverageDays={coverageDays} />)
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
        O ritmo de vendas usa os últimos 30 dias. A curva ABC ordena os produtos pelo lucro dos últimos 90 dias: A são os
        que trazem até 80% do lucro e não podem faltar.
      </p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone?: "danger" | "muted"
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span
        className={`text-xl font-semibold tabular-nums ${tone === "danger" ? "text-destructive" : "text-foreground"}`}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  )
}

function SortHead({
  label,
  k,
  sort,
  onSort,
  align = "left",
}: {
  label: string
  k: SortKey
  sort: Sort
  onSort: (k: SortKey) => void
  align?: "left" | "right" | "center"
}) {
  const active = sort.key === k
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"
  return (
    <TableHead
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={align === "right" ? "text-right" : align === "center" ? "text-center" : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex w-full items-center gap-1 whitespace-nowrap ${justify} ${
          active ? "text-foreground" : "hover:text-foreground"
        }`}
      >
        {label}
        <Icon className={`size-3.5 ${active ? "" : "opacity-40"}`} aria-hidden="true" />
      </button>
    </TableHead>
  )
}

function marginTone(margin: number): string {
  if (margin < 0) return "bg-destructive/10 text-destructive"
  if (margin < 20) return "bg-muted text-muted-foreground"
  return "bg-success/10 text-success"
}

function InventoryRow({ insight, coverageDays }: { insight: ProductInsight; coverageDays: number }) {
  const [editOpen, setEditOpen] = useState(false)
  const [restockOpen, setRestockOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { product, status } = insight
  const profit = unitProfit(product.costPrice, product.salePrice)
  const margin = profitMargin(product.costPrice, product.salePrice)
  const extras = (product.extraCosts ?? []).reduce((sum, c) => sum + (Number(c.value) || 0), 0)
  const productCost = Math.max(0, product.costPrice - extras)

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          <div className="flex flex-col">
            <span>{product.name}</span>
            {insight.dailySales > 0 && (
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {insight.soldLast30} vendidos em 30 dias
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <span
            className={`inline-flex size-6 items-center justify-center rounded-md text-xs font-bold ${abcTone[insight.abc]}`}
            title={`Lucro em 90 dias: ${formatBRL(insight.profit90)}`}
          >
            {insight.abc}
          </span>
        </TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">{formatBRL(productCost)}</TableCell>
        <TableCell className="text-right tabular-nums">{formatBRL(product.salePrice)}</TableCell>
        <TableCell
          className={`text-right tabular-nums font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}
        >
          {formatBRL(profit)}
        </TableCell>
        <TableCell className="text-center">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${marginTone(margin)}`}
          >
            {formatPercent(margin)}
          </span>
        </TableCell>
        <TableCell className="text-center tabular-nums font-medium">{product.quantity} un.</TableCell>
        <TableCell>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[status]}`}>
              {statusLabel[status]}
            </span>
            <span className="text-sm tabular-nums text-muted-foreground">{formatDays(insight.daysLeft)}</span>
          </div>
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {insight.suggestedQty > 0 ? (
            <div className="flex flex-col items-end">
              <span className="font-medium">{insight.suggestedQty} un.</span>
              <span className="text-xs text-muted-foreground">{formatBRL(insight.suggestedCost)}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">{formatBRL(insight.invested)}</TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="size-4" />
              <span className="sr-only">Histórico de movimentação</span>
            </Button>
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
              onClick={() => {
                if (window.confirm(`Excluir "${product.name}"?`)) void removeProduct(product.id)
              }}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Excluir produto</span>
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <EditProductDialog product={product} open={editOpen} onOpenChange={setEditOpen} />
      <RestockDialog
        product={product}
        open={restockOpen}
        onOpenChange={setRestockOpen}
        suggestedQty={insight.suggestedQty}
        coverageDays={coverageDays}
      />
      <MovementHistoryDialog product={product} open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  )
}
