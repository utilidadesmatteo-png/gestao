import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  // Renova a sessão do Supabase e protege as rotas.
  return await updateSession(request)
}

export const config = {
  // Protege todas as rotas, exceto assets estáticos e arquivos internos do Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
