"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Equal,
  History,
  Rocket,
  Sparkles,
  Tag,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { CurrencyInput } from "@/components/currency-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatBRL, getShopeeFixed, getShopeePercent } from "@/lib/calculations"
import { useStore } from "@/lib/store"
import {
  DAILY_BUDGET,
  PROFIT_LADDER,
  PROFIT_SALES_THRESHOLD,
  RANK_SALES_THRESHOLD,
  ROAS_RANK,
  ROAS_TRACTION,
  ROAS_UNLOCK,
  analyzeRoas,
  deleteRoasAnalysis,
  formatPct,
  formatRoas,
  saveRoasAnalysis,
  useRoasHistory,
  type RoasAnalysis,
  type RoasInputs,
  type RoasStatus,
} from "@/lib/roas"

function parseNumber(text: string): number {
  const n = Number(text.replace(",", "."))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function toText(n: number): string {
  return n > 0 ? String(n).replace(".", ",") : ""
}

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  placeholder,
  integer,
}: {
  id: string
  label: React.ReactNode
  value: string
  onChange: (v: string) => void
  suffix?: string
  placeholder?: string
  integer?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode={integer ? "numeric" : "decimal"}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            const cleaned = integer
              ? e.target.value.replace(/\D/g, "")
              : e.target.value.replace(/[^\d.,]/g, "")
            onChange(cleaned)
          }}
          className={suffix ? "pr-8" : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

const statusStyles: Record<RoasStatus, { box: string; icon: typeof Rocket; label: string }> = {
  RANK: { box: "bg-primary text-primary-foreground", icon: Target, label: "RANK" },
  "TRAÇÃO": { box: "border-2 border-primary bg-primary/10 text-foreground", icon: TrendingUp, label: "TRAÇÃO" },
  LUCRO: { box: "bg-success text-success-foreground", icon: Wallet, label: "LUCRO" },
  ESCALAR: { box: "bg-success text-success-foreground", icon: Rocket, label: "ESCALAR" },
  AJUSTAR: { box: "border-2 border-primary bg-primary/10 text-foreground", icon: TrendingUp, label: "AJUSTAR" },
  MANTER: { box: "bg-foreground text-background", icon: Equal, label: "MANTER" },
  "MARGEM BAIXA": { box: "bg-destructive text-white", icon: AlertTriangle, label: "MARGEM BAIXA" },
  AGUARDANDO: { box: "border border-dashed bg-muted/40 text-muted-foreground", icon: Sparkles, label: "AGUARDANDO DADOS" },
}

function StatusBadge({ status, small }: { status: RoasStatus; small?: boolean }) {
  const s = statusStyles[status] ?? statusStyles.AGUARDANDO
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-semibold tracking-wide ${s.box} ${
        small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      }`}
    >
      {s.label}
    </span>
  )
}

function buildRecommendation(inputs: RoasInputs, a: RoasAnalysis): string[] {
  if (inputs.salePrice <= 0) {
    return ["Preencha o preço de venda e o custo do produto para ver a análise."]
  }

  const lines: string[] = []
  if (a.lowMargin) {
    lines.push(
      "Mesmo sem gastar nada com ADS este produto dá prejuízo. Antes de anunciar, ajuste o preço ou o custo.",
    )
    return lines
  }

  const n = inputs.salesCount
  if (a.stage === "RANK") {
    lines.push(
      `Fase RANK: ${n} de ${RANK_SALES_THRESHOLD} vendas. Agora o objetivo é vender, não lucrar. Você está comprando vendas para a Shopee começar a entregar no orgânico.`,
    )
  } else if (a.stage === "TRAÇÃO") {
    lines.push(
      `Fase TRAÇÃO: ${n} de ${PROFIT_SALES_THRESHOLD} vendas. Continue rankeando com ${ROAS_TRACTION}x até bater ${PROFIT_SALES_THRESHOLD} vendas.`,
    )
  } else {
    lines.push(
      `Fase LUCRO: ${n} vendas. A Shopee já entrega no orgânico. Agora suba o ROAS em degraus (${PROFIT_LADDER.join("x → ")}x) para lucrar.`,
    )
  }

  lines.push(
    `Com ROAS ${formatRoas(a.recommendedRoas)} você paga até ${formatBRL(a.cpa)} de ADS por venda (${formatBRL(inputs.salePrice)} ÷ ${formatRoas(a.recommendedRoas)}).`,
  )

  if (a.profitPerSale >= 0) {
    lines.push(`Sobra ${formatBRL(a.profitPerSale)} de lucro por venda depois do ADS.`)
  } else if (a.stage === "LUCRO") {
    lines.push(
      `Nesse ROAS você perde ${formatBRL(-a.profitPerSale)} por venda. Na fase de lucro isso não compensa: suba o ROAS ou o preço.`,
    )
  } else {
    lines.push(
      `Você toma ${formatBRL(-a.profitPerSale)} de prejuízo por venda. É normal na fase de rank: é o preço de comprar as primeiras vendas.`,
    )
  }

  if (a.breakEvenRoas > 0) {
    lines.push(
      `Seu ROAS de empate é ${formatRoas(Math.round(a.breakEvenRoas * 10) / 10)}. Acima dele você lucra, abaixo você paga para vender.`,
    )
  }
  return lines
}

function MarginBreakdown({ inputs, a }: { inputs: RoasInputs; a: RoasAnalysis }) {
  if (inputs.salePrice <= 0) return null
  const rows: [string, number][] = [
    ["Preço de venda", inputs.salePrice],
    ["Custo do produto", -inputs.productCost],
    [`Comissão (${formatPct(inputs.shopeePercent, 0)})`, -a.shopeeFee],
    ["Taxa fixa", -inputs.shopeeFixed],
  ]
  if (inputs.otherCosts > 0) rows.push(["Outros custos", -inputs.otherCosts])

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Margem real por venda</h2>
      <dl className="mt-3 flex flex-col gap-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className={`tabular-nums ${v < 0 ? "text-destructive" : "font-medium"}`}>
              {v < 0 ? `− ${formatBRL(-v)}` : formatBRL(v)}
            </dd>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between gap-3 border-t pt-2">
          <dt className="font-medium">Sobra antes do ADS</dt>
          <dd className={`font-bold tabular-nums ${a.profitBeforeAds >= 0 ? "text-success" : "text-destructive"}`}>
            {formatBRL(a.profitBeforeAds)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">ADS a {formatRoas(a.recommendedRoas)}</dt>
          <dd className="tabular-nums text-destructive">− {formatBRL(a.cpa)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t pt-2">
          <dt className="font-medium">Lucro por venda com ADS</dt>
          <dd className={`font-bold tabular-nums ${a.profitPerSale >= 0 ? "text-success" : "text-destructive"}`}>
            {formatBRL(a.profitPerSale)}
          </dd>
        </div>
      </dl>
    </section>
  )
}

const ladderSteps = [
  { roas: ROAS_UNLOCK, label: "Destravar", hint: "3 dias sem venda" },
  { roas: ROAS_RANK, label: "Rank", hint: `0–${RANK_SALES_THRESHOLD - 1} vendas` },
  { roas: ROAS_TRACTION, label: "Tração", hint: `${RANK_SALES_THRESHOLD}–${PROFIT_SALES_THRESHOLD - 1} vendas` },
  ...PROFIT_LADDER.map((roas) => ({ roas, label: "Lucro", hint: `${PROFIT_SALES_THRESHOLD}+ vendas` })),
]

function RoasLadder({ a, inputs }: { a: RoasAnalysis; inputs: RoasInputs }) {
  const progressTarget = a.nextMilestone
  const progress = progressTarget ? Math.min(inputs.salesCount / progressTarget, 1) : 1

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Escada do ROAS</h2>
        <p className="text-xs text-muted-foreground">
          {progressTarget
            ? `${inputs.salesCount} de ${progressTarget} vendas para a próxima fase`
            : `${inputs.salesCount} vendas · fase de lucro`}
        </p>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
      </div>

      <ol className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ladderSteps.map((step) => {
          const isRecommended = inputs.salePrice > 0 && Math.abs(step.roas - a.recommendedRoas) < 0.5
          const isCurrent = inputs.configuredRoas > 0 && Math.abs(step.roas - inputs.configuredRoas) < 0.5
          const losing = a.breakEvenRoas > 0 && step.roas < a.breakEvenRoas
          return (
            <li
              key={step.roas}
              className={`relative flex flex-col gap-0.5 rounded-lg border p-3 ${
                isRecommended ? "border-primary bg-primary/10 ring-1 ring-primary" : ""
              }`}
              aria-current={isRecommended ? "step" : undefined}
            >
              <span className="text-2xl font-bold tabular-nums tracking-tight">{step.roas}x</span>
              <span className="text-xs font-semibold">{step.label}</span>
              <span className="text-[11px] text-muted-foreground">{step.hint}</span>
              {inputs.salePrice > 0 && (
                <span className={`mt-1 text-[11px] tabular-nums ${losing ? "text-destructive" : "text-success"}`}>
                  {losing ? "prejuízo" : "lucro"} · {formatBRL(inputs.salePrice / step.roas)}/venda
                </span>
              )}
              {(isRecommended || isCurrent) && (
                <span className="absolute -top-2 right-2 rounded bg-foreground px-1.5 text-[10px] font-semibold text-background">
                  {isRecommended ? "FAZER" : "ATUAL"}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Metric({
  label,
  value,
  hint,
  tone,
  big,
}: {
  label: string
  value: string
  hint?: string
  tone?: "profit" | "loss" | "primary"
  big?: boolean
}) {
  const color =
    tone === "profit" ? "text-success" : tone === "loss" ? "text-destructive" : tone === "primary" ? "text-primary" : ""
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-bold tracking-tight tabular-nums ${big ? "text-3xl" : "text-2xl"} ${color}`}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

type FormState = {
  productName: string
  salePrice: number
  productCost: number
  shopeePercent: string
  shopeeFixed: number
  otherCosts: number
  salesCount: string
  recentSales: string
  realRoas: string
  configuredRoas: string
}

function initialForm(): FormState {
  return {
    productName: "",
    salePrice: 0,
    productCost: 0,
    shopeePercent: toText(Math.round(getShopeePercent() * 10000) / 100),
    shopeeFixed: getShopeeFixed(),
    otherCosts: 0,
    salesCount: "",
    recentSales: "",
    realRoas: "",
    configuredRoas: "",
  }
}

export function RoasAnalyzer() {
  const { products } = useStore()
  const history = useRoasHistory()
  const [form, setForm] = useState<FormState>(initialForm)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const inputs: RoasInputs = {
    productName: form.productName.trim(),
    salePrice: form.salePrice,
    productCost: form.productCost,
    shopeePercent: parseNumber(form.shopeePercent),
    shopeeFixed: form.shopeeFixed,
    otherCosts: form.otherCosts,
    salesCount: Math.floor(parseNumber(form.salesCount)),
    recentSales: form.recentSales === "" ? null : Math.floor(Number(form.recentSales)),
    realRoas: parseNumber(form.realRoas),
    configuredRoas: parseNumber(form.configuredRoas),
  }
  const a = analyzeRoas(inputs)
  const recommendation = buildRecommendation(inputs, a)

  function patch(p: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...p }))
    setSavedAt(null)
  }

  function handleNameChange(name: string) {
    const match = products.find((p) => p.name.toLowerCase() === name.trim().toLowerCase())
    if (!match) return patch({ productName: name })
    const extras = (match.extraCosts ?? []).reduce((s, e) => s + e.value, 0)
    patch({
      productName: name,
      salePrice: match.salePrice,
      productCost: Math.max(match.costPrice - extras, 0),
      otherCosts: extras,
    })
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!inputs.productName || inputs.salePrice <= 0) return
    await saveRoasAnalysis(inputs, a)
    setSavedAt(new Date().toISOString())
    document.getElementById("roas-resultado")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function openEntry(entryInputs: RoasInputs) {
    setForm({
      productName: entryInputs.productName,
      salePrice: entryInputs.salePrice,
      productCost: entryInputs.productCost,
      shopeePercent: toText(entryInputs.shopeePercent),
      shopeeFixed: entryInputs.shopeeFixed,
      otherCosts: entryInputs.otherCosts,
      salesCount: entryInputs.salesCount > 0 ? String(entryInputs.salesCount) : "",
      recentSales:
        entryInputs.recentSales === null || entryInputs.recentSales === undefined ? "" : String(entryInputs.recentSales),
      realRoas: toText(entryInputs.realRoas),
      configuredRoas: toText(entryInputs.configuredRoas),
    })
    setSavedAt(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const statusStyle = statusStyles[a.status]
  const StatusIcon = statusStyle.icon
  const DirectionIcon = a.direction === "AUMENTAR" ? ArrowUp : a.direction === "DIMINUIR" ? ArrowDown : Equal
  const canSave = inputs.productName.length > 0 && inputs.salePrice > 0
  const hasData = inputs.salePrice > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Formulário */}
      <form onSubmit={handleAnalyze} className="rounded-xl border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="roas-name">Nome do produto</Label>
            <Input
              id="roas-name"
              list="roas-products"
              value={form.productName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Digite ou escolha um produto do estoque"
              autoComplete="off"
            />
            <datalist id="roas-products">
              {products.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roas-sale">Preço de venda</Label>
            <CurrencyInput id="roas-sale" value={form.salePrice} onValueChange={(v) => patch({ salePrice: v ?? 0 })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roas-cost">Custo do produto</Label>
            <CurrencyInput id="roas-cost" value={form.productCost} onValueChange={(v) => patch({ productCost: v ?? 0 })} />
          </div>

          <NumberField
            id="roas-pct"
            label="Taxa percentual da Shopee"
            value={form.shopeePercent}
            onChange={(v) => patch({ shopeePercent: v })}
            suffix="%"
            placeholder="20"
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roas-fixed">Taxa fixa da Shopee</Label>
            <CurrencyInput id="roas-fixed" value={form.shopeeFixed} onValueChange={(v) => patch({ shopeeFixed: v ?? 0 })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roas-other">
              Outros custos <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <CurrencyInput id="roas-other" value={form.otherCosts} onValueChange={(v) => patch({ otherCosts: v ?? 0 })} />
          </div>
          <NumberField
            id="roas-sales"
            label="Vendas totais do produto"
            value={form.salesCount}
            onChange={(v) => patch({ salesCount: v })}
            placeholder="Ex.: 8"
            integer
          />

          <NumberField
            id="roas-config"
            label="ROAS configurado na campanha"
            value={form.configuredRoas}
            onChange={(v) => patch({ configuredRoas: v })}
            suffix="x"
            placeholder="Ex.: 10"
          />
          <NumberField
            id="roas-recent"
            label={
              <>
                Vendas nos últimos 3 dias <span className="font-normal text-muted-foreground">(opcional)</span>
              </>
            }
            value={form.recentSales}
            onChange={(v) => patch({ recentSales: v })}
            placeholder="Ex.: 2"
            integer
          />
          <NumberField
            id="roas-real"
            label={
              <>
                ROAS real (3 dias) <span className="font-normal text-muted-foreground">(opcional)</span>
              </>
            }
            value={form.realRoas}
            onChange={(v) => patch({ realRoas: v })}
            suffix="x"
            placeholder="Ex.: 18"
          />
          <div className="flex items-end">
            <Button type="submit" size="lg" className="w-full gap-2 font-semibold" disabled={!canSave}>
              <Sparkles className="size-4" />
              {savedAt ? "Análise salva" : "ANALISAR PRODUTO"}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Os resultados se atualizam enquanto você digita. O botão salva a análise no histórico.
        </p>
      </form>

      {/* Resultado */}
      <div id="roas-resultado" className="grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-4">
          <div className={`flex items-center gap-4 rounded-xl p-5 ${statusStyle.box}`}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-background/15">
              <StatusIcon className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide opacity-80">
                Status{hasData && !a.lowMargin ? ` · fase ${a.stage.toLowerCase()}` : ""}
              </p>
              <p className="text-3xl font-bold tracking-tight">{statusStyle.label}</p>
              <p className="mt-0.5 text-sm opacity-90 text-pretty">{a.action}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Metric
              label="ROAS para usar"
              value={hasData && !a.lowMargin ? formatRoas(a.recommendedRoas) : "—"}
              hint={inputs.configuredRoas > 0 ? `Atual: ${formatRoas(inputs.configuredRoas)}` : "Configure na campanha"}
              tone="primary"
              big
            />
            <Metric
              label="Pague até"
              value={hasData && !a.lowMargin ? formatBRL(a.cpa) : "—"}
              hint="de ADS por venda"
              big
            />
            <Metric
              label="Lucro por venda"
              value={hasData ? formatBRL(a.profitPerSale) : "—"}
              hint="depois do ADS"
              tone={hasData ? (a.profitPerSale >= 0 ? "profit" : "loss") : undefined}
            />
            <Metric
              label="ROAS de empate"
              value={a.breakEvenRoas > 0 ? formatRoas(Math.round(a.breakEvenRoas * 10) / 10) : "—"}
              hint={hasData ? `Margem ${formatPct(a.margin, 1)} antes do ADS` : undefined}
            />
          </div>

          <MarginBreakdown inputs={inputs} a={a} />
        </div>

        <div className="flex flex-col gap-4">
          <section className="flex flex-col rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">O que fazer agora?</h2>
              {a.direction && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                  <DirectionIcon className="size-3.5" />
                  {a.direction}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2 text-sm leading-relaxed">
              {recommendation.map((line) => (
                <p key={line} className="text-pretty">
                  {line}
                </p>
              ))}
            </div>

            {a.suggestedPrice !== null && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4">
                <Tag className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed">
                  <strong>Caminho recomendado: suba o preço para {formatBRL(a.suggestedPrice)}.</strong>{" "}
                  Assim você rankeia com {formatRoas(Math.max(a.recommendedRoas, ROAS_RANK))} sem prejuízo e ainda sobra{" "}
                  {formatBRL(a.suggestedPriceProfit)} por venda.
                  <span className="block text-xs text-muted-foreground">
                    Ou mantenha o preço atual e aceite o prejuízo só nas primeiras {RANK_SALES_THRESHOLD} vendas.
                  </span>
                </p>
              </div>
            )}

            {a.noSales && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                Sem vendas em 3 dias: baixe o ROAS, nunca aumente.
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="size-4" /> Como rodar a campanha
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed">
              <li>
                <strong>R$ {DAILY_BUDGET} por dia</strong> e deixe rodar <strong>3 dias sem mexer</strong>.
              </li>
              <li>
                Vendeu? Mantenha o ROAS até a próxima meta de vendas.
              </li>
              <li>
                3 dias sem venda em {ROAS_RANK}x? Baixe para <strong>{ROAS_UNLOCK}x</strong>. Não aumente.
              </li>
              <li>
                {RANK_SALES_THRESHOLD} vendas → {ROAS_TRACTION}x · {PROFIT_SALES_THRESHOLD} vendas →{" "}
                {PROFIT_LADDER.join("x, ")}x para lucrar.
              </li>
            </ul>
          </section>
        </div>
      </div>

      <RoasLadder a={a} inputs={inputs} />

      {/* Histórico */}
      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between gap-2 border-b p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <History className="size-4" /> Histórico de análises
          </h2>
          {history.loaded && !history.remote && history.entries.length > 0 && (
            <span className="text-xs text-muted-foreground">Salvo neste navegador</span>
          )}
        </div>

        {history.entries.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            {history.loaded
              ? "Nenhuma análise salva ainda. Preencha os dados e clique em Analisar produto."
              : "Carregando histórico..."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Produto</th>
                  <th className="px-3 py-3 font-medium">Data</th>
                  <th className="px-3 py-3 text-right font-medium">Vendas</th>
                  <th className="px-3 py-3 text-right font-medium">Margem</th>
                  <th className="px-3 py-3 text-right font-medium">Config.</th>
                  <th className="px-3 py-3 text-right font-medium">Usar</th>
                  <th className="px-3 py-3 text-right font-medium">Por venda</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Ação</th>
                  <th className="px-5 py-3 text-right font-medium">
                    <span className="sr-only">Opções</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{entry.inputs.productName}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{entry.inputs.salesCount}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatPct(entry.margin, 1)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatRoas(entry.inputs.configuredRoas)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatRoas(entry.roasMin)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {entry.cpaMax > 0 ? formatBRL(entry.cpaMax) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={entry.status} small />
                    </td>
                    <td className="min-w-48 px-3 py-3 text-muted-foreground">{entry.action}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEntry(entry.inputs)}>
                          Abrir
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => deleteRoasAnalysis(entry.id)}
                          aria-label={`Excluir análise de ${entry.inputs.productName}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
