import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance">
          Não foi possível confirmar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          O link de confirmação é inválido ou expirou. Tente entrar novamente ou refazer o cadastro.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/login">Voltar para o login</Link>
        </Button>
      </div>
    </main>
  )
}
