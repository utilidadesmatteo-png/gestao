import { type NextRequest, NextResponse } from "next/server"

const COOKIE = "estoque_auth"

export function proxy(request: NextRequest) {
  const authed = request.cookies.get(COOKIE)?.value === "ok"
  const { pathname } = request.nextUrl
  const isLogin = pathname === "/login"

  if (!authed && !isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (authed && isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
