import { Card } from "@/components/ui/card"
import { LOW_STOCK_THRESHOLD, type Summary } from "@/lib/calculations"
import { AlertTriangle, PackageCheck } from "lucide-react"

export function LowStockPanel({ items }: { items: Summary["lowStock"] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-balance">Estoque baixo</h2>
          <p className="text-sm text-muted-foreground text-pretty">
            {`Produtos com ${LOW_STOCK_THRESHOLD} unidade(s) ou menos`}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
          <PackageCheck className="size-4 text-success" />
          Nenhum produto com estoque baixo. Tudo em ordem.
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3"
            >
              <span className="min-w-0 truncate text-sm font-medium">{item.name}</span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                  item.quantity === 0
                    ? "bg-destructive/15 text-destructive"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {item.quantity === 0 ? "Esgotado" : `${item.quantity} restante(s)`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
