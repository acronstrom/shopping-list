// GET /functions/v1/msft-todo-callback?code=…&state=…
// Microsoft redirects the user here after consent. We exchange the code
// for tokens, fetch the user's email, upsert the connection row, then
// redirect the user back to the app's Settings page with a status query
// param. This function runs WITHOUT a Supabase JWT (verify_jwt = false
// in supabase/config.toml).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import {
  corsHeaders,
  exchangeAuthCode,
  fetchMe,
  serviceClient,
  verifyOAuthState,
} from "../_shared/msft-todo.ts"

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const errorParam = url.searchParams.get("error")
  const errorDescription = url.searchParams.get("error_description")
  const appUrl = Deno.env.get("APP_URL") ?? ""

  if (errorParam) {
    return redirectBack(appUrl, "error", errorDescription ?? errorParam)
  }
  if (!code || !state) {
    return redirectBack(appUrl, "error", "Saknade code eller state")
  }

  const verified = await verifyOAuthState(state)
  if (!verified) {
    return redirectBack(appUrl, "error", "Ogiltig state (kan ha gått ut)")
  }

  let tokens
  try {
    tokens = await exchangeAuthCode(code)
  } catch (err) {
    console.error("[msft-todo-callback] token exchange failed", err)
    return redirectBack(appUrl, "error", "Kunde inte byta kod mot token")
  }

  if (!tokens.refresh_token) {
    return redirectBack(appUrl, "error", "Microsoft gav inget refresh token")
  }

  let email: string
  try {
    const me = await fetchMe(tokens.access_token)
    email = me.mail ?? me.userPrincipalName ?? "okänd"
  } catch (err) {
    console.error("[msft-todo-callback] /me failed", err)
    return redirectBack(appUrl, "error", "Kunde inte hämta kontoinformation")
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const admin = serviceClient()
  const { error } = await admin
    .from("household_msft_todo_connections")
    .upsert(
      {
        household_id: verified.householdId,
        connected_by: verified.userId,
        connected_email: email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        last_sync_error: null,
      },
      { onConflict: "household_id" },
    )
  if (error) {
    console.error("[msft-todo-callback] upsert failed", error)
    return redirectBack(appUrl, "error", "Kunde inte spara anslutningen")
  }

  return redirectBack(appUrl, "ok")
})

function redirectBack(appUrl: string, status: "ok" | "error", reason?: string) {
  const target = new URL(appUrl || "https://example.com")
  target.pathname = "/settings"
  target.searchParams.set("msft", status)
  if (reason) target.searchParams.set("reason", reason)

  // Tiny HTML so non-redirect-aware clients still bounce; main path uses 302.
  const escaped = target.toString().replace(/"/g, "&quot;")
  const html = `<!doctype html><meta http-equiv="refresh" content="0;url=${escaped}"><body>Omdirigerar…</body>`
  return new Response(html, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}
