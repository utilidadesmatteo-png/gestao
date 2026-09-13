"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { computeSummary, SHOPEE_FIXED, SHOPEE_PERCENT } from "@/lib/calculations"
import { StatCards } from "@/components/stat-cards"
import { AddProductDialog } from "@/components/add-product-dialog"
import { RegisterSaleDialog } from "@/components/register-sale-dialog"
import { ProductsTable } from "@/components/products-table"
import { SalesTable } from "@/components/sales-table"
import { AppSidebar, type View } from "@/components/app-sidebar"
import { ShopeeCalculator } from "@/components/shopee-calculator"

const titles: Record<View, { title: string; subtitle: string }> = {
  painel: {
    title: "Painel",
    subtitle: "Visão geral do seu estoque, faturamento e lucro.",
  },
  estoque: {
    title: "Estoque",
    subtitle: "Todos os produtos com custo, venda, lucro e margem por unidade.",
  },
  vendas: {
    title: "Vendas",
    subtitle: "Histórico das vendas registradas e o lucro de cada uma.",
  },
  calculadora: {
    title: "Calculadora Shopee",
    subtitle: "Precifique seus produtos com base nas taxas da Shopee.",
  },
}

export default function Page() {
  const { products, sales } = useStore()
  const summary = computeSummary(products, sales)
  const [view, setView] = useState<View>("painel")

  const feeLabel = `${SHOPEE_PERCENT * 100}% sobre o custo + R$${SHOPEE_FIXED.toFixed(2).replace(".", ",")} fixo por item`

  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      <AppSidebar view={view} onViewChange={setView} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-balance">{titles[view].title}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{titles[view].subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <RegisterSaleDialog />
              <AddProductDialog />
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">
          {view === "painel" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4 text-sm">
                <span className="font-medium">Taxa da Shopee aplicada:</span>
                <span className="text-muted-foreground">{feeLabel}</span>
              </div>
              <StatCards summary={summary} />
            </div>
          )}

          {view === "estoque" && <ProductsTable products={products} />}

          {view === "vendas" && <SalesTable sales={sales} />}

          {view === "calculadora" && <ShopeeCalculator />}
        </main>
      </div>
    </div>
  )
}
