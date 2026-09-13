"use client"

import { useState } from "react"
import { Cell, Label as PieLabel, Pie, PieChart } from "recharts"
import { CurrencyInput } from "@/components/currency-input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  computeCalculator,
  formatBRL,
  formatPercent,
  SHOPEE_PERCENT,
  type ExtraCost,
} from "@/lib/calculations"
import { addProduct } from "@/lib/store"
import {
  Plus,
  Trash2,
  Package,
  Megaphone,
  Truck,
  TrendingUp,
  PieChartIcon,
  RotateCcw,
  PackagePlus,
  Check,
} from "lucide-react"

const chartConfig = {
  custo: { label: "Custo do produto", color: "#64748b" },
  comissao: { label: "Comissão Shopee", color: "#f97316" },
  fixa: { label: "Taxa fixa", color: "#fb923c" },
  adicionais: { label: "Custos adicionais", color: "#fdba74" },
  lucro: { label: "Lucro líquido", color: "#16a34a" },
} satisfies ChartConfig

// Atalhos de custos comuns. Ao clicar, o custo é adicionado à lista (não fica fixo na tela).
const quickCosts = [
  { label: "Embalagem", icon: Package },
  { label: "Shopee Ads", icon: Megaphone },
  { label: "Frete", icon: Truck },
] as const

const costIcons: Record<string, typeof Package> = {
  Embalagem: Package,
  "Shopee Ads": Megaphone,
  Frete: Truck,
}

export function ShopeeCalculator() {
  const [costPrice, setCostPrice] = useState(0)
  const [salePrice, setSalePrice] = useState(0)
  const [extras, setExtras] = useState<ExtraCost[]>([])
  const [adjust, setAdjust] = useState(0)

  // Cadastro no estoque a partir da simulação atual.
  const [registerOpen, setRegisterOpen] = useState(false)
  const [productName, setProductName] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [justSaved, setJustSaved] = useState(false)

  // O slider varia o preço de venda digitado de -50% a +50% para simular margens.
  const effectiveSale = salePrice > 0 ? salePrice * (1 + adjust / 100) : 0

  const result = computeCalculator({
    costPrice,
    salePrice: effectiveSale,
    packaging: 0,
    ads: 0,
    freight: 0,
    extras,
  })

  function addExtra(label = "") {
    setExtras((prev) => [...prev, { id: crypto.randomUUID(), label, value: 0 }])
  }

  function updateExtra(id: string, patch: Partial<ExtraCost>) {
    setExtras((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function removeExtra(id: string) {
    setExtras((prev) => prev.filter((e) => e.id !== id))
  }

  function handleRegister() {
    const name = productName.trim()
    if (!name || quantity <= 0) return
    // Salva o custo do estoque como o investimento do bolso (produto + custos adicionais),
    // e o preço de venda como o preço simulado atual.
    addProduct({
      name,
      costPrice: result.investment,
      salePrice: effectiveSale,
      quantity,
    })
    setRegisterOpen(false)
    setProductName("")
    setQuantity(1)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2500)
  }

  const profitPositive = result.netProfit >= 0

  const pieData = [
    { key: "custo", value: costPrice },
    { key: "comissao", value: result.commission },
    { key: "fixa", value: result.fixedFee },
    { key: "adicionais", value: result.extrasTotal },
    { key: "lucro", value: Math.max(result.netProfit, 0) },
  ]
    .filter((d) => d.value > 0)
    .map((d) => ({
      ...d,
      name: chartConfig[d.key as keyof typeof chartConfig].label,
      fill: `var(--color-${d.key})`,
    }))

  const hasData = effectiveSale > 0

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* Entradas */}
      <div className="flex flex-col gap-6">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Produto
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calc-cost">Custo do produto</Label>
              <CurrencyInput id="calc-cost" value={costPrice} onValueChange={setCostPrice} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calc-sale">Preço de venda</Label>
              <CurrencyInput id="calc-sale" value={salePrice} onValueChange={setSalePrice} />
            </div>
          </div>

          {/* Simulador de preço */}
          <div className="mt-5 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                Simular preço de venda
              </Label>
              {adjust !== 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-xs text-muted-foreground"
                  onClick={() => setAdjust(0)}
                >
                  <RotateCcw className="size-3" /> Zerar
                </Button>
              )}
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight">{formatBRL(effectiveSale)}</span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  adjust > 0
                    ? "text-[var(--color-profit)]"
                    : adjust < 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                {adjust > 0 ? "+" : ""}
                {adjust}%
              </span>
            </div>
            <div className={`relative mt-3 h-5 w-full ${salePrice <= 0 ? "opacity-50" : ""}`}>
              {/* Trilho visual: fica atrás do input, sem capturar eventos. */}
              <div className="pointer-events-none absolute top-1/2 left-0 h-1.5 w-full -translate-y-1/2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${adjust + 50}%` }}
                />
              </div>
              {/* Input nativo transparente por cima: garante interação com mouse, toque e teclado. */}
              <input
                type="range"
                min={-50}
                max={50}
                step={1}
                value={adjust}
                onChange={(e) => setAdjust(Number(e.target.value))}
                disabled={salePrice <= 0}
                aria-label="Simular variação do preço de venda"
                className="absolute inset-0 h-5 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ring [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ring [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm"
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span>-50%</span>
              <span>preço digitado</span>
              <span>+50%</span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Custos adicionais
            </h2>
            <span className="text-xs text-muted-foreground">opcional</span>
          </div>

          {extras.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              {extras.map((extra) => {
                const Icon = costIcons[extra.label]
                return (
                  <div key={extra.id} className="flex items-end gap-2">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Label htmlFor={`extra-label-${extra.id}`} className="flex items-center gap-1.5 text-xs">
                        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
                        Nome do custo
                      </Label>
                      <Input
                        id={`extra-label-${extra.id}`}
                        value={extra.label}
                        onChange={(e) => updateExtra(extra.id, { label: e.target.value })}
                        placeholder="Ex.: etiqueta, brinde"
                      />
                    </div>
                    <div className="flex w-32 flex-col gap-1.5">
                      <Label htmlFor={`extra-value-${extra.id}`} className="text-xs">
                        Valor
                      </Label>
                      <CurrencyInput
                        id={`extra-value-${extra.id}`}
                        value={extra.value}
                        onValueChange={(v) => updateExtra(extra.id, { value: v })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeExtra(extra.id)}
                      aria-label="Remover custo"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {quickCosts.map((qc) => {
              const Icon = qc.icon
              const alreadyAdded = extras.some((e) => e.label === qc.label)
              return (
                <Button
                  key={qc.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addExtra(qc.label)}
                  disabled={alreadyAdded}
                >
                  <Icon className="size-4" /> {qc.label}
                </Button>
              )
            })}
            <Button type="button" variant="outline" size="sm" onClick={() => addExtra()}>
              <Plus className="size-4" /> Outro custo
            </Button>
          </div>

          {extras.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum custo adicional. Adicione embalagem, Ads, frete ou outro custo só se precisar.
            </p>
          )}
        </section>

        {/* Gráfico de composição do preço */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <PieChartIcon className="size-4" /> Composição do preço
          </h2>
          {hasData ? (
            <div className="mt-4 grid items-center gap-4 sm:grid-cols-[240px_1fr]">
              <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-w-[240px]">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value, name) => (
                          <div className="flex w-full items-center justify-between gap-3">
                            <span className="text-muted-foreground">{name}</span>
                            <span className="font-medium tabular-nums text-foreground">
                              {formatBRL(Number(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} strokeWidth={3}>
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                    <PieLabel
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) - 8}
                                className="fill-muted-foreground text-xs"
                              >
                                Lucro
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) + 12}
                                className={`text-lg font-bold ${
                                  profitPositive ? "fill-[var(--color-profit)]" : "fill-destructive"
                                }`}
                              >
                                {formatBRL(result.netProfit)}
                              </tspan>
                            </text>
                          )
                        }
                        return null
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>

              <ul className="flex flex-col gap-2.5 text-sm">
                {pieData.map((entry) => {
                  const share = effectiveSale > 0 ? (entry.value / effectiveSale) * 100 : 0
                  return (
                    <li key={entry.key} className="flex items-center gap-2.5">
                      <span
                        className="size-3 shrink-0 rounded-[3px]"
                        style={{ backgroundColor: entry.fill }}
                        aria-hidden
                      />
                      <span className="flex-1 text-muted-foreground">{entry.name}</span>
                      <span className="tabular-nums font-medium">{formatBRL(entry.value)}</span>
                      <span className="w-12 text-right tabular-nums text-xs text-muted-foreground">
                        {share.toFixed(0)}%
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Preencha o custo e o preço de venda para ver a composição do preço.
            </p>
          )}
        </section>
      </div>

      {/* Resultado */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b bg-muted/40 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4" /> Resultado da simulação
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`text-3xl font-bold tracking-tight ${profitPositive ? "text-[var(--color-profit)]" : "text-destructive"}`}
              >
                {formatBRL(result.netProfit)}
              </span>
              <span className="text-sm text-muted-foreground">lucro líquido / venda</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-background p-3">
                <p className="text-xs text-muted-foreground">Margem</p>
                <p
                  className={`mt-0.5 text-lg font-semibold ${profitPositive ? "text-[var(--color-profit)]" : "text-destructive"}`}
                >
                  {formatPercent(result.margin)}
                </p>
              </div>
              <div className="rounded-lg bg-background p-3">
                <p className="text-xs text-muted-foreground">ROI (sobre o investimento)</p>
                <p
                  className={`mt-0.5 text-lg font-semibold ${profitPositive ? "text-[var(--color-profit)]" : "text-destructive"}`}
                >
                  {formatPercent(result.roi)}
                </p>
              </div>
            </div>
          </div>

          <dl className="flex flex-col divide-y text-sm">
            <Row label="Preço de venda" value={formatBRL(effectiveSale)} />
            <Row label="Custo do produto" value={`- ${formatBRL(costPrice)}`} muted />
            <Row
              label={`Comissão Shopee (${SHOPEE_PERCENT * 100}%)`}
              value={`- ${formatBRL(result.commission)}`}
              muted
            />
            <Row label="Taxa fixa" value={`- ${formatBRL(result.fixedFee)}`} muted />
            {extras.map((extra) => (
              <Row
                key={extra.id}
                label={extra.label.trim() || "Custo adicional"}
                value={`- ${formatBRL(extra.value)}`}
                muted
              />
            ))}
            <Row label="Custo total" value={formatBRL(result.totalCost)} strong />
            <Row
              label="Lucro líquido"
              value={formatBRL(result.netProfit)}
              strong
              highlight={profitPositive ? "profit" : "loss"}
            />
          </dl>

          <div className="border-t p-4">
            <Button
              type="button"
              className="w-full gap-2"
              disabled={!hasData}
              onClick={() => setRegisterOpen(true)}
            >
              {justSaved ? (
                <>
                  <Check className="size-4" /> Cadastrado no estoque
                </>
              ) : (
                <>
                  <PackagePlus className="size-4" /> Cadastrar no estoque
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Salva este produto com o preço simulado atual.
            </p>
          </div>
        </div>
      </aside>

      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar no estoque</DialogTitle>
            <DialogDescription>
              O produto será salvo com o custo e o preço de venda desta simulação.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="register-name">Nome do produto</Label>
              <Input
                id="register-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex.: Fone Bluetooth"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="register-qty">Quantidade em estoque</Label>
              <Input
                id="register-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 0)))}
              />
            </div>

            <dl className="flex flex-col divide-y rounded-lg border text-sm">
              <Row label="Custo (produto + adicionais)" value={formatBRL(result.investment)} muted />
              <Row label="Preço de venda" value={formatBRL(effectiveSale)} muted />
              <Row
                label="Lucro líquido / un."
                value={formatBRL(result.netProfit)}
                highlight={profitPositive ? "profit" : "loss"}
              />
            </dl>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRegisterOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleRegister} disabled={!productName.trim() || quantity <= 0}>
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({
  label,
  value,
  muted,
  strong,
  highlight,
}: {
  label: string
  value: string
  muted?: boolean
  strong?: boolean
  highlight?: "profit" | "loss"
}) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <dt className={`${muted ? "text-muted-foreground" : ""} ${strong ? "font-semibold" : ""}`}>
        {label}
      </dt>
      <dd
        className={`tabular-nums ${strong ? "font-semibold" : ""} ${
          highlight === "profit"
            ? "text-[var(--color-profit)]"
            : highlight === "loss"
              ? "text-destructive"
              : ""
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
