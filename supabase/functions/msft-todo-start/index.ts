// POST /functions/v1/msft-todo-start
// Returns the Microsoft OAuth authorize URL that the frontend should
// redirect to. The state param binds the request to (household, user)
// and is HMAC-signed so the callback can verify authenticity without
// needing a transient DB table.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  MSFT_AUTH_BASE,
  MSFT_SCOPES,
  corsHeaders,
  errorResponse,
  jsonResponse,
  serviceClient,
  signOAuthState,
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
  const { data: membership, error: mErr } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle()
  if (mErr) return errorResponse(mErr.message, 500)
  if (!membership) return errorResponse("Inget hushåll", 400)

  const state = await signOAuthState({ householdId: membership.household_id, userId: user.id })

  const params = new URLSearchParams({
    client_id: Deno.env.get("MSFT_CLIENT_ID")!,
    response_type: "code",
    redirect_uri: Deno.env.get("MSFT_REDIRECT_URI")!,
    response_mode: "query",
    scope: MSFT_SCOPES,
    state,
    prompt: "select_account",
  })

  return jsonResponse({
    authorize_url: `${MSFT_AUTH_BASE}/authorize?${params.toString()}`,
  })
})
