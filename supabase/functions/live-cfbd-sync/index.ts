import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// RETIRED. The CFBD subscription was cancelled, so nothing calls the College Football
// Data API any more; live football is driven by live-espn-sync alone. This stub stays
// deployed only so a stray caller gets a clear answer instead of a missing-function error.
Deno.serve(() =>
  new Response(JSON.stringify({ ok: false, retired: true, message: "live-cfbd-sync is retired; live-espn-sync handles live football." }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  })
);
