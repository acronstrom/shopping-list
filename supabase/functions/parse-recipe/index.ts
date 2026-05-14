import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface ParsedIngredient {
  name: string
  quantity: string | null
  category: string
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

  const { imageBase64 } = await req.json()
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return new Response(JSON.stringify({ ingredients: [], error: "Bild saknas" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { data: memberRows, error: memberErr } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .limit(1)
  if (memberErr || !memberRows?.[0]?.household_id) {
    return new Response(JSON.stringify({ ingredients: [], error: "Inget hushåll" }), {
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
    return new Response(JSON.stringify({ ingredients: [], error: "OPENAI_API_KEY saknas" }), {
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
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Du extraherar ingredienser från ett recept som visas på en bild. Receptet kan vara på svenska eller engelska. Översätt alltid ingrediensnamnen till svenska.

Returnera ENDAST JSON i formatet:
{ "ingredients": [ { "name": "...", "quantity": "...", "category": "..." } ] }

Regler:
- "name": ingrediensens namn på svenska i singular grundform, t.ex. "Mjöl", "Ägg", "Gul lök", "Kycklingfilé". Stor begynnelsebokstav. Inkludera inte mängd eller enhet i namnet.
- "quantity": mängd och enhet om det står i receptet, t.ex. "3 dl", "2 st", "500 g", "1 msk". Om ingen mängd anges, använd null.
- "category": EN av kategorierna nedan. Om varan inte tydligt passar, använd "Övrigt".
- Hoppa över rubriker, instruktioner, salt/peppar "efter smak" och vatten.
- Slå inte ihop olika ingredienser. Lista varje ingrediens på egen rad.
- Om bilden inte innehåller något recept, returnera { "ingredients": [] }.

Tillåtna kategorier:
${categories.join(", ")}`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrahera ingredienserna från detta recept." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0,
      }),
    })

    const data = await response.json()
    const raw = (data.choices?.[0]?.message?.content ?? "").trim()

    let parsed: { ingredients?: unknown[] } = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error("[parse-recipe] non-JSON response", raw)
      return new Response(JSON.stringify({ ingredients: [], error: "Kunde inte tolka receptet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const ingredients: ParsedIngredient[] = (parsed.ingredients ?? [])
      .map((item): ParsedIngredient | null => {
        if (!item || typeof item !== "object") return null
        const row = item as { name?: unknown; quantity?: unknown; category?: unknown }
        const name = typeof row.name === "string" ? row.name.trim() : ""
        if (!name) return null
        const quantityRaw = typeof row.quantity === "string" ? row.quantity.trim() : ""
        const categoryRaw = typeof row.category === "string" ? row.category : ""
        return {
          name,
          quantity: quantityRaw || null,
          category: matchCategory(categoryRaw, categories),
        }
      })
      .filter((v): v is ParsedIngredient => v !== null)

    console.log("[parse-recipe]", JSON.stringify({ count: ingredients.length }))

    return new Response(JSON.stringify({ ingredients }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("[parse-recipe] error", err)
    return new Response(JSON.stringify({ ingredients: [], error: "Något gick fel" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

function matchCategory(raw: string, categories: string[]): string {
  if (!raw) return "Övrigt"

  const cleaned = raw
    .replace(/^[\s"'`*_]+|[\s"'`*_.,;:!?]+$/g, "")
    .trim()

  if (categories.includes(cleaned)) return cleaned

  const lower = cleaned.toLocaleLowerCase("sv")
  const ci = categories.find(c => c.toLocaleLowerCase("sv") === lower)
  if (ci) return ci

  const containing = categories.find(c => cleaned.includes(c))
  if (containing) return containing

  return "Övrigt"
}
