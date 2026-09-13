"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Sale } from "@/lib/types"
import { formatBRL, unitProfit } from "@/lib/calculations"

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function SalesTable({ sales }: { sales: Sale[] }) {
  if (sales.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Nenhuma venda registrada. Use <span className="font-medium text-foreground">Registrar venda</span> para dar baixa no estoque.
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-center">Qtd</TableHead>
            <TableHead className="text-right">Venda un.</TableHead>
            <TableHead className="text-right">Lucro</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((s) => {
            const profit = unitProfit(s.costPrice, s.salePrice) * s.quantity
            return (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.productName}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(s.createdAt)}</TableCell>
                <TableCell className="text-center tabular-nums">{s.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(s.salePrice)}</TableCell>
                <TableCell
                  className={`text-right tabular-nums font-medium ${profit >= 0 ? "text-primary" : "text-destructive"}`}
                >
                  {formatBRL(profit)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
