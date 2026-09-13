"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const PASSWORD = "123456789"
const COOKIE = "estoque_auth"

type LoginState = { error: string | null }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "")

  if (password !== PASSWORD) {
    return { error: "Senha incorreta." }
  }

  const store = await cookies()
  store.set(COOKIE, "ok", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })

  redirect("/")
}

export async function logout() {
  const store = await cookies()
  store.delete(COOKIE)
  redirect("/login")
}
