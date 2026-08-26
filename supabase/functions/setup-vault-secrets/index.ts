import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// One-time setup function: reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// from the Edge Function environment (where they're already configured) and
// writes both values into Supabase Vault so pg_cron's invoke_ functions can
// authenticate their HTTP calls to the other Edge Functions.
//
// Invoke once from the Supabase dashboard → Edge Functions → setup-vault-secrets → Run.
// After that, pg_cron jobs will start actually calling youtube-ingest / news-ingest.

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const SUPABASE_URL       = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in Edge Function environment" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data, error } = await supabase.rpc("setup_vgd_vault_secrets", {
    p_project_url:      SUPABASE_URL,
    p_service_role_key: SERVICE_ROLE_KEY,
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, result: data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
