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
  ], "Make your picks before kickoff");
}

// ─── Final recap ─────────────────────────────────────────────────────────────

export interface FinalData {
  sport: "football" | "basketball";
  tn: number;
  opp: number;
  opponent: string;
  home: boolean;
  top: { name: string; points: number }[]; // up to 3
}

export function finalRecap(d: FinalData): Node {
  const won = d.tn > d.opp;
  return frame([
    pill(`${sportTag(d.sport)} · FINAL`, won ? ORANGE : RED),
    h("div", { alignItems: "center", marginTop: 26, ...anton(280, { lineHeight: 1 }) }, [
      h("span", { color: won ? ORANGE : "#fff" }, String(d.tn)),
      h("div", { width: 64, height: 14, background: MUTED, margin: "0 38px", borderRadius: 4 }),
      h("span", { color: won ? "#fff" : ORANGE }, String(d.opp)),
    ]),
    h("div", { ...anton(54, { color: "#fff", marginTop: 8 }) }, `TENNESSEE ${d.home ? "VS" : "AT"} ${shorten(d.opponent, 22)}`),
    d.top.length > 0
      ? h("div", { marginTop: 34, flexDirection: "column", width: 780, background: PANEL, borderRadius: 20, padding: "22px 34px", border: "2px solid rgba(255,255,255,0.1)" }, [
          h("div", { fontSize: 24, fontWeight: 800, letterSpacing: 3, color: ORANGE, marginBottom: 10 }, "TOP PREDICTORS"),
          ...d.top.map((r, i) =>
            h("div", { justifyContent: "space-between", fontSize: 34, fontWeight: 700, padding: "5px 0" }, [
              h("span", {}, `${i + 1}. ${shorten(r.name, 20)}`),
              h("span", { color: ORANGE }, `${r.points.toLocaleString("en-US")} pts`),
            ])
          ),
        ])
      : h("div", {}),
  ], "Think you can beat them? Play free");
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
