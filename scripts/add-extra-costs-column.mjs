import pg from "pg"

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error("SUPABASE_DB_URL não definida.")
  process.exit(1)
}

const client = new pg.Client({
  connectionString,
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
