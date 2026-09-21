import pg from "pg"

const raw = process.env.SUPABASE_DB_URL
if (!raw) {
  console.error("SUPABASE_DB_URL não definida.")
  process.exit(1)
}
// O valor pode conter texto/comentários além da URL; extrai a connection string.
const match = raw.match(/postgres(?:ql)?:\/\/[^\s"'`]+/)
if (!match) {
  console.error("Não foi possível extrair a URL de conexão de SUPABASE_DB_URL.")
  process.exit(1)
}
const connectionString = match[0]
const parsed = new URL(connectionString)
const pwd = process.env.SUPABASE_DB_PASSWORD

const client = new pg.Client({
  host: parsed.hostname,
  port: parsed.port ? Number(parsed.port) : 5432,
  user: decodeURIComponent(parsed.username),
  password: pwd || decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, "") || "postgres",
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await client.connect()
  await client.query(
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS extra_costs jsonb NOT NULL DEFAULT '[]'::jsonb`,
  )
  const { rows } = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position`,
  )
  console.log("[v0] Colunas de products:", rows.map((r) => `${r.column_name}:${r.data_type}`).join(", "))
  await client.end()
}

main().catch((err) => {
  console.error("[v0] Erro na migração:", err.message)
  process.exit(1)
})
