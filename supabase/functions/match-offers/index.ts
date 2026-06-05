// POST /functions/v1/match-offers
// Body: {} — resolves the caller's household, pools store_offers across all
// its stores, and returns the offers that semantically match the household's
// frequently-bought items (purchase_history). Matching uses OpenAI embeddings
// with a shared name_embeddings cache; a substring floor guarantees obvious
// matches even if embeddings are unavailable.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const EMBED_MODEL = "text-embedding-3-small"
const THRESHOLD = Number(Deno.env.get("OFFER_MATCH_THRESHOLD") ?? "0.55")
// When a user dismisses a pairing, also drop offers whose name is this close
// to the dismissed one (for the same frequent item). Higher than THRESHOLD so
// "similar" means genuinely similar, not just loosely related.
const DISMISS_SIMILARITY = Number(Deno.env.get("OFFER_DISMISS_SIMILARITY") ?? "0.82")
const MAX_MATCHES = 30
const MIN_COUNT = 2
const MAX_FREQUENTS = 40

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(init.headers ?? {}) },
  })
}

interface OfferRow {
  id: string
  store_id: string
  name: string
  brand: string | null
  price: string | null
  unit: string | null
  comparison_price: string | null
  valid_period: string | null
  category: string | null
  valid_to: string | null
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

// Lowercase (sv), drop sizes/units/quantities and punctuation, collapse space.
// Used for both the embedding input and the cache key so identical products
// across stores collapse to one entry.
function normalizeName(input: string): string {
  return input
    .toLocaleLowerCase("sv")
    .replace(/[ ]/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\d+([.,]\d+)?\s*(kg|hg|g|l|dl|cl|ml|st|pack|p|x|%)\b/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function cosine(a: number[], aNorm: number, b: number[], bNorm: number): number {
  if (aNorm === 0 || bNorm === 0) return 0
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot / (aNorm * bNorm)
}

function norm(v: number[]): number {
  let s = 0
  for (const x of v) s += x * x
  return Math.sqrt(s)
}

// Substring overlap on normalized names, both directions, shorter side ≥ 4
// chars. Mirrors the client's matchFrequentBuy floor so we never regress.
function substringMatch(offerNorm: string, freqNorm: string): boolean {
  if (freqNorm.length < 4 || offerNorm.length < 4) return false
  return offerNorm.includes(freqNorm) || freqNorm.includes(offerNorm)
}

// True if `offerNorm` matches one of the dismissed offer names — exactly, or
// (when vectors exist) within DISMISS_SIMILARITY cosine of it.
function isDismissed(
  dismissedNorms: string[],
  offerNorm: string,
  offerVec: { vec: number[]; norm: number } | undefined,
  vectors: Map<string, { vec: number[]; norm: number }>,
): boolean {
  for (const dism of dismissedNorms) {
    if (dism === offerNorm) return true
    const dismVec = vectors.get(dism)
    if (offerVec && dismVec &&
        cosine(offerVec.vec, offerVec.norm, dismVec.vec, dismVec.norm) >= DISMISS_SIMILARITY) {
      return true
    }
  }
  return false
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 })

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return json({ error: "Unauthorized" }, { status: 401 })

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: "Unauthorized" }, { status: 401 })

  const admin = serviceClient()

  try {
    const { data: membership } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle()
    if (!membership) return json({ matches: [] })
    const householdId = membership.household_id as string

    const { data: stores } = await admin
      .from("stores")
      .select("id, name")
      .eq("household_id", householdId)
    const storeNameById = new Map<string, string>()
    for (const s of (stores ?? []) as Array<{ id: string; name: string }>) {
      storeNameById.set(s.id, s.name)
    }
    if (storeNameById.size === 0) return json({ matches: [] })

    const { data: offerData } = await admin
      .from("store_offers")
      .select("id, store_id, name, brand, price, unit, comparison_price, valid_period, valid_to, category")
      .in("store_id", Array.from(storeNameById.keys()))
    const offers = (offerData ?? []) as OfferRow[]
    if (offers.length === 0) return json({ matches: [] })

    // Frequent purchases: count by lowercased name, keep the repeat buys.
    const { data: history } = await admin
      .from("purchase_history")
      .select("item_name")
      .eq("household_id", householdId)
      .order("purchased_at", { ascending: false })
      .limit(1000)
    const counts = new Map<string, number>()
    for (const row of (history ?? []) as Array<{ item_name: string }>) {
      const key = row.item_name.toLowerCase().trim()
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const frequents = Array.from(counts.entries())
      .filter(([, c]) => c >= MIN_COUNT)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_FREQUENTS)
      .map(([name, count]) => ({ name, count, normName: normalizeName(name) }))
      .filter(f => f.normName.length > 0)
    if (frequents.length === 0) return json({ matches: [] })

    const offerNorms = offers.map(o => ({ offer: o, normName: normalizeName(o.name) }))

    // Dismissed pairings: frequent (lowercased) → normalized offer names the
    // household marked as "inte relevant". We suppress these offers — and ones
    // embedding-close to them — for that frequent item only.
    const { data: fb } = await admin
      .from("offer_match_feedback")
      .select("frequent_name, offer_name")
      .eq("household_id", householdId)
    const dismissedByFrequent = new Map<string, string[]>()
    for (const row of (fb ?? []) as Array<{ frequent_name: string; offer_name: string }>) {
      const offerNorm = normalizeName(row.offer_name)
      if (!offerNorm) continue
      const list = dismissedByFrequent.get(row.frequent_name) ?? []
      if (!list.includes(offerNorm)) list.push(offerNorm)
      dismissedByFrequent.set(row.frequent_name, list)
    }

    // Embed every distinct normalized name, reusing the cache for hits. Include
    // dismissed offer names so we have vectors to measure similarity against.
    const distinct = new Set<string>()
    for (const f of frequents) distinct.add(f.normName)
    for (const o of offerNorms) if (o.normName) distinct.add(o.normName)
    for (const names of dismissedByFrequent.values()) for (const n of names) distinct.add(n)
    const allKeys = Array.from(distinct)

    const vectors = new Map<string, { vec: number[]; norm: number }>()
    for (const keys of chunk(allKeys, 200)) {
      const { data } = await admin
        .from("name_embeddings")
        .select("text_key, embedding")
        .in("text_key", keys)
      for (const row of (data ?? []) as Array<{ text_key: string; embedding: number[] }>) {
        const vec = row.embedding
        if (Array.isArray(vec)) vectors.set(row.text_key, { vec, norm: norm(vec) })
      }
    }

    const missing = allKeys.filter(k => !vectors.has(k))
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (missing.length > 0 && openaiKey) {
      for (const batch of chunk(missing, 256)) {
        try {
          const res = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: EMBED_MODEL, input: batch }),
          })
          if (!res.ok) {
            console.error("[match-offers] embeddings failed", res.status, (await res.text()).slice(0, 300))
            break
          }
          const payload = await res.json() as { data: Array<{ embedding: number[]; index: number }> }
          const upserts: Array<{ text_key: string; embedding: number[]; model: string }> = []
          for (const item of payload.data ?? []) {
            const key = batch[item.index]
            if (!key) continue
            vectors.set(key, { vec: item.embedding, norm: norm(item.embedding) })
            upserts.push({ text_key: key, embedding: item.embedding, model: EMBED_MODEL })
          }
          if (upserts.length > 0) {
            await admin.from("name_embeddings").upsert(upserts, { onConflict: "text_key" })
          }
        } catch (err) {
          console.error("[match-offers] embeddings error", err)
          break
        }
      }
    }

    // For each offer, pick the matching frequent that maximizes purchase
    // count among candidates (cosine ≥ threshold OR substring floor).
    interface Match { offer: OfferRow; matchedName: string; count: number; score: number }
    const matches: Match[] = []
    for (const { offer, normName } of offerNorms) {
      if (!normName) continue
      const offerVec = vectors.get(normName)
      let best: Match | null = null
      for (const f of frequents) {
        const score = offerVec && vectors.has(f.normName)
          ? cosine(offerVec.vec, offerVec.norm, vectors.get(f.normName)!.vec, vectors.get(f.normName)!.norm)
          : 0
        const qualifies = score >= THRESHOLD || substringMatch(normName, f.normName)
        if (!qualifies) continue
        // Drop the pairing if the user dismissed this offer for this frequent —
        // exact name, or an embedding-close variant. Other frequents still match.
        const dismissed = dismissedByFrequent.get(f.name)
        if (dismissed && isDismissed(dismissed, normName, offerVec, vectors)) continue
        if (!best || f.count > best.count || (f.count === best.count && score > best.score)) {
          best = { offer, matchedName: f.name, count: f.count, score }
        }
      }
      if (best) matches.push(best)
    }

    matches.sort((a, b) => (b.count - a.count) || (b.score - a.score))

    const result = matches.slice(0, MAX_MATCHES).map(m => ({
      ...m.offer,
      storeName: storeNameById.get(m.offer.store_id) ?? "",
      matchedName: m.matchedName,
      count: m.count,
      score: Number(m.score.toFixed(3)),
    }))

    return json({ matches: result })
  } catch (err) {
    console.error("[match-offers] error", err)
    const message = err instanceof Error ? err.message : String(err)
    return json({ error: message }, { status: 500 })
  }
})
