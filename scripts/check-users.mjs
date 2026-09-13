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
    let password = m[2].replace(/[[\]]/g, "").trim()
    try { password = decodeURIComponent(password) } catch {}
    if (password && !isPlaceholder(password)) {
      results.push({ user: decodeURIComponent(m[1]), password, host: m[3], port: Number(m[4]) || 5432 })
    }
  }
  return results
}

const parts = extractConnParts(process.env.SUPABASE_DB_PASSWORD)[0] || extractConnParts(process.env.SUPABASE_DB_URL)[0]
if (!parts) { console.error("[v0] Sem credencial valida."); process.exit(2) }

const client = new Client({
  host: parts.host, port: parts.port, user: parts.user || `postgres.${PROJECT_REF}`,
  password: parts.password, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
})
await client.connect()
const res = await client.query(
  "select email, email_confirmed_at is not null as confirmado, created_at from auth.users order by created_at desc limit 5",
)
console.log("[v0] Total de usuarios (ultimos 5):")
for (const r of res.rows) {
  console.log(`  - ${r.email} | confirmado: ${r.confirmado}`)
}
if (res.rows.length === 0) console.log("  (nenhum usuario cadastrado)")
await client.end()
