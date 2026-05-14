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
  category: string | null
  valid_to: string | null
}

const FALLBACK_MAX_CHARS = 240000

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

  // Step 2: extraction. Three paths, tried in order:
  // 1. ICA hydration JSON  → 235+ offers, no LLM.
  // 2. iPaper flyer viewer → vision over per-page images (Willys, City Gross, …).
  // 3. Generic HTML        → cleaned text to GPT-4o (other chains).
  let offers: ScrapedOffer[] = extractFromIcaJson(html)
  let mode = offers.length > 0 ? "ica-json" : ""

  if (offers.length === 0) {
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "Inga erbjudanden hittades och OPENAI_API_KEY saknas" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const ipaper = parseIpaperPaper(html, offersUrl)
    if (ipaper) {
      offers = await extractFromIpaperPages(ipaper, openaiKey)
      mode = `ipaper-vision(${ipaper.pageCount}p)`
    } else {
      const cleaned = stripHtml(html).slice(0, FALLBACK_MAX_CHARS)
      if (cleaned.length < 200) {
        return new Response(
          JSON.stringify({ error: "Sidan verkar tom (kan vara JS-renderad)" }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      offers = await extractFromWholePage(cleaned, offersUrl, openaiKey)
      mode = "llm-fallback"
    }
  }

  console.log("[fetch-offers] extracted", JSON.stringify({
    mode,
    htmlLength: html.length,
    count: offers.length,
  }))

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
      category: o.category,
      valid_to: o.valid_to,
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

  return new Response(
    JSON.stringify({ count: offers.length, scraped_at: now, mode }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  )
})

// ============================================================
// ICA hydration-JSON extractor
// ============================================================
// ICA renders its offer catalogue as JSON inside the HTML (hydration
// payload). Each offer parent object has this shape:
//   {
//     "id": "...",
//     "details": { brand, customerInformation, disclaimer,
//                  packageInformation, name, mechanicInfo, isSelfScan },
//     "category": { articleGroupName, articleGroupId, ... },
//     "usesLeft": ...,
//     "validTo": "2026-05-17T00:00:00",
//     "comparisonPrice": "..."
//   }
// `details` and `category` are flat objects with no nested braces, so a
// regex with [^{}]+ inside captures them without a real JSON parser.

function extractFromIcaJson(html: string): ScrapedOffer[] {
  const re = /"details":\{([^{}]+)\},"category":\{([^{}]+)\},"usesLeft":[^,]*,"validTo":"([^"]*)","comparisonPrice":"([^"]*)"/g
  const seen = new Set<string>()
  const offers: ScrapedOffer[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const detailsBody = m[1]
    const categoryBody = m[2]
    const validToRaw = decodeJsonString(m[3])
    const comparisonPriceRaw = decodeJsonString(m[4])

    const name = jsonStringField(detailsBody, "name")
    if (!name) continue

    const brand = jsonStringField(detailsBody, "brand")
    const dedupeKey = `${name}|${brand ?? ""}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const mechanicInfo = jsonStringField(detailsBody, "mechanicInfo")
    const packageInformation = jsonStringField(detailsBody, "packageInformation")
    const customerInformation = jsonStringField(detailsBody, "customerInformation")
    const articleGroupName = jsonStringField(categoryBody, "articleGroupName")

    offers.push({
      name,
      brand,
      price: mechanicInfo,
      unit: packageInformation,
      comparison_price: comparisonPriceRaw || null,
      valid_period: customerInformation,
      category: articleGroupName,
      valid_to: parseValidTo(validToRaw),
    })
  }
  return offers
}

function jsonStringField(objectBody: string, key: string): string | null {
  // Match "<key>":"<value>" where value can contain escaped quotes.
  const re = new RegExp(`"${escapeRegExp(key)}":"((?:[^"\\\\]|\\\\.)*)"`)
  const m = objectBody.match(re)
  if (!m) return null
  const value = decodeJsonString(m[1]).trim()
  return value.length > 0 ? value : null
}

function decodeJsonString(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`)
  } catch {
    return raw
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function parseValidTo(raw: string): string | null {
  if (!raw) return null
  // Looks like "2026-05-17T00:00:00" or empty
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

// ============================================================
// iPaper flyer viewer (Willys, City Gross, etc.)
// ============================================================
// iPaper viewer pages embed a PaperGuid and a PageCount in their
// hydration. The per-page image is available via the OpenGraph endpoint
// `b-cdn.ipaper.io/OpenGraphImage.ashx?v=<base64({guid,pageNumber,…})>`
// which returns a 1200×630 JPEG sharp enough for GPT-4o vision OCR.

interface IpaperPaper {
  guid: string
  pageCount: number
  url: string         // relative pdf path, e.g. /willys/pdfs/0001-0008wil-v20-ed1pdf/
  sourceUrl: string   // the original viewer URL the user saved
}

function parseIpaperPaper(html: string, sourceUrl: string): IpaperPaper | null {
  if (!/ipaper\.io/i.test(sourceUrl) && !/ipaper\.io/i.test(html)) return null
  const guidMatch = html.match(/"PaperGuid":"([a-f0-9-]+)"/i) ??
                    html.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)
  const pageCountMatch = html.match(/"PageCount":\s*(\d+)/i)
  const urlMatch = html.match(/"Url":"([^"]*pdfs[^"]*)"/i)

  if (!guidMatch) return null
  return {
    guid: guidMatch[1] ?? guidMatch[0],
    pageCount: Math.min(parseInt(pageCountMatch?.[1] ?? "1", 10) || 1, 20),
    url: urlMatch?.[1] ?? "",
    sourceUrl,
  }
}

function ipaperPageImageUrl(paper: IpaperPaper, pageNumber: number): string {
  const payload = {
    PaperGuid: paper.guid,
    PageCount: paper.pageCount,
    StartOnSpread: false,
    Url: paper.url || `/papers/${paper.guid}/`,
    PartnerName: "iPaper",
    PageNumber: pageNumber,
  }
  const b64 = btoa(JSON.stringify(payload))
  return `https://b-cdn.ipaper.io/OpenGraphImage.ashx?v=${b64}`
}

async function extractFromIpaperPages(
  paper: IpaperPaper,
  openaiKey: string
): Promise<ScrapedOffer[]> {
  const results = await Promise.all(
    Array.from({ length: paper.pageCount }, (_, i) =>
      extractFromIpaperPage(paper, i + 1, openaiKey)
    )
  )
  const all: ScrapedOffer[] = []
  const seen = new Set<string>()
  for (const pageOffers of results) {
    for (const o of pageOffers) {
      const key = `${o.name.toLowerCase()}|${(o.brand ?? "").toLowerCase()}|${o.price ?? ""}`
      if (seen.has(key)) continue
      seen.add(key)
      all.push(o)
    }
  }
  return all
}

async function extractFromIpaperPage(
  paper: IpaperPaper,
  pageNumber: number,
  openaiKey: string
): Promise<ScrapedOffer[]> {
  const imageUrl = ipaperPageImageUrl(paper, pageNumber)

  const systemPrompt = `Du extraherar erbjudanden från en bild på en sida ur en svensk butiks veckoblad (t.ex. Willys, City Gross).

Returnera ENDAST JSON i formatet:
{ "offers": [
    { "name": "...", "brand": "...", "price": "...", "unit": "...", "comparison_price": "...", "valid_period": "...", "category": "..." }
] }

Fält (alla optionella utom name):
- "name": produktens namn på svenska (t.ex. "Blandfärs", "Glass Big Pack", "Chokladkaka"). Stor begynnelsebokstav. Inkludera inte pris eller mängd i namnet.
- "brand": varumärke om det syns (t.ex. "GB Glace", "Marabou", "Eldorado", "Dafgårds"). Annars null.
- "price": priset exakt som det visas, t.ex. "19:90/förp", "44:90 kr/kg", "2 för 130:00", "29:90/förp". Annars null.
- "unit": mängd/förpackning, t.ex. "Ca 1kg", "2l", "160g", "4x125g", "500g". Annars null.
- "comparison_price": jämförpris (Jmfpris) som det står, t.ex. "79:90 kr/kg", "9:95 kr/l". Annars null.
- "valid_period": köpvillkor, restriktioner eller giltighet (t.ex. "Max 3 förp/hushåll", "Gäller mån-ons", "Tillfälligt parti", "WillysPlus"). Annars null.
- "category": en grov kategori på svenska om du kan gissa: "Frukt & Grönt", "Kött & Chark", "Mejeri & Ägg", "Bröd, kex & bageri", "Djupfryst", "Skafferi", "Dryck", "Snacks & Godis", "Hälsa & skönhet", "Hem & fritid", "Djur", "Barn". Annars null.

Regler:
- Var uttömmande. Plocka alla distinkta erbjudanden på sidan.
- Ignorera reklamtext, sidnumrering, prisvillkor i bottnen, butikslogan.
- Slå inte ihop olika produkter.
- Returnera tom lista endast om sidan saknar erbjudanden.`

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
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: `Sida ${pageNumber} av ${paper.pageCount}. Extrahera alla erbjudanden.` },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0,
    }),
  })

  const data = await aiRes.json()
  const raw = (data.choices?.[0]?.message?.content ?? "").trim()

  let parsed: { offers?: unknown[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.error(`[fetch-offers] ipaper page ${pageNumber} non-JSON`, raw.slice(0, 300))
    return []
  }

  return (parsed.offers ?? [])
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
        category: stringOrNull(row.category),
        valid_to: null,
      }
    })
    .filter((v): v is ScrapedOffer => v !== null)
}

// ============================================================
// LLM fallback for non-ICA pages
// ============================================================

async function extractFromWholePage(
  cleaned: string,
  url: string,
  openaiKey: string
): Promise<ScrapedOffer[]> {
  const systemPrompt = `Du extraherar matvaru-erbjudanden från innehåll på en svensk butiksida.

Returnera ENDAST JSON i formatet:
{ "offers": [
    { "name": "...", "brand": "...", "price": "...", "unit": "...", "comparison_price": "...", "valid_period": "..." }
] }

Regler:
- Var uttömmande. Returnera ALLA distinkta erbjudanden du ser.
- Hoppa bara över navigation, footer och cookie-banners.
- Slå inte ihop olika erbjudanden.
- Returnera tom lista endast om inga erbjudanden hittas alls.`

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
        { role: "system", content: systemPrompt },
        { role: "user", content: `Innehåll från ${url}:\n\n${cleaned}` },
      ],
      max_tokens: 8000,
      temperature: 0,
    }),
  })

  const data = await aiRes.json()
  const raw = (data.choices?.[0]?.message?.content ?? "").trim()

  let parsed: { offers?: unknown[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.error("[fetch-offers] non-JSON fallback response", raw.slice(0, 500))
    return []
  }

  return (parsed.offers ?? [])
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
        category: null,
        valid_to: null,
      }
    })
    .filter((v): v is ScrapedOffer => v !== null)
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--([\s\S]*?)-->/g, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim()
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}
