// Shared Microsoft To Do helpers.
// Used by msft-todo (sync action), msft-todo-cron-sync, and msft-todo-callback.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export const MSFT_AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0"
export const MSFT_GRAPH = "https://graph.microsoft.com/v1.0"
export const MSFT_SCOPES = "Tasks.ReadWrite User.Read offline_access"

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
  can_write: boolean
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
  completedDateTime?: { dateTime: string; timeZone: string } | null
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

// A read that treats 404 as a value rather than an error, so the reverse
// sync can tell a deleted task (404) from a transient failure (5xx, which
// still throws). Used to classify links that dropped out of the open set.
export async function fetchTaskById(
  accessToken: string,
  listId: string,
  taskId: string,
): Promise<{ status: number; task: MsftTask | null }> {
  const url = `${MSFT_GRAPH}/me/todo/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  })
  if (res.status === 404) {
    await res.body?.cancel()
    return { status: 404, task: null }
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`fetchTaskById failed: ${res.status} ${body.slice(0, 500)}`)
  }
  return { status: res.status, task: await res.json() as MsftTask }
}

// Marks a To Do task completed or re-opens it. Surfaces a 403 to the caller
// via the thrown message so the push path can flip can_write off.
export async function patchTaskStatus(
  accessToken: string,
  listId: string,
  taskId: string,
  status: "completed" | "notStarted",
): Promise<void> {
  const url = `${MSFT_GRAPH}/me/todo/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`patchTaskStatus failed: ${res.status} ${body.slice(0, 500)}`)
  }
  await res.body?.cancel()
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

// Fetches every completed task in the list, following @odata.nextLink to
// page through the full history. Page size is capped server-side; the page
// limit is a safety backstop against a runaway loop.
const MAX_HISTORY_PAGES = 50

export async function fetchCompletedTasks(accessToken: string, listId: string): Promise<MsftTask[]> {
  // Fetch the list unfiltered (the bare /tasks URI is the one the To Do
  // endpoint definitely accepts) and keep the completed ones in code. A
  // $filter on status can return RequestBroker--ParseUri on this endpoint,
  // so we avoid it entirely. completedDateTime is returned by default; the
  // full list pages via @odata.nextLink.
  let url: string | null = `${MSFT_GRAPH}/me/todo/lists/${encodeURIComponent(listId)}/tasks`

  const tasks: MsftTask[] = []
  let pages = 0
  while (url && pages < MAX_HISTORY_PAGES) {
    const res = await graphFetch(url, accessToken, "/me/todo/lists/{id}/tasks (history)")
    const json = await res.json() as { value?: MsftTask[]; "@odata.nextLink"?: string }
    if (json.value) tasks.push(...json.value)
    url = json["@odata.nextLink"] ?? null
    pages++
  }
  return tasks.filter(t => t.status === "completed")
}

// To Do returns completedDateTime as { dateTime, timeZone }. timeZone is
// normally "UTC" and dateTime carries no offset, so append "Z" in that case.
// Falls back to now() if missing or unparseable.
function completedToIso(task: MsftTask): string {
  const c = task.completedDateTime
  if (!c?.dateTime) return new Date().toISOString()
  const raw = c.timeZone === "UTC" ? `${c.dateTime}Z` : c.dateTime
  const ms = Date.parse(raw)
  return Number.isNaN(ms) ? new Date().toISOString() : new Date(ms).toISOString()
}

// ============================================================
// Sync algorithm
// ============================================================

export interface SyncResult {
  added: number
  alreadyTracked: number
  removed: number
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
    return { added: 0, alreadyTracked: 0, removed: 0, error: "Ingen lista vald" }
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
    return { added: 0, alreadyTracked: 0, removed: 0, error: message }
  }

  // Captured once, before the open-tasks fetch. Every still-open task gets
  // its last_seen_at stamped to exactly this value below, so the reverse
  // pass can find tasks that dropped out of the open set via last_seen_at
  // < runStart without a per-iteration timestamp skew.
  const runStart = new Date().toISOString()

  let tasks: MsftTask[]
  try {
    tasks = await fetchOpenTasks(connection.access_token, connection.list_id!)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase
      .from("household_msft_todo_connections")
      .update({ last_sync_error: `Kunde inte hämta uppgifter (${message})` })
      .eq("id", connection.id)
    return { added: 0, alreadyTracked: 0, removed: 0, error: message }
  }

  let added = 0
  let alreadyTracked = 0
  let removed = 0

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
        last_seen_at: runStart,
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
        return { added, alreadyTracked, removed, error: insErr.message }
      }
      await reconcileOpenLink(supabase, connection, task.id, runStart)
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
      return { added, alreadyTracked, removed, error: gErr?.message ?? "insert failed" }
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

  // Reverse pass: links whose task dropped out of the open set since this
  // run started. app_completed_at IS NULL excludes completions the app
  // pushed (so un-ticking still works); history_imported_at IS NULL excludes
  // ones already recorded as bought.
  const { data: candidates } = await supabase
    .from("msft_todo_task_links")
    .select("id, msft_task_id, grocery_item_id")
    .eq("household_id", connection.household_id)
    .not("grocery_item_id", "is", null)
    .is("app_completed_at", null)
    .is("history_imported_at", null)
    .lt("last_seen_at", runStart)

  for (const link of (candidates ?? []) as Array<{ id: string; msft_task_id: string; grocery_item_id: string }>) {
    try {
      const { status, task } = await fetchTaskById(connection.access_token, connection.list_id!, link.msft_task_id)
      if (status === 404) {
        // Deleted in To Do → drop from the list, but don't record a purchase.
        await supabase.from("grocery_items").delete().eq("id", link.grocery_item_id)
        removed++
        continue
      }
      if (task && task.status === "completed") {
        // Completed in To Do → record as bought, then drop from the list.
        const { data: g } = await supabase
          .from("grocery_items")
          .select("name, category")
          .eq("id", link.grocery_item_id)
          .maybeSingle()
        if (g) {
          await supabase.from("purchase_history").insert({
            household_id: connection.household_id,
            item_name: g.name.toLowerCase().trim(),
            category: g.category,
            purchased_by: connection.connected_by,
            purchased_at: completedToIso(task),
          })
        }
        await supabase.from("grocery_items").delete().eq("id", link.grocery_item_id)
        await supabase
          .from("msft_todo_task_links")
          .update({ history_imported_at: new Date().toISOString() })
          .eq("id", link.id)
        removed++
      }
      // else: still open / other status → leave for next run.
    } catch {
      // Transient (5xx / network) — skip this candidate, retry next run.
    }
  }

  await supabase
    .from("household_msft_todo_connections")
    .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
    .eq("id", connection.id)

  return { added, alreadyTracked, removed }
}

// An already-tracked task is still open in To Do. Bump last_seen_at, and
// either (a) re-arm app_completed_at if the task is open again (so a future
// completion reaches the reverse pass), or (b) self-heal a tick whose
// tick-time push never landed (item is checked in the app but the task is
// still open and was never app-completed).
async function reconcileOpenLink(
  supabase: ReturnType<typeof serviceClient>,
  connection: MsftTodoConnectionRow,
  taskId: string,
  runStart: string,
): Promise<void> {
  const { data: link } = await supabase
    .from("msft_todo_task_links")
    .select("grocery_item_id, app_completed_at")
    .eq("household_id", connection.household_id)
    .eq("msft_task_id", taskId)
    .maybeSingle()

  const patch: { last_seen_at: string; app_completed_at?: string | null } = { last_seen_at: runStart }

  if (link?.app_completed_at) {
    // Task is open again → clear the marker.
    patch.app_completed_at = null
  } else if (connection.can_write && link?.grocery_item_id) {
    const { data: g } = await supabase
      .from("grocery_items")
      .select("is_checked")
      .eq("id", link.grocery_item_id)
      .maybeSingle()
    if (g?.is_checked) {
      try {
        await patchTaskStatus(connection.access_token, connection.list_id!, taskId, "completed")
        patch.app_completed_at = runStart
      } catch {
        // Best-effort self-heal; retry on the next run.
      }
    }
  }

  await supabase
    .from("msft_todo_task_links")
    .update(patch)
    .eq("household_id", connection.household_id)
    .eq("msft_task_id", taskId)
}

// ============================================================
// History import — completed tasks → purchase_history
// ============================================================

export interface HistoryImportResult {
  imported: number
  alreadyImported: number
  error?: string
}

const HISTORY_CHUNK = 400
const LINK_PAGE = 1000

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// Pulls every completed task from the selected list and records one
// purchase_history row per completion. Idempotent: tasks already marked
// with history_imported_at in msft_todo_task_links are skipped.
export async function importHistoryForConnection(
  supabase: ReturnType<typeof serviceClient>,
  rawConnection: MsftTodoConnectionRow,
): Promise<HistoryImportResult> {
  if (!rawConnection.list_id) {
    return { imported: 0, alreadyImported: 0, error: "Ingen lista vald" }
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
    return { imported: 0, alreadyImported: 0, error: message }
  }

  let tasks: MsftTask[]
  try {
    tasks = await fetchCompletedTasks(connection.access_token, connection.list_id!)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase
      .from("household_msft_todo_connections")
      .update({ last_sync_error: `Kunde inte hämta historik (${message})` })
      .eq("id", connection.id)
    return { imported: 0, alreadyImported: 0, error: message }
  }

  // Dedupe by task id, drop empties.
  const byId = new Map<string, MsftTask>()
  for (const task of tasks) {
    if (task.id && task.title?.trim()) byId.set(task.id, task)
  }
  const unique = Array.from(byId.values())
  if (unique.length === 0) {
    await supabase
      .from("household_msft_todo_connections")
      .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
      .eq("id", connection.id)
    return { imported: 0, alreadyImported: 0 }
  }

  // Which of these tasks have we already turned into history? Read this
  // household's already-imported links directly and page through them —
  // To Do task ids are long, so filtering by .in(ids) would build a URL
  // big enough for PostgREST to reject as a Bad Request.
  const alreadyImportedIds = new Set<string>()
  for (let from = 0; ; from += LINK_PAGE) {
    const { data, error } = await supabase
      .from("msft_todo_task_links")
      .select("msft_task_id")
      .eq("household_id", connection.household_id)
      .not("history_imported_at", "is", null)
      .range(from, from + LINK_PAGE - 1)
    if (error) {
      await supabase
        .from("household_msft_todo_connections")
        .update({ last_sync_error: `Länkfel: ${error.message}` })
        .eq("id", connection.id)
      return { imported: 0, alreadyImported: 0, error: error.message }
    }
    const rows = (data ?? []) as Array<{ msft_task_id: string }>
    for (const row of rows) alreadyImportedIds.add(row.msft_task_id)
    if (rows.length < LINK_PAGE) break
  }

  const toImport = unique.filter(t => !alreadyImportedIds.has(t.id))
  const alreadyImported = unique.length - toImport.length
  if (toImport.length === 0) {
    await supabase
      .from("household_msft_todo_connections")
      .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
      .eq("id", connection.id)
    return { imported: 0, alreadyImported }
  }

  const now = new Date().toISOString()
  let imported = 0

  for (const batch of chunk(toImport, HISTORY_CHUNK)) {
    const historyRows = batch.map(task => ({
      household_id: connection.household_id,
      item_name: task.title.toLowerCase().trim(),
      category: null,
      purchased_by: connection.connected_by,
      purchased_at: completedToIso(task),
    }))
    const { error: histErr } = await supabase.from("purchase_history").insert(historyRows)
    if (histErr) {
      await supabase
        .from("household_msft_todo_connections")
        .update({ last_sync_error: `Kunde inte spara historik: ${histErr.message}` })
        .eq("id", connection.id)
      return { imported, alreadyImported, error: histErr.message }
    }

    const linkRows = batch.map(task => ({
      household_id: connection.household_id,
      msft_task_id: task.id,
      history_imported_at: now,
    }))
    const { error: linkErr } = await supabase
      .from("msft_todo_task_links")
      .upsert(linkRows, { onConflict: "household_id,msft_task_id" })
    if (linkErr) {
      await supabase
        .from("household_msft_todo_connections")
        .update({ last_sync_error: `Länkfel: ${linkErr.message}` })
        .eq("id", connection.id)
      return { imported, alreadyImported, error: linkErr.message }
    }

    imported += batch.length
  }

  await supabase
    .from("household_msft_todo_connections")
    .update({ last_synced_at: now, last_sync_error: null })
    .eq("id", connection.id)

  return { imported, alreadyImported }
}
