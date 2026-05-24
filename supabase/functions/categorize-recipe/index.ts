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

  const { recipeName, ingredientNames } = await req.json()
  if (!recipeName || typeof recipeName !== "string") {
    return new Response(JSON.stringify({ category: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const ingredients: string[] = Array.isArray(ingredientNames)
    ? ingredientNames.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : []

  // Find the user's household.
  const { data: memberRows, error: memberErr } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .limit(1)
  if (memberErr || !memberRows?.[0]?.household_id) {
    return new Response(JSON.stringify({ category: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const householdId = memberRows[0].household_id as string

  const { data: categoryRows } = await supabase
    .from("household_recipe_categories")
    .select("name, sort_order")
    .eq("household_id", householdId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  const categories = (categoryRows ?? [])
    .map(r => (r as { name?: string }).name)
    .filter((v): v is string => !!v && typeof v === "string")

  if (categories.length === 0) {
    // Nothing to assign — caller renders "Ingen kategori".
    return new Response(JSON.stringify({ category: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY")
  if (!openaiKey) {
    return new Response(JSON.stringify({ category: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const ingredientList = ingredients.slice(0, 30).join(", ")
  const userContent = ingredientList
    ? `Recept: ${recipeName}\nIngredienser: ${ingredientList}`
    : `Recept: ${recipeName}`

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
            content: `Du kategoriserar recept på svenska. Användaren skickar ett receptnamn och en lista ingredienser. Svara med ENDAST en kategori, exakt som den står i listan nedan, utan extra text, citattecken eller förklaring. Välj alltid den kategori som passar bäst — gissa hellre än att svara fel format.\n\nTillåtna kategorier:\n${categories.join(", ")}`,
          },
          { role: "user", content: userContent },
        ],
        max_tokens: 20,
        temperature: 0,
      }),
    })

    const data = await response.json()
    const raw = (data.choices?.[0]?.message?.content ?? "").trim()
    const category = matchCategory(raw, categories)

    console.log("[categorize-recipe]", JSON.stringify({
      recipeName,
      ingredientCount: ingredients.length,
      categories,
      raw,
      matched: category,
    }))

    return new Response(JSON.stringify({ category }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("[categorize-recipe] error", err)
    return new Response(JSON.stringify({ category: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

function matchCategory(raw: string, categories: string[]): string | null {
  if (!raw) return categories[0] ?? null

  const cleaned = raw
    .replace(/^[\s"'`*_]+|[\s"'`*_.,;:!?]+$/g, "")
    .trim()

  if (categories.includes(cleaned)) return cleaned

  const lower = cleaned.toLocaleLowerCase("sv")
  const ci = categories.find(c => c.toLocaleLowerCase("sv") === lower)
  if (ci) return ci

  const containing = categories.find(c => cleaned.includes(c))
  if (containing) return containing

  return categories[0] ?? null
}
