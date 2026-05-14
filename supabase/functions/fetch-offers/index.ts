import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface ScrapedOffer {
  name: string
  brand: string | null
  price: string | null
  unit: string | null
  comparison_price: string | null
  valid_period: string | null
}

const MAX_HTML_CHARS = 60000

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { storeId } = await req.json()
  if (!storeId || typeof storeId !== "string") {
    return new Response(JSON.stringify({ error: "storeId saknas" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // RLS on stores already restricts to household members → if this returns
  // a row, the caller has access.
  const { data: storeRow, error: storeErr } = await userClient
    .from("stores")
    .select("id, offers_url")
    .eq("id", storeId)
    .maybeSingle()

  if (storeErr || !storeRow) {
    return new Response(JSON.stringify({ error: "Butiken hittades inte" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const offersUrl = (storeRow as { offers_url?: string | null }).offers_url
  if (!offersUrl) {
    return new Response(JSON.stringify({ error: "Ingen erbjudande-URL satt för butiken" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY")
  if (!openaiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY saknas" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Step 1: fetch the offers page
  let html: string
  try {
    const pageRes = await fetch(offersUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.5",
      },
    })
    if (!pageRes.ok) {
      return new Response(
        JSON.stringify({ error: `Kunde inte hämta sidan (HTTP ${pageRes.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    html = await pageRes.text()
  } catch (err) {
    console.error("[fetch-offers] fetch error", err)
    return new Response(JSON.stringify({ error: "Kunde inte hämta sidan" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const cleaned = cleanHtml(html).slice(0, MAX_HTML_CHARS)

  if (cleaned.length < 200) {
    return new Response(
      JSON.stringify({ error: "Sidan verkar tom (kan vara JS-renderad)" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // Step 2: extract offers via GPT-4o
  let offers: ScrapedOffer[]
  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Du extraherar matvaru-erbjudanden från innehåll på en svensk butiksida (t.ex. ICA, Coop, Willys).

Returnera ENDAST JSON i formatet:
{ "offers": [
    { "name": "...", "brand": "...", "price": "...", "unit": "...", "comparison_price": "...", "valid_period": "..." }
] }

Fält:
- "name": produktens namn på svenska, t.ex. "Färsk laxsida ASC". Stor begynnelsebokstav. Inkludera inte mängd eller pris i namnet.
- "brand": varumärke om det framgår (t.ex. "ICA", "Arla", "Triumf Glass"). Annars null.
- "price": pris exakt som det står, t.ex. "169 kr/kg", "2 för 35 kr", "39 kr/st".
- "unit": förpackningsstorlek/mängd, t.ex. "300g", "2dl", "500ml", "~1200g". Annars null.
- "comparison_price": jämförpris om angivet, t.ex. "130 kr/kg". Annars null.
- "valid_period": giltighetstid eller köpvillkor (t.ex. "max 1 per hushåll", "endast i butik", "v. 20"). Annars null.

Regler:
- Hoppa över inkluderingsdata (navigation, footer, cookie-banners, sökning).
- Hoppa över non-mat-erbjudanden (kläder, trädgård etc.) ENDAST om det är uppenbart icke-mat. Vid tvivel, inkludera dem.
- Slå inte ihop olika erbjudanden. Returnera tomma listan om inga erbjudanden hittas.`,
          },
          {
            role: "user",
            content: `Här är innehållet från sidan ${offersUrl}:\n\n${cleaned}`,
          },
        ],
        max_tokens: 4000,
        temperature: 0,
      }),
    })

    const data = await aiRes.json()
    const raw = (data.choices?.[0]?.message?.content ?? "").trim()

    let parsed: { offers?: unknown[] } = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error("[fetch-offers] non-JSON response", raw.slice(0, 500))
      return new Response(JSON.stringify({ error: "Kunde inte tolka svaret" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    offers = (parsed.offers ?? [])
      .map((item): ScrapedOffer | null => {
        if (!item || typeof item !== "object") return null
        const row = item as Record<string, unknown>
        const name = typeof row.name === "string" ? row.name.trim() : ""
        if (!name) return null
        return {
          name,
          brand: stringOrNull(row.brand),
          price: stringOrNull(row.price),
          unit: stringOrNull(row.unit),
          comparison_price: stringOrNull(row.comparison_price),
          valid_period: stringOrNull(row.valid_period),
        }
      })
      .filter((v): v is ScrapedOffer => v !== null)
  } catch (err) {
    console.error("[fetch-offers] openai error", err)
    return new Response(JSON.stringify({ error: "Extraheringsfel" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Step 3: persist (replace previous offers for this store).
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const now = new Date().toISOString()

  const { error: delErr } = await serviceClient
    .from("store_offers")
    .delete()
    .eq("store_id", storeId)
  if (delErr) {
    console.error("[fetch-offers] delete error", delErr)
    return new Response(JSON.stringify({ error: "Kunde inte rensa gamla erbjudanden" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (offers.length > 0) {
    const rows = offers.map((o, i) => ({
      store_id: storeId,
      name: o.name,
      brand: o.brand,
      price: o.price,
      unit: o.unit,
      comparison_price: o.comparison_price,
      valid_period: o.valid_period,
      position: i,
      scraped_at: now,
    }))
    const { error: insErr } = await serviceClient.from("store_offers").insert(rows)
    if (insErr) {
      console.error("[fetch-offers] insert error", insErr)
      return new Response(JSON.stringify({ error: "Kunde inte spara erbjudanden" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
  }

  await serviceClient
    .from("stores")
    .update({ offers_scraped_at: now })
    .eq("id", storeId)

  console.log("[fetch-offers]", JSON.stringify({ storeId, count: offers.length }))

  return new Response(
    JSON.stringify({ count: offers.length, scraped_at: now }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  )
})

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanHtml(html: string): string {
  // Strip script/style blocks, then collapse whitespace and unwrap tags into
  // readable text. Crude but enough for an LLM to extract structured data.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}
