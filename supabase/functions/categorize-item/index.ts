import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { itemName } = await req.json()
  if (!itemName) {
    return new Response(JSON.stringify({ category: "Övrigt" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Determine the user's household and available categories
  const { data: memberRows, error: memberErr } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .limit(1)
  if (memberErr || !memberRows?.[0]?.household_id) {
    return new Response(JSON.stringify({ category: "Övrigt" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const householdId = memberRows[0].household_id as string

  const { data: categoryRows } = await supabase
    .from("household_categories")
    .select("name, sort_order")
    .eq("household_id", householdId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  const categories = (categoryRows ?? [])
    .map(r => (r as { name?: string }).name)
    .filter((v): v is string => !!v && typeof v === "string")

  if (!categories.includes("Övrigt")) categories.push("Övrigt")

  const openaiKey = Deno.env.get("OPENAI_API_KEY")
  if (!openaiKey) {
    return new Response(JSON.stringify({ category: "Övrigt" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Du kategoriserar matvaror på svenska. Användaren skickar ett varunamn på svenska (t.ex. "mjölk", "tomater", "leverpastej"). Svara med ENDAST en kategori, exakt som den står i listan nedan, utan extra text, citattecken eller förklaring. Om varan inte tydligt passar i någon kategori, svara "Övrigt".\n\nTillåtna kategorier:\n${categories.join(", ")}`,
          },
          { role: "user", content: itemName },
        ],
        max_tokens: 20,
        temperature: 0,
      }),
    })

    const data = await response.json()
    const raw = (data.choices?.[0]?.message?.content ?? "").trim()
    const category = matchCategory(raw, categories)

    console.log("[categorize-item]", JSON.stringify({
      itemName,
      categories,
      raw,
      matched: category,
    }))

    return new Response(JSON.stringify({ category }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("[categorize-item] error", err)
    return new Response(JSON.stringify({ category: "Övrigt" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

function matchCategory(raw: string, categories: string[]): string {
  if (!raw) return "Övrigt"

  // Strip surrounding quotes, leading/trailing punctuation, and whitespace.
  const cleaned = raw
    .replace(/^[\s"'`*_]+|[\s"'`*_.,;:!?]+$/g, "")
    .trim()

  // Exact match.
  if (categories.includes(cleaned)) return cleaned

  // Case-insensitive match.
  const lower = cleaned.toLocaleLowerCase("sv")
  const ci = categories.find(c => c.toLocaleLowerCase("sv") === lower)
  if (ci) return ci

  // Substring match: the model wrapped the category in a sentence.
  const containing = categories.find(c => cleaned.includes(c))
  if (containing) return containing

  return "Övrigt"
}
