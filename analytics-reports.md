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
