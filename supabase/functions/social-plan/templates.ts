// Social post images as satori element trees (1080x1080). Pure functions of real
// data: no I/O, so they can be previewed locally and run unchanged in the edge
// function. Brand: #0F172A background, #162038 panels, #FF8200 orange, #D11919
// red, Anton display type over Inter, diagonal end-zone stripes, soft glow.

export const W = 1080;
export const H = 1080;

// deno-lint-ignore no-explicit-any
type Style = Record<string, any>;
// deno-lint-ignore no-explicit-any
export type Node = { type: string; props: { style?: Style; children?: any } };

const ORANGE = "#FF8200";
const NAVY = "#0F172A";
const PANEL = "#162038";
const RED = "#D11919";
const MUTED = "#9AA3B2";

// deno-lint-ignore no-explicit-any
function h(type: string, style: Style, children?: any): Node {
  return { type, props: { style: { display: "flex", ...style }, children } };
}

const anton = (size: number, extra: Style = {}): Style => ({ fontFamily: "Anton", fontSize: size, textTransform: "uppercase", letterSpacing: 1, ...extra });

function logoBar(): Node {
  return h("div", { alignItems: "center", justifyContent: "space-between", width: "100%" }, [
    h("div", { alignItems: "center" }, [
      h("div", { width: 64, height: 64, borderRadius: 14, background: ORANGE, alignItems: "center", justifyContent: "center", ...anton(30, { color: "#fff" }) }, "GVGD"),
      h("div", { marginLeft: 16, fontSize: 34, fontWeight: 800, color: "#fff" }, [
        h("span", {}, "GoVols"),
        h("span", { color: ORANGE }, "GameDay"),
      ]),
    ]),
  ]);
}

function footer(cta: string): Node {
  return h("div", { width: "100%", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid rgba(255,255,255,0.12)", paddingTop: 28 }, [
    h("div", { fontSize: 30, fontWeight: 700, color: "#fff" }, cta),
    h("div", { ...anton(34, { color: ORANGE }) }, "govolsgameday.com"),
  ]);
}

// Diagonal end-zone stripes: satori has no repeating gradients, so rotate a row of bars.
function stripes(): Node {
  const bars = Array.from({ length: 22 }, () => h("div", { width: 26, height: 1700, marginRight: 52, background: "rgba(255,130,0,0.07)", flexShrink: 0 }));
  return h("div", { position: "absolute", left: -310, top: -310, width: 1700, height: 1700, transform: "rotate(45deg)" }, bars);
}

function frame(body: Node[], cta: string): Node {
  return h("div", {
    width: W, height: H, position: "relative", flexDirection: "column", justifyContent: "space-between",
    padding: "64px 72px 56px", background: NAVY, fontFamily: "Inter", color: "#fff", overflow: "hidden",
  }, [
    // end-zone stripes + glow, behind everything
    stripes(),
    h("div", { position: "absolute", left: 140, top: 250, width: 800, height: 600, backgroundImage: "radial-gradient(circle, rgba(255,130,0,0.30) 0%, rgba(255,130,0,0) 65%)" }),
    logoBar(),
    h("div", { flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1, width: "100%" }, body),
    footer(cta),
  ]);
}

const sportTag = (sport: string) => (sport === "basketball" ? "MEN'S BASKETBALL" : "FOOTBALL");

function pill(text: string, bg = ORANGE, color = "#fff"): Node {
  return h("div", { background: bg, color, padding: "10px 26px", borderRadius: 999, fontSize: 28, fontWeight: 800, letterSpacing: 2 }, text);
}

// ─── Countdown ───────────────────────────────────────────────────────────────

export interface CountdownData {
  sport: "football" | "basketball";
  days: number; // 0 = gameday
  opponent: string;
  home: boolean;
  kickoffText: string; // e.g. "SAT, NOV 7 · 7:00 PM ET"
}

export function countdown(d: CountdownData): Node {
  const big = d.days === 0 ? "GAMEDAY" : String(d.days);
  const sub = d.days === 0 ? "IT'S TIME" : d.days === 1 ? "DAY TO KICKOFF" : "DAYS TO KICKOFF";
  const subText = d.sport === "basketball" ? sub.replace("KICKOFF", "TIP-OFF") : sub;
  return frame([
    pill(sportTag(d.sport)),
    h("div", { ...anton(d.days === 0 ? 220 : 380, { color: "#fff", lineHeight: 1, marginTop: 14, textShadow: "8px 8px 0 #D11919" }) }, big),
    h("div", { ...anton(64, { color: ORANGE, marginTop: 6 }) }, subText),
    h("div", { marginTop: 40, flexDirection: "column", alignItems: "center", background: PANEL, padding: "26px 44px", borderRadius: 20, border: "2px solid rgba(255,255,255,0.1)" }, [
      h("div", { ...anton(60, { color: "#fff" }) }, `${d.home ? "" : "AT "}${shorten(d.opponent, 22)}${d.home ? " AT TENNESSEE" : ""}`.replace(/^AT TENNESSEE$/, "")),
      h("div", { fontSize: 30, fontWeight: 700, color: MUTED, marginTop: 8 }, d.kickoffText),
    ]),
  ], d.sport === "basketball" ? "Make your picks before tip-off" : "Make your picks before kickoff");
}

// ─── Final game stats chart ──────────────────────────────────────────────────

export interface StatRow {
  label: string;
  tn: string; // display text, e.g. "344" or "43%"
  opp: string;
  tnVal: number; // numeric values size the bar
  oppVal: number;
}

export interface FinalStatsData {
  sport: "football" | "basketball";
  tn: number;
  opp: number;
  opponent: string;
  home: boolean;
  rows: StatRow[]; // up to 5
}

export function finalStats(d: FinalStatsData): Node {
  const won = d.tn > d.opp;
  const rows = d.rows.slice(0, 5);
  return frame([
    pill(`${sportTag(d.sport)} · FINAL`, won ? ORANGE : RED),
    h("div", { alignItems: "center", marginTop: 14, ...anton(150, { lineHeight: 1 }) }, [
      h("span", { color: won ? ORANGE : "#fff" }, String(d.tn)),
      h("div", { width: 44, height: 10, background: MUTED, margin: "0 28px", borderRadius: 4 }),
      h("span", { color: won ? "#fff" : ORANGE }, String(d.opp)),
    ]),
    h("div", { ...anton(40, { color: "#fff", marginTop: 4 }) }, `TENNESSEE ${d.home ? "VS" : "AT"} ${shorten(d.opponent, 24)}`),
    rows.length > 0
      ? h("div", { marginTop: 26, flexDirection: "column", width: 900 }, [
          h("div", { justifyContent: "space-between", fontSize: 24, fontWeight: 800, letterSpacing: 3, marginBottom: 6 }, [
            h("span", { color: ORANGE }, "TENNESSEE"),
            h("span", { color: "#fff" }, shorten(d.opponent, 18).toUpperCase()),
          ]),
          ...rows.map((r) => {
            const total = r.tnVal + r.oppVal;
            const tnShare = total > 0 ? Math.max(4, Math.min(96, Math.round((r.tnVal / total) * 100))) : 50;
            return h("div", { flexDirection: "column", marginTop: 10 }, [
              h("div", { justifyContent: "space-between", alignItems: "flex-end", fontWeight: 800 }, [
                h("span", { fontSize: 36, color: ORANGE }, r.tn),
                h("span", { fontSize: 24, color: MUTED, letterSpacing: 2 }, r.label.toUpperCase()),
                h("span", { fontSize: 36, color: "#fff" }, r.opp),
              ]),
              h("div", { height: 16, borderRadius: 8, overflow: "hidden", marginTop: 4, background: "#fff" }, [
                h("div", { width: `${tnShare}%`, height: 16, background: ORANGE }),
              ]),
            ]);
          }),
        ])
      : h("div", {}),
  ], "Final game stats");
}

// ─── Site promotion ──────────────────────────────────────────────────────────

export interface PromoData {
  tag: string; // pill text
  headline: string;
  sub?: string; // optional line under the headline (e.g. today's matchup)
  features: { title: string; text: string }[]; // 3
}

export function promo(d: PromoData): Node {
  return frame([
    pill(d.tag),
    h("div", { ...anton(d.headline.length > 28 ? 84 : 104, { color: "#fff", textAlign: "center", lineHeight: 1.05, marginTop: 28, maxWidth: 940, textShadow: "6px 6px 0 #D11919" }) }, d.headline),
    d.sub ? h("div", { fontSize: 32, fontWeight: 700, color: ORANGE, marginTop: 16, textAlign: "center" }, d.sub) : h("div", {}),
    h("div", { flexDirection: "column", marginTop: 30, width: 900 }, d.features.slice(0, 3).map((f, i) =>
      h("div", { alignItems: "center", background: PANEL, borderRadius: 18, padding: "16px 26px", marginTop: 12, border: "2px solid rgba(255,255,255,0.1)" }, [
        h("div", { width: 56, height: 56, borderRadius: 14, background: ORANGE, color: "#fff", alignItems: "center", justifyContent: "center", ...anton(34), marginRight: 22, flexShrink: 0 }, String(i + 1)),
        h("div", { flexDirection: "column" }, [
          h("div", { fontSize: 32, fontWeight: 800, color: "#fff" }, f.title),
          h("div", { fontSize: 25, fontWeight: 400, color: MUTED, marginTop: 2 }, f.text),
        ]),
      ])
    )),
  ], "Join in at");
}

// ─── Player of the game ──────────────────────────────────────────────────────

export interface PotgData {
  name: string;
  position?: string | null;
  jersey?: string | null;
  stats: { label: string; value: string }[]; // up to 4
  opponent: string;
  home: boolean;
  resultLine: string; // e.g. "L 24-27"
}

export function playerOfGame(d: PotgData): Node {
  const sub = [d.jersey ? `#${d.jersey}` : "", d.position ?? ""].filter(Boolean).join(" · ");
  const nameSize = d.name.length > 22 ? 84 : d.name.length > 16 ? 104 : 128;
  const stats = d.stats.slice(0, 4);
  return frame([
    pill("PLAYER OF THE GAME"),
    h("div", { ...anton(nameSize, { color: "#fff", textAlign: "center", lineHeight: 1.02, marginTop: 30, maxWidth: 960, textShadow: "7px 7px 0 #D11919" }) }, d.name),
    sub ? h("div", { ...anton(46, { color: ORANGE, marginTop: 12 }) }, sub) : h("div", {}),
    stats.length > 0
      ? h("div", { marginTop: 36, width: 920, flexWrap: "wrap", justifyContent: "center" }, stats.map((st) =>
          h("div", { width: stats.length === 1 ? 420 : 440, flexDirection: "column", alignItems: "center", background: PANEL, borderRadius: 18, padding: "18px 12px", margin: 8, border: "2px solid rgba(255,255,255,0.1)" }, [
            h("div", { ...anton(76, { color: ORANGE, lineHeight: 1 }) }, shorten(st.value, 10)),
            h("div", { fontSize: 24, fontWeight: 800, letterSpacing: 2, color: MUTED, marginTop: 6 }, shorten(st.label, 22).toUpperCase()),
          ])
        ))
      : h("div", {}),
    h("div", { fontSize: 30, fontWeight: 700, color: "#fff", marginTop: 24 }, `${d.home ? "vs" : "at"} ${shorten(d.opponent, 24)} · ${d.resultLine}`),
  ], "Stats and predictions at");
}

// ─── Next game preview ───────────────────────────────────────────────────────

export interface PreviewData {
  sport: "football" | "basketball";
  opponent: string;
  home: boolean;
  whenText: string; // "SAT, NOV 7 · 3:30 PM ET" or "... · TIME TBA"
  context?: string | null; // one real line, e.g. "No. 11 Tennessee (6-1) at South Carolina (3-3)"
  watch?: string | null; // "ESPN"
}

export function preview(d: PreviewData): Node {
  const oppSize = d.opponent.length > 18 ? 96 : d.opponent.length > 12 ? 124 : 160;
  return frame([
    pill(`NEXT UP · ${sportTag(d.sport)}`),
    h("div", { ...anton(40, { color: MUTED, marginTop: 30 }) }, d.home ? "TENNESSEE HOSTS" : "TENNESSEE VISITS"),
    h("div", { ...anton(oppSize, { color: "#fff", textAlign: "center", lineHeight: 1.02, marginTop: 8, maxWidth: 960, textShadow: "7px 7px 0 #D11919" }) }, d.opponent),
    h("div", { marginTop: 34, flexDirection: "column", alignItems: "center", background: PANEL, padding: "24px 44px", borderRadius: 20, border: "2px solid rgba(255,255,255,0.1)" }, [
      h("div", { ...anton(52, { color: "#fff" }) }, d.whenText),
      d.watch ? h("div", { fontSize: 30, fontWeight: 700, color: ORANGE, marginTop: 8 }, `Watch on ${d.watch}`) : h("div", {}),
    ]),
    d.context ? h("div", { fontSize: 28, fontWeight: 700, color: MUTED, marginTop: 24, textAlign: "center", maxWidth: 900 }, shorten(d.context, 110)) : h("div", {}),
  ], "Make your picks at");
}

// ─── Trivia / poll teaser (the question only, never the answer) ──────────────

export interface TeaserData {
  kind: "trivia" | "poll";
  question: string;
  options: string[];
}

export function teaser(d: TeaserData): Node {
  const q = d.question;
  const size = q.length > 150 ? 42 : q.length > 100 ? 48 : q.length > 60 ? 56 : 66;
  return frame([
    pill(d.kind === "trivia" ? "DAILY TRIVIA" : "TODAY'S POLL"),
    h("div", { ...anton(size, { color: "#fff", textAlign: "center", lineHeight: 1.18, marginTop: 30, maxWidth: 900, textTransform: "none" }) }, q),
    h("div", { flexDirection: "column", marginTop: 30, width: 860 }, d.options.slice(0, 4).map((o, i) =>
      h("div", { alignItems: "center", background: PANEL, borderRadius: 16, padding: "14px 24px", marginTop: 12, fontSize: 31, fontWeight: 700, border: "2px solid rgba(255,255,255,0.1)" }, [
        h("div", { width: 46, height: 46, borderRadius: 12, background: ORANGE, color: "#fff", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 28, marginRight: 20 }, "ABCD"[i]),
        h("span", {}, shorten(o, 46)),
      ])
    )),
  ], d.kind === "trivia" ? "Answer on the site and earn points" : "Cast your vote on the site");
}

// ─── News headline ───────────────────────────────────────────────────────────

export interface NewsData {
  title: string;
  source: string;
}

export function news(d: NewsData): Node {
  const size = d.title.length > 110 ? 56 : d.title.length > 70 ? 68 : 80;
  return frame([
    pill("VOL NEWS"),
    h("div", { ...anton(size, { color: "#fff", textAlign: "center", lineHeight: 1.12, marginTop: 36, maxWidth: 920, textTransform: "none" }) }, d.title),
    h("div", { fontSize: 30, fontWeight: 700, color: ORANGE, marginTop: 30 }, `via ${d.source}`),
  ], "More Vols news at");
}

function shorten(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}
