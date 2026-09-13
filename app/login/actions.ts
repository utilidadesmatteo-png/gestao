"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { checkCredentials, createSessionToken, SESSION_COOKIE } from "@/lib/auth"

export type LoginState = { error: string | null }

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!checkCredentials(username, password)) {
    return { error: "Usuário ou senha incorretos." }
  }

  const token = await createSessionToken()
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })

  redirect("/")
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/login")
}
