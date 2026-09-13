import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const isAuthenticated = await verifySessionToken(token)
  const isLoginPage = pathname === "/login"

  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Protege todas as rotas, exceto assets estáticos e arquivos internos do Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
