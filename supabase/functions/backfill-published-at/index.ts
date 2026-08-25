import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const YOUTUBE_API_KEY  = Deno.env.get("YOUTUBE_API_KEY")!;
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Fetch all rows missing published_at that have a youtube_video_id
  const { data: videos, error: fetchError } = await supabase
    .from("scraped_videos")
    .select("id, youtube_video_id")
    .is("published_at", null)
    .not("youtube_video_id", "is", null);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!videos || videos.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, updated: 0, message: "No videos need backfill" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let updated = 0;
  const errors: string[] = [];

  // YouTube allows up to 50 IDs per request
  for (let i = 0; i < videos.length; i += 50) {
    const batch = videos.slice(i, i + 50) as Array<{ id: string; youtube_video_id: string }>;
    const ids = batch.map((v) => v.youtube_video_id).join(",");

    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids}&key=${YOUTUBE_API_KEY}`
      );
      if (!res.ok) throw new Error(`YouTube API error: ${await res.text()}`);

      const data = await res.json() as {
        items?: Array<{ id: string; snippet: { publishedAt: string } }>;
      };

      for (const item of (data.items ?? [])) {
        const row = batch.find((v) => v.youtube_video_id === item.id);
        if (!row) continue;

        const { error: updateError } = await supabase
          .from("scraped_videos")
          .update({ published_at: item.snippet.publishedAt })
          .eq("id", row.id);

        if (updateError) errors.push(`Update failed for ${item.id}: ${updateError.message}`);
        else updated++;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  return new Response(
    JSON.stringify({ ok: true, total: videos.length, updated, errors }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
