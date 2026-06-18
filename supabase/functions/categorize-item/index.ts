import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { categorizeName, categorizeNames, loadCategoryOverrides, loadHouseholdCategories, loadSubcategories } from "../_shared/categorize.ts"

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

  const body = await req.json()
  const itemName: unknown = body?.itemName
  const itemNamesRaw: unknown = body?.itemNames
  const batch = Array.isArray(itemNamesRaw)
  const itemNames = batch
    ? itemNamesRaw.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : []

  if (!batch && !itemName) {
    return new Response(JSON.stringify({ category: "Övrigt", subcategory: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  if (batch && itemNames.length === 0) {
    return new Response(JSON.stringify({ categories: {} }), {
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
    return new Response(
      JSON.stringify(batch ? { categories: {} } : { category: "Övrigt", subcategory: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const householdId = memberRows[0].household_id as string
  const [categories, subs, overrides] = await Promise.all([
    loadHouseholdCategories(supabase, householdId),
    loadSubcategories(supabase, householdId),
    loadCategoryOverrides(supabase, householdId),
  ])
  const openaiKey = Deno.env.get("OPENAI_API_KEY")

  if (batch) {
    const categoriesByName = await categorizeNames(itemNames, categories, subs, openaiKey, overrides)
    return new Response(JSON.stringify({ categories: categoriesByName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const result = await categorizeName(itemName as string, categories, subs, openaiKey, overrides)
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
