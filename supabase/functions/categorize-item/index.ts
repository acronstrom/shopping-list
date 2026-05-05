import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CATEGORIES = [
  "Produce", "Dairy & Eggs", "Meat & Seafood", "Bakery",
  "Frozen", "Pantry", "Snacks", "Beverages",
  "Household", "Personal Care", "Baby", "Pet", "Other",
]

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
    return new Response(JSON.stringify({ category: "Other" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY")
  if (!openaiKey) {
    return new Response(JSON.stringify({ category: "Other" }), {
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
            content: `You categorize grocery items. Reply with ONLY one category from this exact list, nothing else:\n${CATEGORIES.join(", ")}`,
          },
          { role: "user", content: itemName },
        ],
        max_tokens: 20,
        temperature: 0,
      }),
    })

    const data = await response.json()
    const raw = (data.choices?.[0]?.message?.content ?? "Other").trim()
    const category = CATEGORIES.includes(raw) ? raw : "Other"

    return new Response(JSON.stringify({ category }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch {
    return new Response(JSON.stringify({ category: "Other" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
