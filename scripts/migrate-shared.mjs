import pg from "pg"

const { Client } = pg

const PROJECT_REF = "mpqrlnvxiypmabtfpfpc"

const sql = `
-- Modelo compartilhado: nao exige mais user_id e libera acesso via chave anon.
alter table public.products alter column user_id drop not null;
alter table public.sales alter column user_id drop not null;

drop policy if exists "products_select_own" on public.products;
drop policy if exists "products_insert_own" on public.products;
drop policy if exists "products_update_own" on public.products;
drop policy if exists "products_delete_own" on public.products;
drop policy if exists "sales_select_own" on public.sales;
drop policy if exists "sales_insert_own" on public.sales;
drop policy if exists "sales_update_own" on public.sales;
drop policy if exists "sales_delete_own" on public.sales;

drop policy if exists "products_all" on public.products;
drop policy if exists "sales_all" on public.sales;

create policy "products_all" on public.products for all using (true) with check (true);
create policy "sales_all" on public.sales for all using (true) with check (true);
`

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
    const host = m[3]
    const port = Number(m[4]) || 5432
    if (password && !isPlaceholder(password)) {
      results.push({ user, password, host, port })
    }
  }
  return results
}

function buildCandidates() {
  const candidates = []
  const seen = new Set()
  const push = (c) => {
    const key = `${c.host}:${c.port}:${c.user}`
    if (!seen.has(key) && c.password && !isPlaceholder(c.password)) {
      seen.add(key)
      candidates.push(c)
    }
  }

  let derivedPassword = null
  for (const varName of ["SUPABASE_DB_PASSWORD", "SUPABASE_DB_URL"]) {
    for (const parts of extractConnParts(process.env[varName])) {
      if (!derivedPassword) derivedPassword = parts.password
      push({
        label: `URL de ${varName} (${parts.host}:${parts.port})`,
        host: parts.host,
        port: parts.port,
        user: parts.user || "postgres",
        password: parts.password,
      })
    }
  }

  const rawPass = (process.env.SUPABASE_DB_PASSWORD || "").trim()
  if (!derivedPassword && rawPass && !rawPass.includes("postgres") && !isPlaceholder(rawPass)) {
    derivedPassword = rawPass.replace(/[[\]]/g, "").trim()
  }

  if (derivedPassword) {
    const endpoints = [
      { label: "pooler aws-0 sa-east-1 (session 5432)", host: "aws-0-sa-east-1.pooler.supabase.com", port: 5432, user: `postgres.${PROJECT_REF}` },
      { label: "pooler aws-0 sa-east-1 (transaction 6543)", host: "aws-0-sa-east-1.pooler.supabase.com", port: 6543, user: `postgres.${PROJECT_REF}` },
      { label: "conexao direta (IPv6)", host: `db.${PROJECT_REF}.supabase.co`, port: 5432, user: "postgres" },
    ]
    for (const e of endpoints) push({ ...e, password: derivedPassword })
  }

  return candidates
}

async function tryCandidate(c) {
  const client = new Client({
    host: c.host,
    port: c.port,
    user: c.user,
    password: c.password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  })
  await client.connect()
  return client
}

const candidates = buildCandidates()
if (candidates.length === 0) {
  console.error("[v0] Nenhuma credencial de banco valida encontrada.")
  process.exit(2)
}

let connected = null
for (const c of candidates) {
  try {
    console.log(`[v0] Tentando: ${c.label} ...`)
    connected = await tryCandidate(c)
    console.log(`[v0] Conectado via ${c.label}`)
    break
  } catch (err) {
    console.log(`[v0]   falhou (${err.code || err.message})`)
  }
}

if (!connected) {
  console.error("[v0] Nao foi possivel conectar.")
  process.exit(3)
}

try {
  await connected.query(sql)
  console.log("[v0] Migracao para modelo compartilhado concluida com sucesso")
} catch (err) {
  console.error("[v0] Erro ao executar o SQL:", err.message)
  process.exit(4)
} finally {
  await connected.end()
}
