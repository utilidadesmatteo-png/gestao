"use client"

import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Product } from "@/lib/types"
import { useStore } from "@/lib/store"
import { formatBRL } from "@/lib/calculations"
import { formatDate } from "@/lib/inventory"

type Movement = {
  id: string
  kind: "entrada" | "saida"
  quantity: number
  amount: number
  createdAt: number
}

export function MovementHistoryDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { sales, restocks, restocksAvailable } = useStore()

  const movements: Movement[] = [
    ...sales
      .filter((s) => s.productId === product.id)
      .map((s) => ({
        id: `s-${s.id}`,
        kind: "saida" as const,
        quantity: s.quantity,
        amount: s.salePrice * s.quantity,
        createdAt: s.createdAt,
      })),
    ...restocks
      .filter((r) => r.productId === product.id)
      .map((r) => ({
        id: `r-${r.id}`,
        kind: "entrada" as const,
        quantity: r.quantity,
        amount: r.costPrice * r.quantity,
        createdAt: r.createdAt,
      })),
  ].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico de movimentação</DialogTitle>
          <DialogDescription>
            {product.name} · {product.quantity} un. em estoque agora
          </DialogDescription>
        </DialogHeader>

        {!restocksAvailable && (
          <p className="rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            As reposições ainda não estão sendo registradas no banco. Por enquanto aparecem só as vendas.
          </p>
        )}

        {movements.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação registrada ainda.</p>
        ) : (
          <ul className="flex max-h-96 flex-col overflow-y-auto rounded-lg border">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                    m.kind === "entrada" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                  }`}
                >
                  {m.kind === "entrada" ? (
                    <ArrowDownLeft className="size-4" aria-hidden="true" />
                  ) : (
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">
                    {m.kind === "entrada" ? "Reposição" : "Venda"}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatDate(m.createdAt)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      m.kind === "entrada" ? "text-success" : "text-foreground"
                    }`}
                  >
                    {m.kind === "entrada" ? "+" : "−"}
                    {m.quantity} un.
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatBRL(m.amount)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
