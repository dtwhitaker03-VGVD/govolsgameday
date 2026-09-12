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

## 2026-09-10 — run summary
- Checked: trivia 2026-09-10 to 2026-09-13 (20 rows, 5 slots × 4 days), polls 2026-09-10 to 2026-09-13 (4 rows, full coverage — the 09-04-style scheduling gap from the first run has not recurred)
- Also independently re-verified (outside this run's normal 3-day-out scope, at David's request) six rows David edited directly since the 2026-09-09 log entry: 2026-09-09 trivia slot 1, 2026-09-09 poll, 2026-09-11 trivia slots 3 & 4, 2026-09-11 poll, 2026-09-12 trivia slot 4, 2026-09-12 poll
- Issues found: 1 (new, in-scope) — plus 3 low-priority informational notes (no proposed fixes) below
- This pass had full web search access; every factual claim below was checked against live sources rather than assumed from memory.

### Verification of David's manual edits since the 2026-09-09 log entry (all confirmed correct and resolved)
- **2026-09-09 trivia slot 1** (`6ffeaf02-6c48-49cc-a93a-92ce4f2c51bf`) — now reads "Four times" (option B) for Tennessee's total Elite Eight appearances. **Confirmed accurate**: Tennessee has reached the Elite Eight four times — 2010 (lost to Michigan State), 2024, 2025, and 2026 (lost to Michigan, per UTSports.com's March 29, 2026 recap). Resolved, no further action needed.
- **2026-09-09 poll** (`305efe8c-1710-406c-b248-dd1367fa88ab`, "Greatest TN Vol Backfield?") — replaced entirely with McEver-Feathers / Cobb-Webb / Lewis-Henry-Stephens / Wright-Small-Sampson. **All four independently fact-checked as real, historically documented Tennessee backfield combinations**, not just plausible-sounding names:
  - *McEver-Feathers*: Gene McEver and Beattie Feathers, both Bristol, VA natives and College Football Hall of Famers, played one varsity season together in the Tennessee backfield in 1931 (9-0-1 team) — confirmed via UT Sports Hall of Fame and Herald Courier ("Call it the 'Beattie Feathers Bowl'").
  - *Cobb-Webb*: Reggie Cobb and Chuck Webb were an actual documented Tennessee backfield pairing in 1989, referred to in period coverage as "the Cobb-Webb connection" (VolNation forum history, Wikipedia).
  - *Lewis-Henry-Stephens*: Jamal Lewis, Travis Henry, and Travis Stephens were Tennessee's trio of star running backs from the 1997-2001 seasons (Henry & Stephens started together in 1998; Lewis & Henry shared the backfield in 1999), commonly grouped together in program retrospectives as that era's great RB corps.
  - *Wright-Small-Sampson*: Jaylen Wright, Jabari Small, and Dylan Sampson formed Tennessee's documented "three-headed monster" backfield in 2023 under Josh Heupel (247Sports, On3).
  - Resolved — no further action needed.
- **2026-09-11 trivia slot 3** (`cd1d1634-911f-4720-97e1-71d5b14eb1a9`, UConn rivalry) — distractor now reads "A disagreement over which network would broadcast the games" in place of the old "Not applicable" option. **Confirmed correct as a false-but-plausible distractor**: no source ties the 2007-2020 Tennessee-UConn hiatus to a broadcast dispute — the real reported cause (matching the existing correct answer B) was a falling-out between Pat Summitt and Geno Auriemma, including a Tennessee complaint to the SEC over UConn's recruiting of Maya Moore (ESPN, FOX Sports). Resolved.
- **2026-09-11 trivia slot 4** (`e1db8359-7c57-4af1-a51f-320992b3c83c`, Ray Mears/first SEC title) — reworded to "several decades before Ray Mears' 1966-67 regular-season title" instead of stating the target decade/year directly. Confirms the question no longer gives away the answer in the stem. Underlying fact also independently re-verified: Tennessee's first outright SEC men's basketball championship came in 1936 under Blair Gullion (Saturday Down South, Wikipedia SEC tournament history) — correctly matches option D "1930s". Resolved.
- **2026-09-11 poll** (`9b73b6c2-da9d-4261-afcb-320b9c36a111`) — option C now reads "2016 comeback vs Georgia" (previously misattributed to Alabama). **Confirmed correct**: the 2016 last-play Hail Mary comeback (Joshua Dobbs to Jauan Jennings) was against Georgia. Resolved.
- **2026-09-12 trivia slot 4** (`92eae7d5-2274-4d93-aff2-262a050611d8`) — fully replaced question now reads "Which Tennessee pitcher was drafted 18th overall by the Texas Rangers in 1996, only for a physical to reveal he was missing the ulnar collateral ligament in his throwing elbow?" with correct answer R.A. Dickey (option D). **Confirmed accurate on all specifics**: Dickey was a University of Tennessee pitcher, drafted 18th overall by the Rangers in June 1996, and a pre-signing physical revealed his right elbow was missing the UCL, dropping his signing bonus from a reported $810,000 offer to $75,000 (Bleacher Report, SABR bio). Distractors are also sound: Todd Helton and Luke Hochevar were both real Tennessee pitchers/two-way players of different eras (good plausible-but-wrong options); David Price — the Vanderbilt alum wrongly credited as a Tennessee pitcher in the old version of this question — now correctly appears only as a wrong distractor, not the answer. Resolved.
- **2026-09-12 poll** (`ab788adf-509f-4501-a928-37e315a12637`) — "Which Vol sport are you most excited to watch this season?" (Football/Men's Basketball/Baseball/Lady Vols Basketball) now exists where a poll was previously missing. Clear, single-topic, non-overlapping, unbiased options. Resolved — gap filled, no issues.

### trivia_questions.230b0c07-7bbf-4e9d-b34c-259dd79c4f57 — 2026-09-10 / slot 3 — minor self-eliminating distractor
**Current:** "Kim Caldwell's coaching style, emphasizing pace and three-point shooting, represented what kind of departure from the traditional Lady Vols basketball identity?" A "A shift toward a modern, up-tempo, analytics-driven offensive system" (correct), B "No change at all from the Summitt era", C "An even more defense-first, slow-tempo system", D "A return to a slower, more traditional post-up-focused offense"
**Suggested fix:** Replace option B with a plausible-but-wrong descriptor instead of a flatly impossible one, e.g. "A modest tweak while keeping the same half-court, post-oriented sets."
**Reason:** §32 — any Lady Vols fan following recent coverage of Caldwell's hire knows her uptempo, high-volume-three style is a major departure, so "no change at all" is trivially eliminable without needing to know the actual style shift, similar to other self-eliminating-distractor findings logged previously. Low priority — the correct answer and the underlying characterization of Caldwell's system are accurate.
**Status:** ⏳ pending review

### Informational note — thematic clustering of Lady Vols/Pat Summitt content in-window
**Current:** 2026-09-11 slot 1 (Holly Warlick succeeding Summitt in 2012), 2026-09-12 slot 1 (Summitt hired at age 22), and 2026-09-12 slot 5 (Summitt's exact career record) are three different Summitt/Lady Vols-coaching-adjacent facts within the 4-day window.
**Suggested fix:** No change required — each is a genuinely distinct fact (coaching succession vs. hiring age vs. final record), not a duplicate. Flagging only as thematic overlap for awareness, consistent with how the 1998-season overlap was handled in the 2026-09-01 log.
**Reason:** §32 duplicate/near-duplicate check — judged not a violation, but noted.
**Status:** ⏳ pending review (informational only)

### Informational note — borderline category choice
**Current:** `3164cb4d-0856-4a3b-922f-9d74ecdcdc68` (2026-09-10 slot 5, "How many SEC football championships has Tennessee won all-time?") is categorized "SEC Knowledge."
**Suggested fix:** No forced change — defensible either way — but "Vol Football History" arguably fits better, since the fact is entirely about Tennessee's own program total rather than conference-wide knowledge (contrast with the 2026-09-09 slot 2 "who is the SEC commissioner" question, which is genuinely conference-wide and unambiguously "SEC Knowledge").
**Reason:** §32 category-accuracy check — low-priority judgment call, not a factual or structural defect. The stat itself (13 SEC titles, most recent 1998) is confirmed accurate.
**Status:** ⏳ pending review (informational only)

### Informational note — game-prediction poll framing presupposes a Tennessee win
**Current:** `c34a730a-8f57-40ab-b486-92cd42633401` (2026-09-10 poll) — "How much will TN beat GT by?" A "They won't beat GT", B "1-9 points", C "10-19 points", D "20+ points".
**Suggested fix:** No change proposed — option A does cover the non-win outcome, so the option set is a complete partition even though the question stem itself is worded as if a Tennessee win is a foregone conclusion. This looks like an established recurring "predict the game" poll template rather than a one-off drafting issue, so flagging for awareness only rather than proposing a rewrite that could break a working format.
**Reason:** §33 "no leading or biased phrasing toward one option" — the stem's phrasing is mildly presumptuous, but not disqualifying given the complete option coverage.
**Status:** ⏳ pending review (informational only)

All other in-window trivia (2026-09-10 through 2026-09-13, slots 1-5) and polls (2026-09-10 through 2026-09-13) were checked against §32/§33 and against live web sources for every verifiable factual claim (stadium history, coaching tenures/records, draft facts, rushing/win records, SEC broadcast rights, transfer history, etc.) — no further accuracy, structural, distractor-quality, difficulty-mismatch, duplicate, or category problems found. Sources checked this run: UTSports.com, Wikipedia (Gene McEver, Beattie Feathers, Chuck Webb, Reggie Cobb, Dylan Sampson, Tennessee Volunteers football, Neyland Stadium, Tennessee-UConn rivalry, List of SEC men's basketball champions), Bleacher Report, SABR, Saturday Down South, 247Sports, On3, ESPN, FOX Sports, Herald Courier, VolNation.
**Status:** ⏳ pending review — 1 new low-priority item plus 3 informational notes await David's review; all six of David's manual edits since 2026-09-09 are confirmed correct and resolved
