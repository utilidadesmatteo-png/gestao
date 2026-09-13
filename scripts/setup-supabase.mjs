import pg from "pg"

const { Client } = pg

const PROJECT_REF = "mpqrlnvxiypmabtfpfpc"

const sql = `
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cost_price numeric not null default 0,
  sale_price numeric not null default 0,
  quantity integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  cost_price numeric not null default 0,
  sale_price numeric not null default 0,
  quantity integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.sales enable row level security;

drop policy if exists "products_select_own" on public.products;
drop policy if exists "products_insert_own" on public.products;
drop policy if exists "products_update_own" on public.products;
drop policy if exists "products_delete_own" on public.products;

create policy "products_select_own" on public.products for select using (auth.uid() = user_id);
create policy "products_insert_own" on public.products for insert with check (auth.uid() = user_id);
create policy "products_update_own" on public.products for update using (auth.uid() = user_id);
create policy "products_delete_own" on public.products for delete using (auth.uid() = user_id);

drop policy if exists "sales_select_own" on public.sales;
drop policy if exists "sales_insert_own" on public.sales;
drop policy if exists "sales_update_own" on public.sales;
drop policy if exists "sales_delete_own" on public.sales;

create policy "sales_select_own" on public.sales for select using (auth.uid() = user_id);
create policy "sales_insert_own" on public.sales for insert with check (auth.uid() = user_id);
create policy "sales_update_own" on public.sales for update using (auth.uid() = user_id);
create policy "sales_delete_own" on public.sales for delete using (auth.uid() = user_id);
`

function isPlaceholder(v) {
  return !v || v.includes("YOUR-PASSWORD") || v.includes("YOUR_PASSWORD")
}

// Extrai user/senha/host/porta de uma URL postgres, TOLERANDO espacos em volta
// da senha (": senha @") e colchetes ao redor dela ("[senha]").
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
    } catch {
      // mantem literal se nao for percent-encoding valido
    }
    const host = m[3]
    const port = Number(m[4]) || 5432
    if (password && !isPlaceholder(password)) {
      results.push({ user, password, host, port })
    }
  }
  return results
}

// Monta candidatos de conexão a partir de tudo que temos.
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

  // 1) Partes extraidas das URLs presentes nas variaveis (host/user/senha da propria URL).
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

  // 2) Senha pura (quando SUPABASE_DB_PASSWORD e so a senha, sem URL).
  const rawPass = (process.env.SUPABASE_DB_PASSWORD || "").trim()
  if (!derivedPassword && rawPass && !rawPass.includes("postgres") && !isPlaceholder(rawPass)) {
    derivedPassword = rawPass.replace(/[[\]]/g, "").trim()
  }

  // 3) Senha aplicada aos endpoints conhecidos (fallback).
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
  console.error("[v0] Defina SUPABASE_DB_PASSWORD com a senha real do banco (sem colchetes, sem [YOUR-PASSWORD]).")
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
  console.error("[v0] Nao foi possivel conectar. A senha do banco parece estar incorreta.")
  process.exit(3)
}

try {
  await connected.query(sql)
  console.log("[v0] Tabelas e politicas RLS criadas com sucesso")
  const res = await connected.query(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('products','sales') order by table_name",
  )
  console.log("[v0] Tabelas presentes:", res.rows.map((r) => r.table_name).join(", ") || "(nenhuma)")
} catch (err) {
  console.error("[v0] Erro ao executar o SQL:", err.message)
  process.exit(4)
} finally {
  await connected.end()
}
