import pg from "pg"

const { Client } = pg
const PROJECT_REF = "mpqrlnvxiypmabtfpfpc"

function isPlaceholder(v) {
  return !v || v.includes("YOUR-PASSWORD") || v.includes("YOUR_PASSWORD")
}

function extractConnParts(text) {
  if (!text) return []
  const results = []
  const re = /postgres(?:ql)?:\/\/([^:@\s]+):\s*([^@]*?)\s*@([^:/\s]+):(\d+)/g
  let m
  while ((m = re.exec(text)) !== null) {
    const user = decodeURIComponent(m[1])
    let password = m[2].replace(/[[\]]/g, "").trim()
    try {
      password = decodeURIComponent(password)
    } catch {}
    if (password && !isPlaceholder(password)) {
      results.push({ user, password, host: m[3], port: Number(m[4]) || 5432 })
    }
  }
  return results
}

const parts =
  extractConnParts(process.env.SUPABASE_DB_PASSWORD)[0] ||
  extractConnParts(process.env.SUPABASE_DB_URL)[0]

if (!parts) {
  console.error("[v0] Sem credencial valida.")
  process.exit(2)
}

const client = new Client({
  host: parts.host,
  port: parts.port,
  user: parts.user || `postgres.${PROJECT_REF}`,
  password: parts.password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

await client.connect()

// Confirma e-mails de contas de teste (dev-only) para permitir login imediato na verificacao.
const res = await client.query(
  "update auth.users set email_confirmed_at = now() where email like 'teste.v0.%@gmail.com' and email_confirmed_at is null returning email",
)
console.log("[v0] Contas de teste confirmadas:", res.rows.map((r) => r.email).join(", ") || "(nenhuma)")

await client.end()
