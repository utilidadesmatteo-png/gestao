// Autenticação de usuário único para o app de estoque.
// As credenciais ficam no código a pedido do usuário; a validação acontece
// sempre no servidor e a sessão é um cookie httpOnly assinado com HMAC.

const CREDENTIALS = {
  username: "matteoutilidades",
  password: "123456789",
}

// Segredo usado para assinar a sessão. Em um cenário ideal viria de uma
// variável de ambiente, mas o usuário optou por manter tudo no código.
const AUTH_SECRET = "matteo-estoque-chave-secreta-2026-a91f7c3e5b"

export const SESSION_COOKIE = "estoque_session"
// Valor do payload que representa uma sessão válida.
const SESSION_PAYLOAD = "matteoutilidades:autenticado"

export function checkCredentials(username: string, password: string): boolean {
  return username === CREDENTIALS.username && password === CREDENTIALS.password
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  return bufferToHex(signature)
}

// Gera o valor do cookie de sessão: "<payload>.<assinatura>".
export async function createSessionToken(): Promise<string> {
  const signature = await sign(SESSION_PAYLOAD)
  return `${SESSION_PAYLOAD}.${signature}`
}

// Verifica se o valor do cookie corresponde a uma sessão válida e não adulterada.
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const separator = token.lastIndexOf(".")
  if (separator === -1) return false
  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  if (payload !== SESSION_PAYLOAD) return false
  const expected = await sign(payload)
  // Comparação de tempo constante para evitar timing attacks.
  if (signature.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}
