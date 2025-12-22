import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const METALS_API_KEY = Deno.env.get("METALS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!METALS_API_KEY) {
      console.error("METALS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Configuração do banco de dados inválida" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch metals prices from API
    const apiUrl = `https://api.metals.dev/v1/latest?api_key=${METALS_API_KEY}&currency=USD&unit=mt`;
    console.log("Fetching metals prices from API...");
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Erro na API: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("API response:", JSON.stringify(data));

    // Extract metal prices from the API response
    // The API returns prices in USD per metric ton
    const metals = data.metals || {};
    
    // Metal names in the API: copper, aluminum, zinc, lead, tin, nickel
    const cobreUsdT = metals.copper || null;
    const aluminioUsdT = metals.aluminum || null;
    const zincoUsdT = metals.zinc || null;
    const chumboUsdT = metals.lead || null;
    const estanhoUsdT = metals.tin || null;
    const niquelUsdT = metals.nickel || null;

    // Get USD/BRL exchange rate
    // We need to fetch this separately or use a default
    // For now, let's try to get it from another source or use data.currencies if available
    let dolarBrl = 5.40; // Default fallback
    
    // Try to fetch USD/BRL rate
    try {
      const currencyUrl = `https://api.metals.dev/v1/latest?api_key=${METALS_API_KEY}&currency=BRL&unit=mt`;
      const currencyResponse = await fetch(currencyUrl);
      if (currencyResponse.ok) {
        const currencyData = await currencyResponse.json();
        // Calculate exchange rate by comparing copper prices
        if (currencyData.metals?.copper && cobreUsdT) {
          dolarBrl = currencyData.metals.copper / cobreUsdT;
        }
      }
    } catch (e) {
      console.log("Could not fetch BRL rate, using default:", e);
    }

    // Calculate BRL/kg values
    const cobreBrlKg = cobreUsdT && dolarBrl ? (cobreUsdT * dolarBrl) / 1000 : null;
    const aluminioBrlKg = aluminioUsdT && dolarBrl ? (aluminioUsdT * dolarBrl) / 1000 : null;

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if record for today already exists
    const { data: existing, error: checkError } = await supabase
      .from("historico_lme")
      .select("id")
      .eq("data", today)
      .eq("is_media_semanal", false)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing record:", checkError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar registro existente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recordData = {
      data: today,
      cobre_usd_t: cobreUsdT,
      aluminio_usd_t: aluminioUsdT,
      zinco_usd_t: zincoUsdT,
      chumbo_usd_t: chumboUsdT,
      estanho_usd_t: estanhoUsdT,
      niquel_usd_t: niquelUsdT,
      dolar_brl: dolarBrl,
      cobre_brl_kg: cobreBrlKg,
      aluminio_brl_kg: aluminioBrlKg,
      is_media_semanal: false,
      fonte: "api",
    };

    let result;
    if (existing) {
      // Update existing record
      const { data: updated, error: updateError } = await supabase
        .from("historico_lme")
        .update(recordData)
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating record:", updateError);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar registro" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      result = { action: "updated", record: updated };
    } else {
      // Insert new record
      const { data: inserted, error: insertError } = await supabase
        .from("historico_lme")
        .insert(recordData)
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting record:", insertError);
        return new Response(
          JSON.stringify({ error: "Erro ao inserir registro" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      result = { action: "inserted", record: inserted };
    }

    console.log("Successfully saved LME prices:", result);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cotações LME atualizadas com sucesso (${result.action})`,
        data: result.record,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
