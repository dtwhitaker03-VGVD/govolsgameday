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

## 2026-09-09 — run summary
- Checked: trivia 2026-09-09 to 2026-09-12 (20 rows, 5 slots × 4 days), polls 2026-09-09 to 2026-09-12 (3 rows found — 2026-09-12 has no poll scheduled)
- Issues found: 6 (2 new factual issues, 1 new question-design issue, 1 new scheduling gap, 2 carried-forward issues from the prior pass on 2026-09-11 content that remain unresolved)
- Independent verification of David's 2026-09-09/09-10 manual edits: see "Verified fixes" section below — 5 of 6 check out cleanly; 1 (Elite Eight count) checks out as *entered* but has been overtaken by events since it was written.

**Verified fixes (David's direct edits, checked independently this run):**
- `3d90e41c` (2026-09-09 slot 2, SEC commissioner): Greg Sankey has held the role since 2015, succeeding Mike Slive — confirmed. Distractors Bill Hancock (a real former commissioner, of the Big 12/BCS) and Jim Delany (a real former Big Ten commissioner) are legitimate plausible names now. **Resolved, no further issue.**
- `0caa8be2` (2026-09-09 slot 4, Heisman winners): Tennessee has never produced a Heisman Trophy winner (Peyton Manning's 1997 runner-up finish is the closest) — confirmed. "Zero" is correct and the question/options are now clean. **Resolved, no further issue.**
- `230b0c07` (2026-09-10 slot 3, Kim Caldwell): Caldwell's system (pace, high three-point volume, analytics-driven) is a well-documented departure from the Summitt-era post-up/defense identity — confirmed. The new distractor D ("a return to a slower, more traditional post-up-focused offense") is a real, plausible, non-self-eliminating option. **Resolved, no further issue.**
- `3164cb4d` (2026-09-10 slot 5, SEC football championships): Confirmed 13 SEC titles for Tennessee (1938, 1939, 1940, 1946, 1951, 1956, 1967, 1969, 1985, 1989, 1990, 1997, 1998 — most recent 1998), matching option B. This is a genuinely different, larger number (16) that plausibly reflects total conference titles across pre-SEC eras, so it isn't a scope violation or a self-eliminating distractor — it's a real, close, defensible wrong answer. **Resolved, no further issue.**
- `c34a730a` (2026-09-10 poll, "How much will TN beat GT by?"): Clear, single-topic, four distinct non-overlapping outcome bands, no leading/biased phrasing. **Resolved, no further issue.**
- `6ffeaf02` (2026-09-09 slot 1, Elite Eight count): **Only partially resolved — see new issue below.** The hedge ("A small handful of times") is gone, which fixes the original defect, but the specific number now baked in ("Three times") has since become stale.

### trivia_questions.6ffeaf02-6c48-49cc-a93a-92ce4f2c51bf — 2026-09-09 / slot 1 — correct answer is now factually stale (Elite Eight count undercounts by one)
**Current:** "Tennessee reached its first-ever Elite Eight in 2010. How many times has the program reached the Elite Eight overall through the mid-2020s?" A "Once", B "Three times" (correct), C "Five times", D "Nine times"
**Suggested fix:** Update option B (and correct_answer framing) to "Four times" — Tennessee reached the Elite Eight in 2010, 2024, 2025, **and 2026** (a 95-62 regional-final loss to Michigan in March 2026), per UTSports.com and Wikipedia. The "2010/2024/2025 → three times" count was accurate when written but the 2026 NCAA Tournament has since occurred (this question is scheduled to air 2026-09-09, after that tournament concluded). Alternatively, if the intent is to freeze the question at a specific historical cutoff, rephrase to something unambiguous like "...through the 2025 tournament?" so a fan checking today's actual count isn't marked wrong.
**Reason:** §32 factual accuracy — verified via web search (utsports.com regional-final recap, Wikipedia 2025–26 Tennessee Volunteers basketball team page) that a fourth Elite Eight appearance happened in March 2026, before this question's scheduled air date. "Three times" is provably wrong as of today for a fan following the current season. This was explicitly flagged for independent verification and does not hold up — it should not be treated as resolved.
**Status:** ⏳ pending review

### trivia_questions.92eae7d5-2274-4d93-aff2-262a050611d8 — 2026-09-12 / slot 4 — correct answer is a Vanderbilt player, not a Tennessee player (scope violation + factual error)
**Current:** "Which Tennessee pitcher's rookie season included a deep American League Championship Series run with the Tampa Bay Rays in 2008?" A "Todd Helton", B "R.A. Dickey", C "Luke Hochevar", D "David Price" (correct)
**Suggested fix:** Full replacement recommended. David Price played college baseball at **Vanderbilt** (led the Commodores to their first SEC regular-season and tournament titles, won the 2007 Golden Spikes Award there), not Tennessee — he was only born in Murfreesboro, TN. The Rays/2008-ALCS clue (win in Game 2, save in Game 7 vs. Boston) is accurate for Price, but he's the wrong school. None of the other three options fit the clue as real Tennessee alternates either: Todd Helton's MLB career was with the Colorado Rockies, R.A. Dickey's Rays stint was in 2013 (not 2008, and he wasn't on that ALCS roster), and Luke Hochevar played only for the Kansas City Royals. I could not identify an actual Tennessee-alum pitcher who fits the 2008 Rays ALCS clue, so I'm not proposing a patched correct answer — recommend the content team draft a different verifiable Tennessee baseball fact for this slot (hard / Vol Baseball History) rather than reuse this clue.
**Reason:** §32 Vol/SEC-scope + factual accuracy — the question asserts a Tennessee affiliation for a player who is in fact a well-known Vanderbilt Commodore, which is both wrong and, if run as-is, would be an in-conference-rival misattribution reaching Tennessee fans as their own program's trivia.
**Status:** ⏳ pending review — flagged high priority (this is a new question that has never aired)

### trivia_questions.e1db8359-7c57-4af1-a51f-320992b3c83c — 2026-09-11 / slot 4 — question gives away its own answer; confusing two-fact framing
**Current:** "Ray Mears' 1966-67 team won the program's first SEC regular-season title of his tenure. In which decade did Tennessee win its very first SEC basketball championship, outright, in 1935-36?" A "1980s", B "1960s", C "1950s", D "1930s" (correct)
**Suggested fix:** Drop the embedded year from the question stem — e.g. "Tennessee won its first-ever outright SEC basketball championship several decades before Ray Mears' 1966-67 regular-season title. In which decade did that first title come?" or simplify to one fact per question (either ask about Mears' era or the 1935-36 title, not both, with the target year never stated outright when it's also the thing being asked).
**Reason:** §32 meta-commentary/answer-leakage — as written, the question literally states "1935-36" and then asks only which *decade* that falls in, so it's solvable by simple arithmetic with zero Tennessee basketball knowledge required. That's a hard difficulty-mismatch failure (labeled "hard" but trivially easy) as well as confusing construction, since the Ray Mears sentence introduces a second, unrelated fact (1966-67) that is never actually asked about.
**Status:** ⏳ pending review

### daily_polls — no row scheduled for 2026-09-12 — scheduling gap
**Current:** `SELECT ... WHERE active_date = '2026-09-12'` returns 0 rows. Confirmed via `SELECT active_date, count(*) ... GROUP BY active_date` for 2026-09-08 through 2026-09-13: rows exist for 09-08, 09-09, 09-10, 09-11, and 09-13, but 09-12 is missing.
**Suggested fix:** N/A (no existing row/content to patch) — flagging the gap, same class of issue as the 2026-09-04 gap logged 2026-09-01. Not proposing an `active_date` value myself per the "never touch active_date" guardrail.
**Reason:** In-scope date (today + 3) has no poll queued, unlike trivia_questions which has full 5-slot coverage for all 4 days in this window.
**Status:** ⏳ pending review — operational gap, no row to fix

### Carried forward, still unresolved — trivia_questions.cd1d1634-911f-4720-97e1-71d5b14eb1a9 — 2026-09-11 / slot 3 — self-eliminating distractor
**Current:** "Tennessee and UConn stopped playing each other for roughly a decade beginning in the mid-to-late 2000s, before the series resumed in 2020. What is commonly cited as the underlying cause?" A "A stadium capacity issue", B "A reported dispute between the two programs over scheduling and other issues" (correct), C "Not applicable, they never had a rivalry", D "An NCAA mandate banning the rivalry"
**Suggested fix:** Replace C with a real, plausible-but-wrong reason (e.g. "A disagreement over which network would broadcast the games" or a specific named non-cause), since "they never had a rivalry" directly contradicts the premise stated in the question itself and is trivially eliminable.
**Reason:** §32 self-eliminating distractor. Verified this run: the Tennessee–UConn women's basketball hiatus (2007–2020) is real and is commonly attributed to a reported falling-out between the two staffs, not any of the absurd alternatives offered. This row has not been touched since it was originally noted; still open.
**Status:** ⏳ pending review

### Carried forward, still unresolved — daily_polls.9b73b6c2-da9d-4261-afcb-320b9c36a111 — 2026-09-11 — factual error misattributes the 2016 Hail Mary comeback to the wrong opponent
**Current:** "What is the greatest win in Tennessee football history?" A "1998 National Championship", B "1986 Sugar Bowl", C "2016 comeback vs Alabama", D "2022 Alabama upset"
**Suggested fix:** Change option C to "2016 comeback vs Georgia". Verified via web search: on 2016-10-01, Joshua Dobbs hit Jauan Jennings on a 43-yard Hail Mary on the final play to beat Georgia 34-31 in Athens — this is the famous 2016 "Hail Mary" comeback, and it was against Georgia, not Alabama. (Option D, "2022 Alabama upset," is a separate, correctly-attributed real event — Tennessee's 52-49 win over Alabama in 2022 — and stays as-is.)
**Reason:** §33 factual accuracy — the question as currently written credits Alabama with a signature Georgia win, which is a real factual error in a widely-remembered game, not a matter of opinion. This row has not been touched since it was originally noted; still open.
**Status:** ⏳ pending review

### General note — thematic overlap, informational only
- 2026-09-12 slot 1 (Pat Summitt hired at 22) and slot 5 (Pat Summitt's exact career record at retirement) both center on Pat Summitt — two distinct facts (hiring age vs. final record), not a duplicate, but flagging the same-day thematic concentration for awareness, consistent with the informational note logged 2026-09-01.
**Status:** ⏳ pending review (informational only, not counted in issue total)

Sources checked this run: UTSports.com (2026 Elite Eight recap), Wikipedia (Tennessee Volunteers basketball; Tennessee Volunteers football; David Price; Peerless Price; Dylan Sampson), Pro-Football-Reference (Peerless Price draft), 247Sports/On3/Rocky Top Insider (Dylan Sampson single-season rushing record), SEC Sports/ESPN/WBIR (2016 Tennessee–Georgia Hail Mary game).
**Status:** ⏳ pending review — all items above remain unresolved pending David's action
