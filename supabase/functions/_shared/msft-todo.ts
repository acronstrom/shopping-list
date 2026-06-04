// Shared Microsoft To Do helpers.
// Used by msft-todo (sync action), msft-todo-cron-sync, and msft-todo-callback.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export const MSFT_AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0"
export const MSFT_GRAPH = "https://graph.microsoft.com/v1.0"
export const MSFT_SCOPES = "Tasks.Read User.Read offline_access"

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

export interface MsftTodoConnectionRow {
  id: string
  household_id: string
  connected_by: string
  connected_email: string
  access_token: string
  refresh_token: string
  expires_at: string
  list_id: string | null
  list_name: string | null
  last_synced_at: string | null
  last_sync_error: string | null
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, { status })
}

// ============================================================
// OAuth state — HMAC-signed payload, no DB roundtrip
// ============================================================

interface StatePayload {
  householdId: string
  userId: string
  nonce: string
  issuedAt: number
}

const STATE_TTL_MS = 10 * 60 * 1000

export async function signOAuthState(payload: Omit<StatePayload, "issuedAt" | "nonce">): Promise<string> {
  const full: StatePayload = {
    ...payload,
    nonce: crypto.randomUUID(),
    issuedAt: Date.now(),
  }
  const json = JSON.stringify(full)
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(json))
  const sig = await hmac(payloadB64)
  return `${payloadB64}.${sig}`
}

export async function verifyOAuthState(state: string): Promise<StatePayload | null> {
  const [payloadB64, sig] = state.split(".")
  if (!payloadB64 || !sig) return null
  const expected = await hmac(payloadB64)
  if (!timingSafeEqual(sig, expected)) return null
  let parsed: StatePayload
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)))
  } catch {
    return null
  }
  if (Date.now() - parsed.issuedAt > STATE_TTL_MS) return null
  return parsed
}

async function hmac(input: string): Promise<string> {
  const secret = Deno.env.get("MSFT_OAUTH_STATE_SECRET")
  if (!secret) throw new Error("MSFT_OAUTH_STATE_SECRET is not set")
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input))
  return base64UrlEncode(new Uint8Array(sig))
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)
  const bin = atob(padded)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ============================================================
// Token exchange / refresh
// ============================================================

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}

export async function exchangeAuthCode(code: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: Deno.env.get("MSFT_CLIENT_ID")!,
    client_secret: Deno.env.get("MSFT_CLIENT_SECRET")!,
    code,
    redirect_uri: Deno.env.get("MSFT_REDIRECT_URI")!,
    grant_type: "authorization_code",
    scope: MSFT_SCOPES,
  })
  const res = await fetch(`${MSFT_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<TokenResponse>
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: Deno.env.get("MSFT_CLIENT_ID")!,
    client_secret: Deno.env.get("MSFT_CLIENT_SECRET")!,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: MSFT_SCOPES,
  })
  const res = await fetch(`${MSFT_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token refresh failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<TokenResponse>
}

// Returns a connection with a fresh access_token (refreshing + persisting
// if expires_at is within 60 seconds). Throws if refresh fails — caller
// should catch and mark last_sync_error.
export async function ensureFreshAccessToken(
  supabase: ReturnType<typeof serviceClient>,
  connection: MsftTodoConnectionRow,
): Promise<MsftTodoConnectionRow> {
  const expiresAt = new Date(connection.expires_at).getTime()
  if (expiresAt > Date.now() + 60_000) return connection

  const refreshed = await refreshAccessToken(connection.refresh_token)
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  const patch = {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? connection.refresh_token,
    expires_at: newExpiresAt,
  }
  const { error } = await supabase
    .from("household_msft_todo_connections")
    .update(patch)
    .eq("id", connection.id)
  if (error) throw new Error(`Could not persist refreshed token: ${error.message}`)
  return { ...connection, ...patch }
}

// ============================================================
// Graph helpers
// ============================================================

export interface MsftTask {
  id: string
  title: string
  status: string
}

async function graphFetch(url: string, accessToken: string, label: string): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`${label} failed: ${res.status} ${body.slice(0, 500)}`)
  }
  return res
}

export async function fetchMe(accessToken: string): Promise<{ mail: string | null; userPrincipalName: string | null }> {
  const res = await graphFetch(`${MSFT_GRAPH}/me`, accessToken, "/me")
  return res.json() as Promise<{ mail: string | null; userPrincipalName: string | null }>
}

export async function fetchLists(accessToken: string): Promise<Array<{ id: string; displayName: string }>> {
  const res = await graphFetch(`${MSFT_GRAPH}/me/todo/lists`, accessToken, "/me/todo/lists")
  const json = await res.json() as { value: Array<{ id: string; displayName: string }> }
  return json.value ?? []
}

export async function fetchOpenTasks(accessToken: string, listId: string): Promise<MsftTask[]> {
  const url = `${MSFT_GRAPH}/me/todo/lists/${encodeURIComponent(listId)}/tasks`
    + `?$filter=${encodeURIComponent("status ne 'completed'")}`
  const res = await graphFetch(url, accessToken, "/me/todo/lists/{id}/tasks")
  const json = await res.json() as { value: MsftTask[] }
  return json.value ?? []
}

// ============================================================
// Sync algorithm
// ============================================================

export interface SyncResult {
  added: number
  alreadyTracked: number
  error?: string
}

function capitalizeFirst(s: string): string {
  if (!s) return s
  return s[0].toLocaleUpperCase("sv") + s.slice(1)
}

export async function syncOneConnection(
  supabase: ReturnType<typeof serviceClient>,
  rawConnection: MsftTodoConnectionRow,
): Promise<SyncResult> {
  if (!rawConnection.list_id) {
    return { added: 0, alreadyTracked: 0, error: "Ingen lista vald" }
  }

  let connection: MsftTodoConnectionRow
  try {
    connection = await ensureFreshAccessToken(supabase, rawConnection)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase
      .from("household_msft_todo_connections")
      .update({ last_sync_error: "Anslutningen behöver återskapas" })
      .eq("id", rawConnection.id)
    return { added: 0, alreadyTracked: 0, error: message }
  }

  let tasks: MsftTask[]
  try {
    tasks = await fetchOpenTasks(connection.access_token, connection.list_id!)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase
      .from("household_msft_todo_connections")
      .update({ last_sync_error: `Kunde inte hämta uppgifter (${message})` })
      .eq("id", connection.id)
    return { added: 0, alreadyTracked: 0, error: message }
  }

  let added = 0
  let alreadyTracked = 0

  for (const task of tasks) {
    const title = task.title?.trim()
    if (!title) continue

    // Try to insert a link row. If it conflicts we already know about the
    // task — just bump last_seen_at and move on. Using returning to detect
    // which path we took.
    const { data: linkInsert, error: insErr } = await supabase
      .from("msft_todo_task_links")
      .insert({
        household_id: connection.household_id,
        msft_task_id: task.id,
        last_seen_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle()

    if (insErr) {
      // PG 23505 (unique_violation) = already tracked. Anything else =
      // real error; bubble up so we record it once at the end.
      if ((insErr as { code?: string }).code !== "23505") {
        await supabase
          .from("household_msft_todo_connections")
          .update({ last_sync_error: `Länkfel: ${insErr.message}` })
          .eq("id", connection.id)
        return { added, alreadyTracked, error: insErr.message }
      }
      await supabase
        .from("msft_todo_task_links")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("household_id", connection.household_id)
        .eq("msft_task_id", task.id)
      alreadyTracked++
      continue
    }

    const { data: grocery, error: gErr } = await supabase
      .from("grocery_items")
      .insert({
        household_id: connection.household_id,
        name: capitalizeFirst(title),
        category: "Övrigt",
        added_by: connection.connected_by,
      })
      .select("id, name")
      .single()
    if (gErr || !grocery) {
      // Roll the link back so the next sync retries cleanly.
      if (linkInsert?.id) {
        await supabase.from("msft_todo_task_links").delete().eq("id", linkInsert.id)
      }
      await supabase
        .from("household_msft_todo_connections")
        .update({ last_sync_error: `Kunde inte lägga till "${title}": ${gErr?.message ?? "okänt fel"}` })
        .eq("id", connection.id)
      return { added, alreadyTracked, error: gErr?.message ?? "insert failed" }
    }

    await supabase
      .from("msft_todo_task_links")
      .update({ grocery_item_id: grocery.id })
      .eq("id", linkInsert!.id)

    // Fire-and-forget categorization. Same pattern as useGroceries.
    supabase.functions
      .invoke("categorize-item", { body: { itemName: grocery.name } })
      .then(({ data: catData }) => {
        const category = (catData as { category?: string } | null)?.category
        if (category && category !== "Övrigt") {
          supabase.from("grocery_items").update({ category }).eq("id", grocery.id)
        }
      })
      .catch(() => { /* swallow — categorization is best-effort */ })

    added++
  }

  await supabase
    .from("household_msft_todo_connections")
    .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
    .eq("id", connection.id)

  return { added, alreadyTracked }
}
