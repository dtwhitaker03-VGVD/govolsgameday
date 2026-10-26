import { ImageResponse } from "https://deno.land/x/og_edge@0.0.6/mod.ts";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { type Node, H, W } from "./templates.ts";

// Renders a template tree to a JPEG (Instagram only accepts JPEG). satori draws
// the tree to PNG; imagescript re-encodes it. Fonts are fetched once per
// instance from jsDelivr (fontsource) and cached.

const FONT_URLS: { name: string; weight: 400 | 700 | 800; url: string }[] = [
  { name: "Anton", weight: 400, url: "https://cdn.jsdelivr.net/npm/@fontsource/anton/files/anton-latin-400-normal.woff" },
  { name: "Inter", weight: 400, url: "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-400-normal.woff" },
  { name: "Inter", weight: 700, url: "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-700-normal.woff" },
  { name: "Inter", weight: 800, url: "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-800-normal.woff" },
];

let fontCache: { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" }[] | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  fontCache = await Promise.all(
    FONT_URLS.map(async (f) => {
      const res = await fetch(f.url);
      if (!res.ok) throw new Error(`font ${f.name} ${f.weight}: HTTP ${res.status}`);
      return { name: f.name, data: await res.arrayBuffer(), weight: f.weight, style: "normal" as const };
    })
  );
  return fontCache;
}

export async function renderJpeg(tree: Node): Promise<Uint8Array> {
  const fonts = await loadFonts();
  // deno-lint-ignore no-explicit-any
  const res = new ImageResponse(tree as any, { width: W, height: H, fonts });
  const png = new Uint8Array(await res.arrayBuffer());
  const img = await Image.decode(png);
  return await img.encodeJPEG(90);
}
