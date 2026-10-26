import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// SOCIAL PUBLISH: posts due rows of social_posts to the Facebook Page and the
// Instagram account via Meta's Graph API, using the Page access token in the
// META_PAGE_TOKEN secret (never stored in the database or sent anywhere else).
// Runs every 5 minutes (pg_cron).
//
// Safety rails:
//  - social_settings.enabled is the kill switch; test_mode renders and queues but never calls Meta.
//  - A row is claimed (scheduled -> posting) before any network call, so two overlapping runs can't double-post.
//  - fb_post_id / ig_media_id are saved as soon as each platform succeeds, so a retry never re-posts one that went out.
//  - Rows more than 6 hours overdue are canceled instead of posted (a countdown that is hours late is wrong).
//  - An expired or revoked token (Meta error 190) turns the kill switch off rather than retrying.

const GRAPH = "https://graph.facebook.com/v26.0";
const MAX_ATTEMPTS = 3;
const STALE_MS = 6 * 3600000;

// deno-lint-ignore no-explicit-any
type Client = any;
interface Settings { enabled: boolean; test_mode: boolean; post_facebook: boolean; post_instagram: boolean; page_id: string; ig_user_id: string }
interface Post {
  id: string; caption: string; image_url: string | null; scheduled_for: string; attempts: number;
  fb_post_id: string | null; ig_media_id: string | null;
}

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json" } });

class MetaError extends Error {
  constructor(message: string, public code?: number) { super(message); }
}

async function graph(path: string, body: Record<string, string>, token: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...body, access_token: token }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new MetaError(j.error?.message ?? `HTTP ${res.status}`, j.error?.code);
  return j;
}

async function postToFacebook(s: Settings, p: Post, token: string): Promise<string> {
  const j = await graph(`${s.page_id}/photos`, { url: p.image_url!, caption: p.caption, published: "true" }, token);
  return String(j.post_id ?? j.id);
}

async function postToInstagram(s: Settings, p: Post, token: string): Promise<string> {
  const created = await graph(`${s.ig_user_id}/media`, { image_url: p.image_url!, caption: p.caption }, token);
  const creationId = String(created.id);
  // Images are usually ready at once; wait briefly for FINISHED before publishing.
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${GRAPH}/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    const j = await res.json().catch(() => ({}));
    if (j.status_code === "FINISHED") break;
    if (j.status_code === "ERROR" || j.status_code === "EXPIRED") throw new MetaError(`Instagram media ${j.status_code}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  const pub = await graph(`${s.ig_user_id}/media_publish`, { creation_id: creationId }, token);
  return String(pub.id);
}

Deno.serve(async () => {
  const supabase: Client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: s } = await supabase.from("social_settings").select("*").eq("id", true).maybeSingle();
  const settings = s as Settings | null;
  if (!settings?.enabled) return json({ ok: true, skipped: "disabled" });

  const nowIso = new Date().toISOString();
  const { data: due } = await supabase
    .from("social_posts")
    .select("id, caption, image_url, scheduled_for, attempts, fb_post_id, ig_media_id")
    .eq("status", "scheduled")
    .lte("scheduled_for", nowIso)
    .not("image_url", "is", null)
    .order("scheduled_for", { ascending: true })
    .limit(2);

  const results: Record<string, unknown>[] = [];
  const token = Deno.env.get("META_PAGE_TOKEN");

  for (const p of (due ?? []) as Post[]) {
    if (Date.now() - new Date(p.scheduled_for).getTime() > STALE_MS) {
      await supabase.from("social_posts").update({ status: "canceled", error: "stale: more than 6 hours overdue" }).eq("id", p.id).eq("status", "scheduled");
      results.push({ id: p.id, canceled: "stale" });
      continue;
    }
    // Claim it. If another run got there first, this updates zero rows.
    const { data: claimed } = await supabase
      .from("social_posts")
      .update({ status: "posting", attempts: p.attempts + 1 })
      .eq("id", p.id)
      .eq("status", "scheduled")
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    if (settings.test_mode) {
      await supabase.from("social_posts").update({ status: "test_ok", posted_at: new Date().toISOString(), error: null }).eq("id", p.id);
      results.push({ id: p.id, test_mode: true });
      continue;
    }
    if (!token) {
      await supabase.from("social_posts").update({ status: "scheduled", error: "META_PAGE_TOKEN secret is not set" }).eq("id", p.id);
      results.push({ id: p.id, error: "no token" });
      continue;
    }

    const errors: string[] = [];
    let fb = p.fb_post_id;
    let ig = p.ig_media_id;
    let authFailure = false;
    const attempt = async (name: string, run: () => Promise<string>) => {
      try {
        return await run();
      } catch (e) {
        if (e instanceof MetaError && e.code === 190) authFailure = true;
        errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      }
    };
    if (settings.post_facebook && !fb) {
      fb = (await attempt("facebook", () => postToFacebook(settings, p, token))) ?? fb;
      if (fb) await supabase.from("social_posts").update({ fb_post_id: fb }).eq("id", p.id);
    }
    if (settings.post_instagram && !ig && !authFailure) {
      ig = (await attempt("instagram", () => postToInstagram(settings, p, token))) ?? ig;
      if (ig) await supabase.from("social_posts").update({ ig_media_id: ig }).eq("id", p.id);
    }

    const wantFb = settings.post_facebook, wantIg = settings.post_instagram;
    const allDone = (!wantFb || fb) && (!wantIg || ig);
    if (allDone) {
      await supabase.from("social_posts").update({ status: "posted", posted_at: new Date().toISOString(), error: null }).eq("id", p.id);
      results.push({ id: p.id, posted: true, fb, ig });
    } else if (authFailure) {
      // Token expired or revoked: stop everything until someone fixes it.
      await supabase.from("social_posts").update({ status: "failed", error: errors.join(" | ") }).eq("id", p.id);
      await supabase.from("social_settings").update({ enabled: false, updated_at: new Date().toISOString() }).eq("id", true);
      results.push({ id: p.id, failed: "auth", disabled: true });
    } else if (p.attempts + 1 >= MAX_ATTEMPTS) {
      await supabase.from("social_posts").update({ status: "failed", error: errors.join(" | ") }).eq("id", p.id);
      results.push({ id: p.id, failed: errors });
    } else {
      await supabase.from("social_posts").update({
        status: "scheduled", error: errors.join(" | "),
        scheduled_for: new Date(Date.now() + 10 * 60000).toISOString(),
      }).eq("id", p.id);
      results.push({ id: p.id, retry: errors });
    }
  }
  return json({ ok: true, processed: results.length, results });
});
