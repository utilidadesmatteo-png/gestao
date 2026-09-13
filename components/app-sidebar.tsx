"use client"

import { Store, LayoutDashboard, Boxes, Receipt, Calculator, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export type View = "painel" | "estoque" | "vendas" | "calculadora"

type NavItem = {
  id: View
  label: string
  icon: React.ReactNode
}

const items: NavItem[] = [
  { id: "painel", label: "Painel", icon: <LayoutDashboard className="size-[18px]" /> },
  { id: "estoque", label: "Estoque", icon: <Boxes className="size-[18px]" /> },
  { id: "vendas", label: "Vendas", icon: <Receipt className="size-[18px]" /> },
  { id: "calculadora", label: "Calculadora Shopee", icon: <Calculator className="size-[18px]" /> },
]

export function AppSidebar({
  view,
  onViewChange,
}: {
  view: View
  onViewChange: (v: View) => void
}) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="flex flex-col gap-2 bg-sidebar text-sidebar-foreground lg:h-svh lg:w-64 lg:shrink-0 lg:sticky lg:top-0">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
          <Store className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Estoque Shopee</p>
          <p className="text-xs text-sidebar-foreground/60">Painel de controle</p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const active = view === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              aria-current={active ? "page" : undefined}
              className={`group flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:w-full ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              {item.icon}
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-[18px]" />
          Sair da conta
        </Button>
      </div>
    </aside>
  )
}
