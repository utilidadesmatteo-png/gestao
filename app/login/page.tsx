"use client"

import { useActionState } from "react"
import { login, type LoginState } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Store, Lock } from "lucide-react"

const initialState: LoginState = { error: null }

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-sm">
            <Store className="size-7" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance">
            Controle de Estoque Shopee
          </h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Entre com suas credenciais para acessar o painel.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="Seu usuário"
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                required
              />
            </div>

            {state.error && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {state.error}
              </p>
            )}

            <Button type="submit" className="mt-2 w-full" disabled={pending}>
              <Lock className="size-4" />
              {pending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
