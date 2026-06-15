// POST /functions/v1/msft-todo-cron-sync
// Called by the pg_cron job every 15 min. Authenticated by a shared
// secret in the x-cron-secret header. Iterates over every household
// with a configured list and runs the sync, swallowing per-household
// errors so one bad token doesn't kill the entire batch.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  serviceClient,
  syncOneConnection,
  type MsftTodoConnectionRow,
} from "../_shared/msft-todo.ts"

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return errorResponse("Method not allowed", 405)

  const expected = Deno.env.get("MSFT_CRON_SECRET")
  if (!expected) return errorResponse("Cron secret not configured", 500)
  if (req.headers.get("x-cron-secret") !== expected) {
    return errorResponse("Unauthorized", 401)
  }

  const admin = serviceClient()
  const { data: connections, error } = await admin
    .from("household_msft_todo_connections")
    .select("*")
    .not("list_id", "is", null)
  if (error) return errorResponse(error.message, 500)

  const results: Array<{ household_id: string; added: number; alreadyTracked: number; removed: number; error?: string }> = []
  for (const raw of (connections ?? []) as MsftTodoConnectionRow[]) {
    try {
      const r = await syncOneConnection(admin, raw)
      results.push({ household_id: raw.household_id, ...r })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({ household_id: raw.household_id, added: 0, alreadyTracked: 0, removed: 0, error: message })
    }
  }

  return jsonResponse({ ran: results.length, results })
})
