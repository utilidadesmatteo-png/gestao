import { Card } from "@/components/ui/card"
import { formatBRL, type Summary } from "@/lib/calculations"
import {
  Boxes,
  Package,
  Wallet,
  TrendingUp,
  BadgeDollarSign,
  Trophy,
} from "lucide-react"

type Tone = "brand" | "neutral" | "success" | "destructive"

function StatCard({
  title,
  value,
  hint,
  icon,
  tone = "neutral",
  valueTone = "neutral",
}: {
  title: string
  value: string
  hint?: string
  icon: React.ReactNode
  tone?: Tone
  valueTone?: Tone
}) {
  const iconClasses: Record<Tone, string> = {
    brand: "bg-primary/10 text-primary",
    neutral: "bg-muted text-muted-foreground",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  }
  const valueClasses: Record<Tone, string> = {
    brand: "text-primary",
    neutral: "text-foreground",
    success: "text-success",
    destructive: "text-destructive",
  }

  return (
    <Card className="p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground text-pretty">{title}</p>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconClasses[tone]}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-3 text-2xl font-semibold tracking-tight tabular-nums text-balance ${valueClasses[valueTone]}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground text-pretty">{hint}</p> : null}
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
        tone="brand"
      />
      <StatCard
        title="Itens em estoque"
        value={String(summary.totalUnits)}
        hint="Total de unidades disponíveis"
        icon={<Boxes className="size-5" />}
        tone="brand"
      />
      <StatCard
        title="Investimento em estoque"
        value={formatBRL(summary.investment)}
        hint="Custo total do que está parado"
        icon={<Wallet className="size-5" />}
        tone="neutral"
      />
      <StatCard
        title="Lucro potencial"
        value={formatBRL(summary.potentialProfit)}
        hint="Se vender todo o estoque atual"
        icon={<TrendingUp className="size-5" />}
        tone={summary.potentialProfit >= 0 ? "success" : "destructive"}
        valueTone={summary.potentialProfit >= 0 ? "success" : "destructive"}
      />
      <StatCard
        title="Lucro real"
        value={formatBRL(summary.realProfit)}
        hint="Já descontadas as taxas das vendas"
        icon={<BadgeDollarSign className="size-5" />}
        tone={summary.realProfit >= 0 ? "success" : "destructive"}
        valueTone={summary.realProfit >= 0 ? "success" : "destructive"}
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
        tone="brand"
      />
    </div>
  )
}
