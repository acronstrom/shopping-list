// POST /functions/v1/msft-todo
// Body: { action: 'lists' | 'set-list' | 'sync' | 'disconnect', ... }
// Authenticated by the user's JWT. Resolves to the user's household.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  corsHeaders,
  ensureFreshAccessToken,
  errorResponse,
  fetchLists,
  jsonResponse,
  serviceClient,
  syncOneConnection,
  type MsftTodoConnectionRow,
} from "../_shared/msft-todo.ts"

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return errorResponse("Method not allowed", 405)

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return errorResponse("Unauthorized", 401)

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return errorResponse("Unauthorized", 401)

  const admin = serviceClient()
  const { data: membership } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle()
  if (!membership) return errorResponse("Inget hushåll", 400)
  const householdId = membership.household_id as string

  let body: { action?: string; listId?: string; listName?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse("Saknar body", 400)
  }
  const action = body.action
  if (!action) return errorResponse("Saknar action", 400)

  const { data: connectionRaw, error: cErr } = await admin
    .from("household_msft_todo_connections")
    .select("*")
    .eq("household_id", householdId)
    .maybeSingle()
  if (cErr) return errorResponse(cErr.message, 500)
  if (!connectionRaw) return errorResponse("Ingen Microsoft-anslutning", 400)
  const connection = connectionRaw as MsftTodoConnectionRow

  try {
    if (action === "lists") {
      const fresh = await ensureFreshAccessToken(admin, connection)
      const lists = await fetchLists(fresh.access_token)
      return jsonResponse({ lists })
    }

    if (action === "set-list") {
      if (!body.listId || !body.listName) return errorResponse("Saknar listId/listName", 400)
      const { error } = await admin
        .from("household_msft_todo_connections")
        .update({ list_id: body.listId, list_name: body.listName, last_sync_error: null })
        .eq("id", connection.id)
      if (error) return errorResponse(error.message, 500)
      return jsonResponse({ ok: true })
    }

    if (action === "sync") {
      const result = await syncOneConnection(admin, connection)
      if (result.error) return jsonResponse(result, { status: 502 })
      return jsonResponse(result)
    }

    if (action === "disconnect") {
      const { error } = await admin
        .from("household_msft_todo_connections")
        .delete()
        .eq("id", connection.id)
      if (error) return errorResponse(error.message, 500)
      return jsonResponse({ ok: true })
    }

    return errorResponse(`Okänt action: ${action}`, 400)
  } catch (err) {
    console.error("[msft-todo] action threw", err)
    const message = err instanceof Error ? err.message : String(err)
    return errorResponse(message, 500)
  }
})
