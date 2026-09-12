# Trivia & Poll QA Review Log

## 2026-09-01 — run summary
- Checked: trivia 2026-09-01 to 2026-09-04, polls 2026-09-01 to 2026-09-04
- Issues found: 15
- Note: No web/search tool was available in this session (outbound network via Bash was denied by the permission classifier; no search MCP tool was present in my toolset). Several factual claims below are flagged as **unverified** rather than corrected with confidence, per guardrails.

### trivia_questions.4979dbc9-5de3-443c-b53d-6849c3840319 — 2026-09-01 / slot 1 — distractors aren't answers to the question asked
**Current:** Q: "...Which team eliminated them?" Options: A "The program was disbanded", B "A losing record", C "Notre Dame" (correct), D "A conference-worst finish"
**Suggested fix:** Replace A/B/D with plausible real college baseball program names (e.g. "LSU", "Vanderbilt", "Texas") so all 4 options are answers of the same type as the correct answer. Keep C "Notre Dame" as correct.
**Reason:** Three of four options aren't team names at all — they don't answer "which team eliminated them." A test-taker can eliminate them on format alone without any Tennessee baseball knowledge, per §32 "distractors aren't self-eliminating."
**Status:** ⏳ pending review

### trivia_questions.03e40caa-6c84-4f23-ba7c-aaa79ac89f5c — 2026-09-01 / slot 2 — self-eliminating distractor + vague framing
**Current:** "Tennessee's basketball rivalry with Kentucky dates back to roughly which era?" A "Only since 2020", B "The early-to-mid 20th century" (correct), C "They have never played", D "Only since the 2000s"
**Suggested fix:** Replace C ("They have never played" — obviously false to any fan, self-eliminating) with a plausible real era, e.g. "The 1970s". Consider also tightening the question to a specific decade rather than "roughly which era" to avoid a soft/hedgy correct answer.
**Reason:** §32 — self-eliminating distractor; borderline hedge framing on the correct answer.
**Status:** ⏳ pending review

### trivia_questions.568c57d2-065b-4aad-b19a-ab9d1ae6e0d5 — 2026-09-01 / slot 4 — absurd distractors + unverified facts
**Current:** "Tennessee's women's swimming and diving program, founded in 1971, won SEC team titles in which two recent seasons?" A "It has never won an SEC title", B "1985 and 1990", C "2020 and 2022" (correct), D "Every year since founding"
**Suggested fix:** Replace A/D (self-eliminating) with plausible-but-wrong season pairs. Separately: **flag for verification** — I cannot confirm the 1971 founding date or that Tennessee women's swimming/diving won SEC team titles specifically in 2020 and 2022 without a search tool. Recommend verifying both claims against a reliable source before this airs; if wrong, this is a hard factual accuracy failure, not just a distractor issue.
**Reason:** §32 self-eliminating distractors + factual accuracy cannot be confirmed this run.
**Status:** ⏳ pending review — flagged as uncertain (unverified)

### trivia_questions.4db80b43-e249-4419-84f6-4e76b93e3491 — 2026-09-02 / slot 1 — absurd distractors + unverified count
**Current:** "...how many total NCAA Tournament appearances...?" A "Over 100", B "Zero", C "Around 27" (correct), D "Fewer than 5"
**Suggested fix:** Replace A/B/D (wildly implausible for a major program, self-eliminating) with closer plausible numbers, e.g. "Around 15", "Around 40". Separately: **flag for verification** — I cannot confirm "around 27" is the accurate current total NCAA Tournament appearance count for Tennessee men's basketball without a search tool; recommend checking against a current official source before this airs, since this number changes every season it makes the tournament.
**Reason:** §32 self-eliminating distractors + unverified/potentially stale numeric fact.
**Status:** ⏳ pending review — flagged as uncertain (unverified)

### trivia_questions.f422496d-a5ed-483d-b107-e812caa4df6b — 2026-09-02 / slot 3 — meta-commentary in option text + unverified hometown claim
**Current:** Options include C "Only pitchers have been early-round picks" and D "Nick Senzel (an earlier-era Vol, not Vitello-era)"
**Suggested fix:** Remove the parenthetical explanation from option D — it should just read "Nick Senzel" (or another real Tennessee second baseman name) with no editorial aside. Replace C with a plausible real player name rather than a meta claim. Separately: **flag for verification** — the claim that Christian Moore was "recruited from Brooklyn, New York" is not something I can confirm without a search tool; recommend verifying his actual hometown before this airs.
**Reason:** §32 explicitly prohibits meta-commentary/draft reasoning bleeding into question/option text — option D currently tells the test-taker why it's wrong, which is a giveaway and also unprofessional-looking copy. Hometown claim is unverified.
**Status:** ⏳ pending review — flagged as uncertain (unverified hometown)

### trivia_questions.a221e816-aec1-484c-b277-be65beb6fc7f — 2026-09-02 / slot 5 — broken True/False structure, no real "False" option
**Current:** "...True or false?" A "Among the lowest", B "The SEC distributes no revenue to member schools", C "True" (correct), D "Not applicable"
**Suggested fix:** Restructure as a genuine 2-option True/False (option_a "True", option_b "False", option_c/option_d null, correct_answer "A"), or convert to a standard 4-option factual question with real plausible numeric/ranking distractors instead of a True/False frame. Also note the underlying claim ("among the highest average per-school athletic revenue... nationally") is a fairly vague, general assertion rather than a single crisp fact — consider a more specific, verifiable claim.
**Reason:** The question is framed as True/False but never actually offers "False" as an option — all three wrong options are unrelated absurd claims. This is a structural defect, not just a distractor-quality issue.
**Status:** ⏳ pending review

### trivia_questions.c3440429-4c63-4822-9a1b-3862f99a6b99 — 2026-09-03 / slot 2 — broken True/False structure
**Current:** "...True or false?" A "Fans are banned from home games", B "False, attendance is minimal", C "Not applicable", D "True" (correct)
**Suggested fix:** Restructure as genuine True/False (2 options only) or convert to a standard 4-option factual question with real plausible distractors.
**Reason:** Same structural defect as a221e816 — no clean "False" option; other three are absurd/self-eliminating.
**Status:** ⏳ pending review

### trivia_questions.08ef515f-a19d-4f15-8649-f4e91a2fd7f7 — 2026-09-03 / slot 3 — meta-commentary in option text + "Not applicable" distractor
**Current:** Options include B "Texas (only joined in 2024)" and C "Not applicable"
**Suggested fix:** Remove the parenthetical from option B — should just read "Texas". Replace C "Not applicable" with a real SEC team name, e.g. "Auburn".
**Reason:** §32 — meta-commentary in option text (parenthetical explaining SEC realignment context is a giveaway/editorial aside) and a non-answer distractor. Note: the underlying premise ("most prominent modern rival... under Rick Barnes") is somewhat subjective/opinion-flavored for a trivia "correct answer"; defensible given the intensity of recent Tennessee-Florida hoops games, but flagging as borderline.
**Status:** ⏳ pending review

### trivia_questions.eb401166-d09e-4b28-ba38-50f1638ef6e8 — 2026-09-03 / slot 4 — minor: unrealistic distractor
**Current:** Options include D "Over 20,000" (career WNBA points)
**Suggested fix:** Replace D with a more plausible-sounding number, e.g. "Around 3,000".
**Reason:** No WNBA player has ever come close to 20,000 career points (league history is too short/season lengths too limited); this is trivially eliminable and slightly undercuts the "hard" difficulty label. Low priority.
**Status:** ⏳ pending review

### trivia_questions.c96fb2b7-71a2-495e-82d7-974fae105077 — 2026-09-03 / slot 5 — implausible distractors undermine "hard" difficulty + unverified claim
**Current:** A "Exactly capacity every game with no exceptions", B "Above 90,000 in most seasons" (correct), C "Below 50,000", D "Below 30,000"
**Suggested fix:** Replace the wildly implausible distractors with closer, more plausible attendance figures (e.g. "Above 80,000", "Below 70,000") so the question isn't trivially solvable by process of elimination for a "hard" slot. Separately: **flag for verification** — I cannot confirm from memory that Tennessee's average home attendance stayed "above 90,000 in most seasons" throughout the 2010s rebuilding years (some seasons, e.g. around 2017, are commonly cited as down years for attendance); recommend verifying against actual Neyland Stadium attendance figures before this airs.
**Reason:** §32 difficulty-matches-slot + self-eliminating distractors + unverified factual claim.
**Status:** ⏳ pending review — flagged as uncertain (unverified)

### trivia_questions.4bc04229-6623-49ac-b38e-e59e02e42f35 — 2026-09-04 / slot 3 — broken True/False structure
**Current:** "...True or false?" A "Not applicable", B "Tennessee has never played a nonconference game", C "True" (correct), D "False, only conference games are played"
**Suggested fix:** Restructure as genuine 2-option True/False, or convert to a standard 4-option factual question.
**Reason:** Same structural defect as the other True/False items above.
**Status:** ⏳ pending review

### trivia_questions.46c0072f-5a1e-4e13-ba19-43b2107b3887 — 2026-09-04 / slot 4 — not a real trivia question; recommend full replacement
**Current:** "Have Tennessee's basketball and baseball programs broadened their recruiting footprints to include more national and international talent over the past two decades?" A "Only in-state players have ever been recruited by any Tennessee sport", B "Not applicable", C "No sport has ever changed its recruiting footprint", D "Yes" (correct)
**Suggested fix:** Full replacement recommended (same category "General Vol Athletics", same slot 4/hard difficulty). I'm not proposing specific replacement text myself, since I can't confidently author and verify a new hard-difficulty fact without a search tool — recommend the content team draft a concrete, single-fact question for this slot instead (e.g. a specific verifiable stat, date, or record).
**Reason:** This is a vague yes/no opinion-style question with an obviously-true answer and no real distractor set — violates the "no hedge/non-answer as correct answer" spirit of §32 and is trivially guessable despite being labeled "hard," a difficulty mismatch.
**Status:** ⏳ pending review

### trivia_questions.cd05c1e9-d39b-40c6-ae80-da2df2e7db5e — 2026-09-04 / slot 5 — minor: weak/absurd distractors
**Current:** A "She wrote all her books entirely alone with no co-author", B "She never published any books", C "Not applicable", D "Sally Jenkins" (correct)
**Suggested fix:** Replace "Not applicable" with a real name (a plausible-but-wrong co-author or ghostwriter) if the content team can source one; otherwise leave as-is since A and B are reasonably plausible-sounding false claims even if not perfectly parallel. Low priority — flagging for awareness rather than urgent fix.
**Reason:** §32 distractor quality — "Not applicable" is a non-answer. Correct answer (Sally Jenkins) matches my own knowledge and is not flagged as uncertain.
**Status:** ⏳ pending review

### General note — repeated 1998-season topic within window
**Current:** trivia 2026-09-01 slot 3 (1998 record) and slot 5 (1998 SEC Championship-winning coach) both center on the 1998 national championship season.
**Suggested fix:** No change required — these are two distinct facts (record vs. coach), not a duplicate. Flagging only as a minor thematic overlap on the same day; consider spacing 1998-season questions further apart in future scheduling.
**Reason:** §32 duplicate/near-duplicate check — judged not a violation, but noted for awareness.
**Status:** ⏳ pending review (informational only)

### daily_polls.6bf49882-bfbd-4833-83b5-7ad766b0a293 — 2026-09-03 — overlapping/non-distinct options + one non-parallel option
**Current:** "What is the best nickname in Tennessee football history?" A "The Volunteers", B "Big Orange", C "Vols", D "The SEC's greatest fanbase"
**Suggested fix:** Replace options so all four are genuinely distinct nicknames rather than three near-synonyms ("The Volunteers," "Vols," and "Big Orange" all refer to the same core identity/are largely interchangeable) plus one option ("The SEC's greatest fanbase") that isn't a nickname at all. I'm not confident enough in a specific alternate slate of "official" nickname candidates to propose exact replacement text without verification — recommend the content team pick 4 genuinely distinct, verifiable nickname options.
**Reason:** §33 — options must be distinct and non-overlapping; "The SEC's greatest fanbase" isn't parallel in kind to the other three (it's a boast, not a nickname).
**Status:** ⏳ pending review — flagged as uncertain on exact replacement wording

### daily_polls — no row scheduled for 2026-09-04 — scheduling gap
**Current:** `SELECT ... WHERE active_date = '2026-09-04'` returns 0 rows; polls exist for 2026-09-01, 09-02, 09-03 only.
**Suggested fix:** N/A (no existing row/content to patch) — flagging the gap so the content team can schedule a poll for 2026-09-04 before that date arrives. This is an operational/scheduling note, not a content-field proposal, per the "never touch active_date" guardrail — I'm not proposing an active_date value myself, just surfacing the missing coverage.
**Reason:** In-scope date (today + 3) has no poll queued at all, unlike trivia_questions which has full 5-slot coverage for all 4 days.
**Status:** ⏳ pending review — operational gap, no row to fix

## 2026-09-01 — run summary (follow-up pass)
- Checked: trivia 2026-09-01 to 2026-09-04 (20 rows, 5 slots × 4 days), polls 2026-09-01 to 2026-09-04 (3 rows — 09-04 still missing)
- Issues found: 0 new — this is the identical dataset already logged in the run above (no fixes have been applied to the DB yet; all 15 previously-logged issues remain **pending and unresolved**, plus the 09-04 poll gap is still open)
- What changed this run: a web search tool was available this time (it was not in the prior pass), so I verified the factual claims that were previously flagged as **unverified**. Results below — these resolve the *factual-accuracy* half of those findings, but the *distractor-quality/structural* half of each finding (self-eliminating options, meta-commentary in option text, broken True/False structure) is unaffected and still stands as originally written.

**Verification results (facts confirmed accurate — no factual-accuracy fix needed):**
- `568c57d2` (2026-09-01 slot 4, women's swimming/diving): Program founded 1971 — confirmed. SEC team titles in 2020 and 2022 — confirmed (Wikipedia: Tennessee Volunteers women's swimming and diving). The distractor-quality issue (self-eliminating A/D) from the original entry still applies.
- `f422496d` (2026-09-02 slot 3, Christian Moore): Recruited from Brooklyn, NY — confirmed (born Brooklyn, NY, Oct 21 2002). Set Tennessee's single-season home run record with 34 HR in 2024 (previous record was 24) — confirmed. First-round pick, 8th overall, 2024 MLB Draft (Angels) — confirmed. All underlying facts check out; the meta-commentary issue in options C/D from the original entry still applies and is unchanged.
- `c96fb2b7` (2026-09-03 slot 5, attendance): Neyland Stadium average attendance stayed above 90,000 through the mid/late-2010s rebuilding years — confirmed (2015: 100,584; 2016: 100,968; 2017: 95,779, per 247Sports/Wikipedia even in the 4-8 2017 season). "Above 90,000 in most seasons" is accurate. The self-eliminating-distractors/difficulty-mismatch issue from the original entry still applies.
- `eb401166` (2026-09-03 slot 4, Tamika Catchings): Retired in 2016 with 7,380 career WNBA points — "Over 7,000 career WNBA points" (option A, correct answer) is accurate. Option D "Over 20,000" remains an absurd/self-eliminating distractor as originally noted.
- `4db80b43` (2026-09-02 slot 1, NCAA Tournament appearances): Current total (as of 2026) is 28 appearances. The question is phrased "as of the mid-2020s" and answers "Around 27" — close enough to be defensible as an approximation for that era (Tennessee added one more appearance in 2026), but note this stat keeps moving every tournament year the Vols qualify, so it will keep drifting from whatever exact number is baked into the question. Not proposing a numeric change — flagging as a low-priority precision note only. The self-eliminating-distractors issue from the original entry (A "Over 100", D "Fewer than 5") still applies.

None of the above changes any of the 15 pending fixes from the run above — they're still outstanding and unapplied. No new issues were found in this pass. Sources checked: Baseball America, UTSports.com, Wikipedia (Tennessee women's swimming and diving; 2022 Tennessee Volunteers baseball team), MLB.com/press release on the 2024 draft, ESPN/Forbes on Catchings' retirement stats, and 247Sports on Neyland Stadium attendance.
**Status:** ⏳ pending review — all outstanding items above remain unresolved pending David's action

## 2026-09-08 — run summary
- Checked: trivia 2026-09-08 to 2026-09-11 (20 rows, 5 slots × 4 days), polls 2026-09-08 to 2026-09-11 (4 rows)
- Issues found: 4 new
- Context: this run follows a 2026-09-07 pass (referenced by the task, not present as a dated section in this file) plus several rows David edited directly by hand since then. Each hand-edit was independently re-verified against the live DB rather than assumed correct — see verification notes below.

### David's hand-edits — independently reverified
- **trivia_questions.2450363a-a0ef-453d-a976-663806d0bb12 (2026-09-08 slot 5, Todd Helton 2000 season)** — CONFIRMED applied and correct. `option_b`/`option_c` now read "Home runs"/"Triples" (previously "Saves"/"Strikeouts"). Verified: Helton hit .372/42 HR/147 RBI/2 3B in 2000, leading the NL in AVG and RBI (`correct_answer` D = "Batting average and RBI"); 42 HR was well short of the NL lead and 2 triples is negligible — both are now non-self-eliminating, factually-grounded distractors for a position player. **Resolved.**
- **trivia_questions.9cda3391-a7ca-4d18-a378-b300e5454479 (2026-09-10 slot 1, stadium opening)** — CONFIRMED applied and correct. Question now reads "In what year did Tennessee's home stadium, originally called Shields-Watkins Field, first open (later renamed Neyland Stadium in 1962)?", `correct_answer` B = 1921. This fully replaces the prior SEC-division question that duplicated 2026-09-08 slot 1, and the 1921/1962 facts check out (Shields-Watkins Field opened 1921; renamed Neyland Stadium in 1962). **Resolved**, and the cross-day duplicate with 09-08 slot 1 is gone.
- **daily_polls "most heartbreaking loss in Tennessee football history" (2026-09-08)** — **COULD NOT VERIFY / BLOCKER.** The row currently scheduled for `daily_polls.active_date = '2026-09-08'` (id `0e29a73e-0f9a-47d2-b823-6b938f1de09b`) is "How many total TDs will Faizon Brandon have?" — unrelated content, not the "heartbreaking loss" poll at all. I searched the full `daily_polls` table for any row matching "heartbreaking" and found exactly one: id `7b82921e-760f-49a0-9a84-09888ed17c8b`, `active_date = 2026-11-03`, and it's about **baseball** ("most heartbreaking loss in Tennessee baseball history," options: 2022 Notre Dame Super Regional / 2021 CWS opening-round exit / 2023 CWS loss to LSU / 2019 Auburn Super Regional loss) — no Georgia, no Texas A&M, no football angle at all. I also searched for any poll option containing "Texas A&M" or "2016 Georgia" and found no football "heartbreaking loss" poll anywhere in the table, in or out of scope. **I cannot confirm this described fix exists in the database as stated — flagging for David to double-check which row/date this edit actually landed on** (possibly a different table, a session that didn't persist, or a mismatched description). Not logging a proposed fix since I can't locate the row to evaluate.

### Previously-flagged issues still open (2026-09-09, per the 09-07 pass referenced in the task — unchanged since, independently reconfirmed against current DB content)
- `trivia_questions` 2026-09-09 slot 1 (id `6ffeaf02-6c48-49cc-a93a-92ce4f2c51bf`) — hedge correct answer "A small handful of times" for Elite Eight appearance count, plus self-eliminating distractors ("Zero times ever" contradicts the question's own premise that 2010 was the first Elite Eight; "Every year since 2000" and "Over 20 times" are absurd for a program with one Elite Eight appearance in this era). Still unresolved.
- `trivia_questions` 2026-09-09 slot 2 (id `3d90e41c-e8fb-487f-82f8-ac45a716f216`) — non-answer distractors to a "who" question: "The commissioner role was eliminated," "Not applicable," "False, the SEC has no commissioner" are not names of people and are self-eliminating on format alone. Still unresolved.
- `trivia_questions` 2026-09-09 slot 4 (id `0caa8be2-80e4-4f2e-938a-35b47d596c04`) — broken True/False structure (only one option is "True," no clean "False" option) plus meta-commentary bleeding into option A: "Only Tennessee players have won the Heisman within the SEC (false — no Tennessee player has won it)" literally tells the test-taker the option is false inside the option text. Still unresolved.

### trivia_questions.230b0c07-7bbf-4e9d-b34c-259dd79c4f57 — 2026-09-10 / slot 3 — non-answer distractor
**Current:** "Kim Caldwell's coaching style... represented what kind of departure from the traditional Lady Vols basketball identity?" A "A shift toward a modern, up-tempo, analytics-driven offensive system" (correct), B "No change at all from the Summitt era", C "An even more defense-first, slow-tempo system", D "Not applicable"
**Suggested fix:** Replace D "Not applicable" with a real, plausible-but-wrong description of a coaching philosophy, e.g. "A return to a run-heavy, post-up-focused offense."
**Reason:** §32 — "Not applicable" is a non-answer, self-eliminating on format alone (same recurring pattern flagged in prior runs, e.g. 2026-09-03/09-04 True/False items and the SEC commissioner question above).
**Status:** ⏳ pending review

### trivia_questions.3164cb4d-0856-4a3b-922f-9d74ecdcdc68 — 2026-09-10 / slot 5 — rival-team-specific question, out of Vol/SEC scope
**Current:** "Vanderbilt's baseball program won its first College World Series championship in which year, defeating Virginia?" A "2020", B "2005", C "1995", D "2014" (correct)
**Suggested fix:** Full replacement recommended (same category "SEC Knowledge," same slot 5/hard difficulty) with a question that is SEC-wide or Tennessee-specific rather than a deep dive into a single rival program's own history — e.g. an SEC Championship Game/standings fact involving Tennessee, in the style of "Who won the 2018 SEC Championship game?"
**Reason:** §32 explicitly requires Vol/SEC scope, "never rival-team-specific," using the gut-check example "NOT OK: Who was Alabama's starting QB in 2018?" This question is entirely about Vanderbilt's own program history with no Tennessee or SEC-wide angle — the same category of violation as that example. (The underlying fact itself — Vanderbilt beat Virginia to win its first CWS title in 2014 — is accurate; this is a scope issue, not a factual-accuracy issue.)
**Status:** ⏳ pending review

### trivia_questions.cd1d1634-911f-4720-97e1-71d5b14eb1a9 — 2026-09-11 / slot 3 — self-eliminating distractor contradicts the question's own premise
**Current:** "Tennessee and UConn stopped playing each other for roughly a decade... What is commonly cited as the underlying cause?" A "A stadium capacity issue", B "A reported dispute between the two programs over scheduling and other issues" (correct), C "Not applicable, they never had a rivalry", D "An NCAA mandate banning the rivalry"
**Suggested fix:** Replace C with a real plausible-but-wrong cause, e.g. "A disagreement over television broadcast rights."
**Reason:** §32 — option C directly contradicts the question stem, which already states the two teams "stopped playing each other" and the series "resumed in 2020," i.e. a rivalry demonstrably existed. This is eliminable without any Tennessee/UConn knowledge, purely from internal contradiction with the question text.
**Status:** ⏳ pending review

### daily_polls.9b73b6c2-da9d-4261-afcb-320b9c36a111 — 2026-09-11 — factual error: Tennessee did not have a "2016 comeback" win over Alabama
**Current:** "What is the greatest win in Tennessee football history?" A "1998 National Championship", B "1986 Sugar Bowl", C "2016 comeback vs Alabama", D "2022 Alabama upset"
**Suggested fix:** Replace option C with "2016 comeback vs Georgia" (the actual 2016 comeback — Tennessee trailed and won 34-31 on Joshua Dobbs' 43-yard Hail Mary to Jauan Jennings as time expired, October 1, 2016).
**Reason:** §33 factual accuracy. Verified via web search: Tennessee lost to Alabama 49-10 on October 15, 2016 (no comeback, no win) — [ESPN box score](https://www.espn.com/college-football/game/_/gameId/400869028/alabama-tennessee). The actual famous 2016 fourth-quarter comeback win was against Georgia — [SEC Sports recap](https://www.secsports.com/article/17688353/tennessee-stuns-georgia-hail-mary-win-34-31). This is the same "2016 Georgia" fact pattern David already corrected in the 09-08 trivia poll's option C this week, just surfacing here in a different poll — worth double-checking other rows for the same mix-up while reviewing.
**Status:** ⏳ pending review — high confidence, sourced above

### General note — 09-08 poll hand-edit could not be located (see blocker above)
**Current:** N/A — see "David's hand-edits — independently reverified" section above for full detail.
**Suggested fix:** N/A — need David to confirm which row/date the "heartbreaking loss" football poll edit actually applies to before any further QA of it.
**Reason:** Guardrail — "if you're not confident a proposed fix is actually correct... log it as flagged with the uncertainty stated plainly." Here the uncertainty is about the row's existence/location, not a factual claim, but the same principle applies: not proposing a fix for content I can't locate.
**Status:** ⏳ blocked — needs David's input
