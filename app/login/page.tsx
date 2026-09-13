"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Store, Lock, MailCheck } from "lucide-react"

type Mode = "login" | "signup"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) return setError("Informe o e-mail.")
    if (password.length < 6) return setError("A senha deve ter ao menos 6 caracteres.")

    setPending(true)
    const supabase = createClient()

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setPending(false)
      if (error) {
        console.log("[v0] login error:", error.message)
        if (error.message.toLowerCase().includes("email not confirmed")) {
          return setError("Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.")
        }
        return setError("E-mail ou senha inválidos.")
      }
      router.push("/")
      router.refresh()
      return
    }

    // Cadastro
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
      },
    })
    setPending(false)

    if (error) {
      console.log("[v0] signup error:", error.message)
      if (error.message.toLowerCase().includes("already")) {
        return setError("Este e-mail já tem conta. Faça login.")
      }
      if (error.message.toLowerCase().includes("password")) {
        return setError("Senha muito fraca. Use ao menos 6 caracteres.")
      }
      return setError("Não foi possível criar a conta. Tente outro e-mail.")
    }

    // Se já veio sessão, a confirmação de e-mail está desligada: entra direto.
    if (data.session) {
      router.push("/")
      router.refresh()
      return
    }

    // Caso contrário, é preciso confirmar o e-mail.
    setConfirmSent(true)
  }

  if (confirmSent) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
            <MailCheck className="size-7" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance">Confirme seu e-mail</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Enviamos um link de confirmação para <span className="font-medium text-foreground">{email}</span>.
            Abra o link e depois volte para entrar.
          </p>
          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={() => {
              setConfirmSent(false)
              setMode("login")
              setPassword("")
            }}
          >
            Voltar para o login
          </Button>
        </div>
      </main>
    )
  }

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
            {mode === "login"
              ? "Entre com seu e-mail e senha para acessar o painel."
              : "Crie sua conta para começar a controlar seu estoque."}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="mt-2 w-full" disabled={pending}>
              <Lock className="size-4" />
              {pending
                ? mode === "login"
                  ? "Entrando..."
                  : "Criando conta..."
                : mode === "login"
                  ? "Entrar"
                  : "Criar conta"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Ainda não tem conta?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => {
                    setMode("signup")
                    setError(null)
                  }}
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => {
                    setMode("login")
                    setError(null)
                  }}
                >
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
