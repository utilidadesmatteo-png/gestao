import { Card } from "@/components/ui/card"
import { formatBRL, type Summary } from "@/lib/calculations"
import {
  Boxes,
  Package,
  Wallet,
  TrendingUp,
  BadgeDollarSign,
  Trophy,
  Receipt,
  Banknote,
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
    <Card className="group relative overflow-hidden p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClasses[tone]}`}>
          {icon}
        </span>
        <p className="text-sm font-medium text-muted-foreground text-pretty">{title}</p>
      </div>
      <p className={`mt-4 text-3xl font-semibold tracking-tight tabular-nums text-balance ${valueClasses[valueTone]}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground text-pretty">{hint}</p> : null}
    </Card>
  )
}

export function StatCards({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      <StatCard
        title="Faturamento potencial"
        value={formatBRL(summary.potentialRevenue)}
        hint="Receita se vender todo o estoque"
        icon={<Receipt className="size-5" />}
        tone="neutral"
      />
      <StatCard
        title="Faturamento real"
        value={formatBRL(summary.realRevenue)}
        hint="Receita bruta das vendas feitas"
        icon={<Banknote className="size-5" />}
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
    </div>
  )
}
