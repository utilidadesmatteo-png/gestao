import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBRL, type Summary } from "@/lib/calculations"
import {
  Boxes,
  Package,
  Wallet,
  TrendingUp,
  BadgeDollarSign,
  Trophy,
} from "lucide-react"

function StatCard({
  title,
  value,
  hint,
  icon,
  accent,
}: {
  title: string
  value: string
  hint?: string
  icon: React.ReactNode
  accent?: "positive" | "negative" | "neutral"
}) {
  const valueColor =
    accent === "positive"
      ? "text-primary"
      : accent === "negative"
        ? "text-destructive"
        : "text-foreground"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold tracking-tight ${valueColor}`}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

export function StatCards({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Produtos cadastrados"
        value={String(summary.productCount)}
        hint="Tipos de produtos diferentes"
        icon={<Package className="size-5" />}
      />
      <StatCard
        title="Itens em estoque"
        value={String(summary.totalUnits)}
        hint="Total de unidades disponíveis"
        icon={<Boxes className="size-5" />}
      />
      <StatCard
        title="Investimento em estoque"
        value={formatBRL(summary.investment)}
        hint="Custo total do que está parado"
        icon={<Wallet className="size-5" />}
      />
      <StatCard
        title="Lucro potencial"
        value={formatBRL(summary.potentialProfit)}
        hint="Se vender todo o estoque atual"
        icon={<TrendingUp className="size-5" />}
        accent={summary.potentialProfit >= 0 ? "positive" : "negative"}
      />
      <StatCard
        title="Lucro real"
        value={formatBRL(summary.realProfit)}
        hint="Já descontadas as taxas das vendas"
        icon={<BadgeDollarSign className="size-5" />}
        accent={summary.realProfit >= 0 ? "positive" : "negative"}
      />
      <StatCard
        title="Produto mais vendido"
        value={summary.topProduct ? summary.topProduct.name : "—"}
        hint={
          summary.topProduct
            ? `${summary.topProduct.unitsSold} unidade(s) vendida(s)`
            : "Nenhuma venda registrada ainda"
        }
        icon={<Trophy className="size-5" />}
      />
    </div>
  )
}
