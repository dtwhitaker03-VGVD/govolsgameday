# GoVolsGameDay Weekly Traffic Analytics Reports

## 2026-08-24 to 2026-08-30 — weekly traffic report
- Total requests: 3,121 (page views: 1,623)
- Unique visitors: 354
- Cache hit rate: 68.6% (2,140 / 3,121)
- Data transferred: 176.8 MB
- Threats blocked by Cloudflare: 18
- Daily pattern: incomplete — `daily_breakdown` only contains entries for 2026-08-29 and 2026-08-30, and those two days' requests/bytes/cached/threats sum exactly to the period totals, so the recorded totals appear to cover only Fri-Sat of the Mon-Sun period, not the full week. Of those two days, 08-29 carried the bulk of the data volume (~129.5 MB of 176.8 MB) with zero threats, while 08-30 had less than half the bytes but all 18 threats and slightly more requests (1,676 vs 1,445).
- Top countries: US 1,579 (~51%), Germany 297, Finland 280, Romania 171, Netherlands 145, then Singapore 143, Russia 116, Hong Kong 100, Thailand 73. The tail past the US is scanner-like — there's no plausible organic Vols fan base in Finland, Romania, Singapore, Russia, Hong Kong, or Thailand at these volumes.
- Traffic quality read: total_requests (3,121) is nearly double total_page_views (1,623), and the US country count (1,579) sits close to the page-view total (1,623) while the ~1,500 non-US requests contribute comparatively little to page views — consistent with the non-US volume being asset/probe requests rather than real page loads. A 405/403 share of 87 requests (2.8% of total) adds to that read. This table has no browser-family dimension, so it can't be confirmed as bot traffic outright, but the pattern (page-view gap + unlikely-fanbase country mix + probe-style error codes) matches the scanner-sweep signature already diagnosed on this site, rather than organic growth.
- Status codes: mostly 200s (2,021, ~65%), a notable 3xx share (307: 327, 301: 284, 304: 170 — 781 combined, ~25%), and a small 4xx share (403: 42, 405: 45 — 87, ~2.8%). No 5xx recorded. The 4xx count isn't dramatically elevated on its own, but combined with the 3xx share and the country mix above it fits the same scanner pattern rather than user-facing errors.

Note: this is the only row currently in `cloudflare_analytics_snapshots`, so there is no prior week available for a week-over-week comparison.
