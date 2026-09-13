"use client"

import { useStore } from "@/lib/store"
import { computeSummary, SHOPEE_FIXED, SHOPEE_PERCENT } from "@/lib/calculations"
import { StatCards } from "@/components/stat-cards"
import { AddProductDialog } from "@/components/add-product-dialog"
import { RegisterSaleDialog } from "@/components/register-sale-dialog"
import { ProductsTable } from "@/components/products-table"
import { SalesTable } from "@/components/sales-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Store } from "lucide-react"

export default function Page() {
  const { products, sales } = useStore()
  const summary = computeSummary(products, sales)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              Controle de Estoque Shopee
            </h1>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Taxa aplicada: {SHOPEE_PERCENT * 100}% sobre o custo + {"R$"}
              {SHOPEE_FIXED.toFixed(2).replace(".", ",")} fixo por item.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <RegisterSaleDialog />
          <AddProductDialog />
        </div>
      </header>

      <section className="mt-8" aria-label="Resumo do estoque">
        <StatCards summary={summary} />
      </section>

      <section className="mt-8">
        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Estoque ({products.length})</TabsTrigger>
            <TabsTrigger value="sales">Vendas ({sales.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="products" className="mt-4">
            <ProductsTable products={products} />
          </TabsContent>
          <TabsContent value="sales" className="mt-4">
            <SalesTable sales={sales} />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}
