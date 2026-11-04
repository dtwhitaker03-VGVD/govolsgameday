# GoVolsGameDay — Weekly Traffic Reports

## 2026-08-24 to 2026-08-30 — weekly traffic report
- Total requests: 3,121 (page views: 1,623)
- Unique visitors: 354
- Cache hit rate: 68.6% (2,140 / 3,121)
- Data transferred: 176.8 MB
- Threats blocked by Cloudflare: 18
- Daily pattern: `daily_breakdown` only contains entries for 2026-08-29 (1,445 requests) and 2026-08-30 (1,676 requests) — those two days sum to the full-week total, so no traffic is recorded for the other five days in this period. This snapshot effectively reflects the site's first two measured days, not a full Mon–Sun week. All 18 threats were blocked on 08-30, the higher-traffic of the two days.
- Top countries: US (1,579, ~51%), DE (297), FI (280), RO (171), NL (145) — Singapore (143), Russia (116), Hong Kong (100), and Thailand (73) also show up in meaningful volume. Collectively the non-US countries beyond the top few (~1,542 requests) are on the same order as the entire US total, with no plausible GoVols fan-base explanation for Finland, Romania, or Hong Kong ranking this high — a mix consistent with scanner/bot traffic rather than organic fans.
- Traffic quality read: total_requests (3,121) is nearly double total_page_views (1,623), a gap consistent with bot or asset-scraping traffic rather than organic browsing, not organic growth. That lines up with the country mix above and with 45 requests returning HTTP 405 (Method Not Allowed) — unusual on a static Vite/React app served from a Cloudflare Worker with no backend routes designed to accept non-GET methods. Threats (18) stayed modest, so this reads as background scanner noise rather than anything resembling an attack — the same kind of pattern already diagnosed on this site once before.
- Status codes: 200: 2,021, 204: 329, 307: 327, 301: 284, 304: 170, 405: 45, 403: 42. Mostly 2xx with a sizeable chunk of 3xx (redirects and cache-validation checks), no 5xx. The 405s and 403s are a small share of the total but don't map to any real backend surface in this app, so they're worth watching rather than dismissing.

*Note: this is the only row currently in `cloudflare_analytics_snapshots`, so no week-over-week comparison is possible yet.*

## 2026-08-31 to 2026-09-06 — no snapshot available
- Checked `cloudflare_analytics_snapshots` on 2026-09-07: the table still has only one row total, `period_end = 2026-08-30`. There is no row for the 2026-08-31–2026-09-06 week that should have landed via Monday's `invoke_cloudflare_analytics_report()` pg_cron run.
- Per the reporting guardrails, no dashboard was built against missing data — this is a placeholder log entry only. No new numbers to report this week.
- Action needed: confirm the pg_cron job / `cloudflare-analytics-report` edge function ran and populated a row for this period; re-run this report once it exists.

## 2026-09-07 to 2026-09-13 — weekly report
- Dashboard: https://claude.ai/code/artifact/bc5869ca-c203-4bb7-a12b-32623fd80ea8
- Requests: 10,715 · Page views: 5,248 · Visitors: 632 · Cache hit: 54.0%
- New signups: 0 · Pre-game predictions: 2 · Live predictor: 2 (27 total picks submitted across those 2 participants, from `drive_predictions`)
- Traffic quality: Requests are up sharply vs. the last recorded week, but the increase is concentrated almost entirely in one day — Sep 8 logged 6,887 requests (64% of the week) from just 119 uniques (~58 req/unique vs. 4–8 on every other day), France was the top source country (6,319 requests, 59% of total, 3x the US), redirect codes made up 42% of requests, cache hit rate fell from 68.6% to 54.0%, and total bytes transferred stayed essentially flat (176.8 MB → 177.2 MB) despite the request spike — consistent with an automated path-scanning sweep, not organic growth. Threats blocked (16) stayed in line with the prior week (18), so nothing here tripped Cloudflare's WAF as malicious.
- Note: the Aug 31–Sep 6 week is still missing from `cloudflare_analytics_snapshots` (the pg_cron gap first flagged 2026-09-07, reconfirmed 2026-09-11 in PR #158) — this row picked back up with the following week (Sep 7–13), so the comparison above is to Aug 24–30, roughly 2.5 weeks prior, not an adjacent week. The missing week has not been backfilled.

## 2026-09-28 to 2026-10-04 — weekly report
- Dashboard: https://claude.ai/artifact/SGcauGkJPEa2Ebmv4571mq
- Requests: 2,228 · Page views: 1,529 · Visitors: 550 · Cache hit: 73.5%
- New signups: 0 · Pre-game predictions: 2 · Live predictor: 0 (0 total picks in `drive_predictions`, despite a live game this week — Tennessee 24, Auburn 14 on Oct 3 — confirmed via `live_games`; this is a genuine null result, not a no-game week)
- Traffic quality: page views were 68.6% of total requests (1,529 of 2,228), the narrowest request/page-view gap of any week on record (52% late Aug, 49% then 54% early Sep, 61% last week), and no single day or status code dominated the week — the cleanest-looking traffic profile yet. That said, the country mix is still atypical for an organic fan base: only 26.9% of requests came from the US, while Germany, Taiwan, Belgium, Singapore, and Russia combined made up 58.0% — consistent with the same baseline scanner/bot traffic already diagnosed on this site, just a smaller share than recent weeks. Threats blocked (38) stayed within the normal range (16–829 across prior weeks), so nothing here looks like an attack.
- Note: requests fell 32% and page views fell 25% vs. last week (Sep 21–27), while unique visitors actually rose 17% (469 → 550) and cache hit rate improved (66.0% → 73.5%) — a pattern consistent with less automated noise this week rather than fewer real visitors, not a traffic decline.
