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

// Descobre a senha: aceita SUPABASE_DB_PASSWORD (preferido) ou extrai da SUPABASE_DB_URL.
function resolvePassword() {
  const raw = process.env.SUPABASE_DB_PASSWORD
  if (raw && raw.trim() && !raw.includes("[") && !raw.includes("YOUR-PASSWORD")) {
    return raw.trim()
  }
  const url = process.env.SUPABASE_DB_URL
  if (url) {
    const match = url.match(/postgres(?:ql)?:\/\/[^:]+:([^@]+)@/)
    if (match && match[1] && !match[1].includes("YOUR-PASSWORD") && !match[1].includes("[")) {
      return decodeURIComponent(match[1])
    }
  }
  return null
}

const password = resolvePassword()

if (!password) {
  console.error("[v0] Nenhuma senha de banco válida encontrada.")
  console.error("[v0] Defina SUPABASE_DB_PASSWORD com a senha real do banco (sem colchetes).")
  process.exit(2)
}

// Endereços candidatos, do mais provável (pooler IPv4, São Paulo) ao direto (IPv6).
const candidates = [
  { label: "pooler aws-0 sa-east-1 (session 5432)", host: "aws-0-sa-east-1.pooler.supabase.com", port: 5432, user: `postgres.${PROJECT_REF}` },
  { label: "pooler aws-1 sa-east-1 (session 5432)", host: "aws-1-sa-east-1.pooler.supabase.com", port: 5432, user: `postgres.${PROJECT_REF}` },
  { label: "pooler aws-0 sa-east-1 (transaction 6543)", host: "aws-0-sa-east-1.pooler.supabase.com", port: 6543, user: `postgres.${PROJECT_REF}` },
  { label: "conexão direta (IPv6)", host: `db.${PROJECT_REF}.supabase.co`, port: 5432, user: "postgres" },
]

async function tryCandidate(c) {
  const client = new Client({
    host: c.host,
    port: c.port,
    user: c.user,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  })
  await client.connect()
  return client
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
  console.error("[v0] Não foi possível conectar em nenhum endereço. Verifique se a senha está correta.")
  process.exit(3)
}

try {
  await connected.query(sql)
  console.log("[v0] Tabelas e políticas RLS criadas com sucesso")
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
