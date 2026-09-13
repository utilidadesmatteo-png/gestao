import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Cookies seguros em produção; em dev ficam abertos para o localhost funcionar.
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
    },
  )
}
