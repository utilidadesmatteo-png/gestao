"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Equal,
  History,
  Rocket,
  ShieldCheck,
  Sparkles,
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
  RANK_SALES_THRESHOLD,
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
  label: string
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
  ESCALAR: { box: "bg-success text-success-foreground", icon: Rocket, label: "ESCALAR" },
  AJUSTAR: { box: "border-2 border-primary bg-primary/10 text-foreground", icon: TrendingUp, label: "AJUSTAR" },
  MANTER: { box: "bg-foreground text-background", icon: Equal, label: "MANTER" },
  "MARGEM BAIXA": { box: "bg-destructive text-white", icon: AlertTriangle, label: "MARGEM BAIXA" },
  AGUARDANDO: { box: "border border-dashed bg-muted/40 text-muted-foreground", icon: Sparkles, label: "AGUARDANDO DADOS" },
}

function StatusBadge({ status, small }: { status: RoasStatus; small?: boolean }) {
  const s = statusStyles[status]
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
  if (a.status === "AGUARDANDO" && inputs.salePrice <= 0) {
    return ["Preencha o preço de venda e o custo do produto para ver a análise."]
  }
  if (a.lowMargin) {
    return [
      `Sua margem antes dos ADS é de ${formatPct(a.margin)}.`,
      "Este produto possui margem inferior a 10%. Revise preço de venda, custo do produto ou taxas antes de investir em ADS.",
      "Não é recomendada uma estratégia agressiva de anúncios neste momento.",
    ]
  }
  const base = [
    `Sua margem é de ${formatPct(a.margin)}.`,
    `Você pode utilizar até ${a.adsMaxPercent}% do faturamento em ADS.`,
    `Seu ROAS mínimo é ${a.roasMin}x.`,
  ]
  if (a.phase === "RANK") {
    return [
      `Seu produto possui ${inputs.salesCount} ${inputs.salesCount === 1 ? "venda" : "vendas"} e ainda está em fase de ranqueamento.`,
      ...base,
      `Para RANK, utilize aproximadamente ${a.rankRange[0]}x a ${a.rankRange[1]}x (recomendado: ${a.rankRange[0]}x).`,
      `Você pode gastar até ${formatBRL(a.cpaMax)} em anúncio para gerar cada venda.`,
      "Produto em fase de ranqueamento. Priorize geração de vendas sem ultrapassar o limite de ADS definido pela margem.",
    ]
  }
  if (a.status === "AGUARDANDO") {
    return [
      `Seu produto já possui ${inputs.salesCount} vendas e está em modo ESCALA.`,
      ...base,
      "Informe o ROAS configurado na campanha e o ROAS real dos últimos 3 dias para receber a recomendação.",
    ]
  }
  const head = [
    `Seu produto já possui ${inputs.salesCount} vendas.`,
    `Seu ROAS configurado é ${formatRoas(inputs.configuredRoas)} e seu ROAS real dos últimos 3 dias foi ${formatRoas(inputs.realRoas)}.`,
  ]
  if (a.configuredBelowFloor) {
    return [
      ...head,
      `O ROAS configurado está abaixo do ROAS mínimo seguro (${a.roasMin}x). Nesse nível, o gasto com ADS passa do limite permitido pela margem.`,
      `Status: AJUSTAR. Ação recomendada: subir o ROAS da campanha para pelo menos ${a.roasMin}x.`,
    ]
  }
  if (a.status === "ESCALAR") {
    return [
      ...head,
      "O desempenho real está acima da meta da campanha.",
      "Status: ESCALAR. Ação recomendada: aumentar gradualmente o ROAS alvo buscando mais rentabilidade.",
    ]
  }
  if (a.status === "MANTER") {
    return [
      ...head,
      "A campanha está entregando próxima da meta configurada. Mantenha o ROAS atual e continue acompanhando os próximos dias.",
    ]
  }
  if (a.atFloor) {
    return [
      ...head,
      "A campanha está entregando abaixo da meta configurada.",
      `Status: AJUSTAR. O ROAS configurado já está no limite de segurança (${a.roasMin}x) e não pode ser reduzido. Revise preço, custo ou anúncio antes de mexer no ROAS.`,
    ]
  }
  return [
    ...head,
    "A campanha está entregando abaixo da meta configurada.",
    "Status: AJUSTAR. Ação recomendada: reduzir o ROAS configurado para facilitar a entrega da campanha.",
    `Nunca ultrapasse para baixo o ROAS mínimo seguro do produto (${a.roasMin}x).`,
  ]
}

function RoasScale({ a, configured, real }: { a: RoasAnalysis; configured: number; real: number }) {
  if (a.lowMargin || a.roasMin <= 0) return null
  const safeStart = a.rankRange[1]
  const scaleStart = Math.ceil(a.roasMin * 1.5)
  const max = Math.max(a.roasMin * 2, configured, real, scaleStart + 2) * 1.1
  const pos = (v: number) => `${Math.min(Math.max((v / max) * 100, 0), 100)}%`

  const zones = [
    { from: 0, to: a.roasMin, label: "Prejuízo / Risco", cls: "bg-destructive/70" },
    { from: a.roasMin, to: safeStart, label: "Rank", cls: "bg-primary" },
    { from: safeStart, to: scaleStart, label: "Seguro", cls: "bg-success/50" },
    { from: scaleStart, to: max, label: "Lucro / Escala", cls: "bg-success" },
  ].filter((z) => z.to > z.from)

  const markers = [
    { value: configured, label: "Atual", cls: "bg-foreground" },
    { value: real, label: "Real", cls: "bg-primary" },
  ].filter((m) => m.value > 0)

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Onde está o seu ROAS
      </h2>

      <div className="relative mt-10 mb-2">
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          {zones.map((z) => (
            <div key={z.label} className={z.cls} style={{ width: `${((z.to - z.from) / max) * 100}%` }} />
          ))}
        </div>

        {/* Piso de segurança */}
        <div className="absolute -top-7 bottom-[-6px] flex flex-col items-center" style={{ left: pos(a.roasMin) }}>
          <span className="-translate-x-1/2 whitespace-nowrap rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">
            ROAS MÍNIMO {a.roasMin}x
          </span>
          <span className="w-0.5 flex-1 -translate-x-1/2 bg-destructive" />
        </div>

        {markers.map((m) => (
          <div
            key={m.label}
            className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: pos(m.value) }}
          >
            <span className={`size-4 rounded-full border-2 border-card ${m.cls}`} aria-hidden />
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        {markers.map((m) => (
          <span key={m.label} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${m.cls}`} aria-hidden />
            ROAS {m.label.toLowerCase()}: <strong className="text-foreground">{formatRoas(m.value)}</strong>
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {zones.map((z) => (
          <div key={z.label} className="flex items-center gap-1.5">
            <span className={`size-2.5 shrink-0 rounded-sm ${z.cls}`} aria-hidden />
            <span className="text-muted-foreground">{z.label}</span>
          </div>
        ))}
      </div>
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
            id="roas-real"
            label="ROAS real (últimos 3 dias)"
            value={form.realRoas}
            onChange={(v) => patch({ realRoas: v })}
            suffix="x"
            placeholder="Ex.: 18"
          />
          <NumberField
            id="roas-config"
            label="ROAS configurado na campanha"
            value={form.configuredRoas}
            onChange={(v) => patch({ configuredRoas: v })}
            suffix="x"
            placeholder="Ex.: 15"
          />
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" size="lg" className="w-full gap-2 font-semibold" disabled={!canSave}>
              <Sparkles className="size-4" />
              {savedAt ? "Análise salva no histórico" : "ANALISAR PRODUTO"}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Os resultados abaixo se atualizam enquanto você digita. O botão salva a análise no histórico.
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
                Status {a.phase === "ESCALA" && !a.lowMargin && inputs.salePrice > 0 ? "· modo escala" : ""}
              </p>
              <p className="text-3xl font-bold tracking-tight">{statusStyle.label}</p>
              <p className="mt-0.5 text-sm opacity-90 text-pretty">{a.action}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Metric label="ROAS mínimo" value={a.roasMin > 0 ? `${a.roasMin}x` : "—"} hint="Piso de segurança" tone="primary" big />
            <Metric
              label="CPA máximo"
              value={a.cpaMax > 0 ? formatBRL(a.cpaMax) : "—"}
              hint="de ADS por venda"
              big
            />
            <Metric label="ROAS atual" value={formatRoas(inputs.configuredRoas)} hint="Configurado na campanha" />
            <Metric label="ROAS real" value={formatRoas(inputs.realRoas)} hint="Últimos 3 dias" />
            <Metric
              label="Margem"
              value={inputs.salePrice > 0 ? formatPct(a.margin) : "—"}
              hint="antes dos ADS"
              tone={inputs.salePrice > 0 ? (a.lowMargin ? "loss" : "profit") : undefined}
            />
            <Metric
              label="Lucro antes dos ADS"
              value={inputs.salePrice > 0 ? formatBRL(a.profitBeforeAds) : "—"}
              tone={inputs.salePrice > 0 ? (a.profitBeforeAds >= 0 ? "profit" : "loss") : undefined}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <section className="flex flex-1 flex-col rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">O que fazer agora?</h2>
              {a.direction && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                  <DirectionIcon className="size-3.5" />
                  Direção: {a.direction}
                </span>
              )}
            </div>

            {!a.lowMargin && a.adsMaxPercent > 0 && inputs.salePrice > 0 && (
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-muted/50 p-4">
                <Wallet className="size-5 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed">
                  Você pode pagar até <strong className="text-base">{formatBRL(a.cpaMax)}</strong> de ADS por venda
                  <span className="block text-xs text-muted-foreground">
                    ADS máximo: {a.adsMaxPercent}% do faturamento · ROAS mínimo: {a.roasMin}x
                    {a.phase === "RANK" ? " · Orçamento: ilimitado" : ""}
                  </span>
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 text-sm leading-relaxed">
              {recommendation.map((line) => (
                <p key={line} className="text-pretty">
                  {line}
                </p>
              ))}
            </div>

            {a.phase === "ESCALA" && !a.lowMargin && a.status !== "AGUARDANDO" && (
              <dl className="mt-4 grid grid-cols-2 gap-2 rounded-lg border p-3 text-sm sm:grid-cols-4">
                {[
                  ["ROAS atual", formatRoas(inputs.configuredRoas)],
                  ["ROAS real", formatRoas(inputs.realRoas)],
                  ["ROAS mínimo", `${a.roasMin}x`],
                  ["Limite permitido", `≥ ${a.roasMin}x`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            {!a.lowMargin && a.roasMin > 0 && (a.status === "AJUSTAR" || a.configuredBelowFloor) && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                <ShieldCheck className="size-4 shrink-0" />
                LIMITE DE SEGURANÇA: {a.roasMin}x
              </div>
            )}

            {a.lowMargin && inputs.salePrice > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                MARGEM MUITO BAIXA
              </div>
            )}
          </section>
        </div>
      </div>

      <RoasScale a={a} configured={inputs.configuredRoas} real={inputs.realRoas} />

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
                  <th className="px-3 py-3 text-right font-medium">ROAS mín.</th>
                  <th className="px-3 py-3 text-right font-medium">Config.</th>
                  <th className="px-3 py-3 text-right font-medium">Real</th>
                  <th className="px-3 py-3 text-right font-medium">CPA máx.</th>
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
                    <td className="px-3 py-3 text-right tabular-nums">{formatRoas(entry.roasMin)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatRoas(entry.inputs.configuredRoas)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatRoas(entry.inputs.realRoas)}</td>
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

      <p className="text-xs text-muted-foreground">
        Regra: menos de {RANK_SALES_THRESHOLD} vendas = RANK. A partir de {RANK_SALES_THRESHOLD} vendas o produto entra
        em modo ESCALA e a recomendação compara o ROAS real com o configurado, sempre respeitando o ROAS mínimo.
      </p>
    </div>
  )
}
