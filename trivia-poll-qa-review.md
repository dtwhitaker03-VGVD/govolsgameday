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

## 2026-09-06 — run summary
- Checked: trivia 2026-09-06 to 2026-09-09 (20 rows, 5 slots × 4 days), polls 2026-09-06 to 2026-09-09 (4 rows, full coverage — no scheduling gaps this window)
- Issues found: 8 (6 trivia, 2 poll), plus 2 low-priority/informational notes
- Note on this log: this file's most recent prior entries are the 2026-09-01 runs above; no 2026-09-05 section exists in this file to compare against. I was told David made manual edits on 2026-09-06 since a 2026-09-05 pass — I've verified those specific edits independently below (facts checked fresh against web sources, not assumed from the brief), and reviewed 2026-09-07 through 09-09 as their own independent pass since I have no logged baseline for them in this file.

### David's 2026-09-06 fixes — verified resolved
- **`95da837e` (slot 2, Grant Williams/Purdue points):** Now reads "How many points did Grant Williams score in Tennessee's 2019 Sweet 16 overtime loss to Purdue?" correct answer 21 (options 15/18/21/27). **Confirmed accurate** — Williams scored 21 points (7 reb, 4 ast, 2 blk) in Tennessee's 99-94 OT loss to Purdue, March 28, 2019. Question-stem-gives-away-answer issue is resolved; distractors are now plausible nearby point totals with no self-elimination. Sources: 247Sports, Rocky Top Talk, CBS Sports box score.
- **`024a94ee` (slot 4, Grant Williams breakout season):** Now reads "Which Tennessee player's breakout junior season, in 2018-19, coincided with the program's first #1 ranking since 2008?" correct answer Grant Williams (distractors Schofield/Bone/Turner). **Both factual claims confirmed independently:** (1) 2018-19 was Williams's junior year at Tennessee — he was a consensus All-American that season and entered the 2019 NBA Draft afterward, consistent with a junior (not senior) departure. (2) Tennessee's 2019 #1 AP ranking (4 weeks, during a 19-game win streak) genuinely was the program's first #1 ranking since 2008, not merely "since some later year" — sources explicitly state Tennessee was atop the polls for one week in 2008 and then not again until 2019. Both previously-flagged factual errors are resolved; distractors (Schofield, Bone, Turner) are real 2018-19 teammates, appropriately plausible for a hard-difficulty item. Sources: On3 (Tennessee's history as No. 1), WATE, UTSports Grant Williams analytics profile.
- **`a94a824a` (2026-09-06 poll, best Vol football game attended):** Options are now four parallel opponent names — Alabama game / Florida game / Georgia game / Kentucky game. **Confirmed resolved** — all four are genuinely distinct, non-overlapping, parallel-in-kind options; the earlier overlapping/non-parallel-option issue no longer applies.
- **Slots 1 (`060c925f`, volleyball/fall sport), 3 (`5b7bd78c`, Deon Grant), and 5 (`9d6f33a0`, Todd Helton #3)** — confirmed unchanged and re-verified clean on this pass: Deon Grant started at free safety as a sophomore on the 1998 championship team and was later a multi-team NFL starting safety (2nd-round pick, 2000 draft) — question holds up. Todd Helton wore #3 at Tennessee (retired Jan. 30, 2008) before the Rockies retired his #17 in 2014 — question holds up. No issues found on any of these three.

### trivia_questions.72c5d746-3288-46fd-90ee-b8c31450144c — 2026-09-07 / slot 1 — broken True/False structure
**Current:** "Tennessee baseball uses the same Smokey mascot ... shared across all Vol sports. True or false?" A "False, baseball has a separate mascot", B "Baseball has no mascot", C "True" (correct), D "Not applicable"
**Suggested fix:** Restructure as a genuine 2-option True/False (`option_a` "True", `option_b` "False", `option_c`/`option_d` null, `correct_answer` "A"), or convert to a standard 4-option factual question (e.g. "What breed of dog is Smokey, Tennessee's live mascot?" with real breed names as distractors).
**Reason:** Same structural defect logged repeatedly in the 2026-09-01 batch (e.g. `a221e816`, `c3440429`, `4bc04229`) — framed as True/False but never actually offers a clean "False" option; the other three choices are absurd/non-answers. The underlying claim itself checks out (Smokey the Bluetick Coonhound is UT's mascot across its athletics programs), so this is purely a format fix, not a fact fix.
**Status:** ⏳ pending review

### trivia_questions.02c9eaf9-8527-44c1-8555-ba86a373372b — 2026-09-07 / slot 3 — hedge/non-answer as the correct answer (high priority)
**Current:** "...Has this rivalry included postseason (NCAA Tournament) meetings in recent years?" A "It's plausible given both programs' postseason frequency, though the exact matchup history should be checked against official NCAA brackets" (correct), B "They have never met in the postseason", C "Not applicable", D "They are barred from meeting in the postseason due to conference rules"
**Suggested fix:** Replace the entire question with one built around a single, concrete, verified fact rather than an instruction to go double-check elsewhere. I searched for a specific Tennessee–Vanderbilt NCAA Tournament (Regional/Super Regional/CWS) meeting and could **not** independently confirm one in recent years — Vanderbilt's tournament history (2004-2025, 19 straight appearances, CWS titles 2014/2019) and Tennessee's don't show a documented head-to-head postseason matchup in what I found. Recommend the content team either source a specific confirmed matchup (year + round) to build a real question around, or replace this slot's topic entirely.
**Reason:** §32 explicitly prohibits hedge/non-answers as the correct answer (e.g. "specifics vary by year") — "it's plausible... should be checked against official brackets" is exactly that pattern, and is not something a trivia player could ever confidently select as "correct." This is the highest-priority item this run since it's a structural violation of the core quality bar, not just weak distractors.
**Status:** ⏳ pending review — flagged as uncertain (could not verify or refute the underlying rivalry claim)

### trivia_questions.af17891c-7852-42dd-94e8-0475cdc5db24 — 2026-09-07 / slot 5 — self-eliminating distractor contradicting the question's own premise + unverified "multiple winners" claim
**Current:** "Tennessee has had multiple SEC Sixth Man of the Year winners provide key bench scoring under Rick Barnes. Is this award given annually by the conference?" A "Only starters are eligible", B "The award doesn't exist in the SEC", C "Yes, it is an annual SEC honor" (correct), D "No Tennessee player has won this award"
**Suggested fix:** Convert to a genuine trivia question naming a real result, e.g. "Which Tennessee player was named SEC Co-Sixth Man of the Year in 2018?" with real Tennessee bench players from that era as distractors (verify against SEC award records before finalizing). Separately, **flag for verification**: I could only independently confirm one Tennessee SEC Sixth Man of the Year/Co-award (Lamonté Turner, 2018) under Barnes — I could not confirm a second Tennessee winner, so "multiple ... winners" is currently an unverified plural claim.
**Reason:** Option D directly contradicts a fact the question itself just asserted ("Tennessee has had multiple ... winners"), making it self-eliminating without any basketball knowledge — same pattern as prior self-eliminating-distractor findings. The question is also framed as a yes/no procedural question ("is this award given annually?") rather than testing a fact about Tennessee, which is a weak trivia format regardless of the distractor issue.
**Status:** ⏳ pending review — flagged as uncertain (unverified "multiple winners" premise)

### trivia_questions.6ffeaf02-6c48-49cc-a93a-92ce4f2c51bf — 2026-09-09 / slot 1 — hedge correct answer + self-eliminating distractors
**Current:** "...How many times has the program reached the Elite Eight overall through the mid-2020s?" A "Zero times ever", B "A small handful of times" (correct), C "Every year since 2000", D "Over 20 times"
**Suggested fix:** Replace the correct answer with the actual count and give closer, real distractors — Tennessee has reached the Elite Eight 3 times through the mid-2020s (2010, 2024, 2025); suggest correct answer "3 times" with distractors like "Once", "Twice", "5 times" rather than the current extremes.
**Reason:** "A small handful of times" is an imprecise hedge rather than a single defensible fact (§32), and A/C/D are so extreme relative to a major program's actual history that they're self-eliminating without requiring any real knowledge — a test-taker can guess B by process of elimination alone.
**Status:** ⏳ pending review

### trivia_questions.3d90e41c-e8fb-487f-82f8-ac45a716f216 — 2026-09-09 / slot 2 — self-eliminating distractors contradicting the question's own premise
**Current:** "The SEC ... has a commissioner who oversees expansion and media rights negotiations. Who has held that role since 2015?" A "The commissioner role was eliminated", B "Greg Sankey" (correct — confirmed, Sankey has been SEC commissioner since 2015), C "Not applicable", D "False, the SEC has no commissioner"
**Suggested fix:** Replace A and D with real, plausible-but-wrong names/facts, e.g. A "Mike Slive" and D "Roy Kramer" (both real former SEC commissioners, genuinely wrong only because the question asks specifically "since 2015"), and replace C "Not applicable" with another real name such as "Bill Hancock."
**Reason:** A and D both flatly contradict a fact the question stem already stated as true ("has a commissioner..."), so they're eliminable on the question's own wording alone, independent of any SEC knowledge — the same self-eliminating-distractor pattern flagged repeatedly on 2026-09-01.
**Status:** ⏳ pending review

### trivia_questions.0caa8be2-80e4-4f2e-938a-35b47d596c04 — 2026-09-09 / slot 4 — broken True/False + meta-commentary in option text + self-eliminating distractor
**Current:** "The SEC's total number of Heisman Trophy winners ... is historically among the highest of any conference, even though no Tennessee player has ever won it. True or false?" A "Only Tennessee players have won the Heisman within the SEC (false — no Tennessee player has won it)", B "Not applicable", C "True" (correct), D "The SEC has never had a Heisman winner"
**Suggested fix:** Restructure as a genuine 2-option True/False (`option_a` "True", `option_b` "False", nulls for c/d, `correct_answer` "A"), and if kept as a longer question, strip the parenthetical explanation out of option A entirely (it should just read "Only Tennessee players have won the Heisman within the SEC" with no editorial aside telling the reader why it's wrong).
**Reason:** Combines three defects at once: (1) meta-commentary bleeding into option text — the parenthetical in A explicitly tells the test-taker the answer is false, a direct giveaway (§32); (2) option D flatly contradicts the question's own stated premise, making it self-eliminating; (3) no real "False" option is offered despite the True/False framing, the same structural defect flagged repeatedly elsewhere in this log. The underlying claim (SEC among the most prolific Heisman-producing conferences, no Tennessee winner) is plausible and not itself disputed here.
**Status:** ⏳ pending review

### daily_polls.0e29a73e-0f9a-47d2-b823-6b938f1de09b — 2026-09-08 — factual error: option describes a Tennessee win, not a loss (high priority)
**Current:** "What is the most heartbreaking loss in Tennessee football history?" A "2001 LSU", B "2015 Arkansas", C "2016 Georgia", D "2019 Georgia State"
**Suggested fix:** Replace option C with "2016 Texas A&M" — confirmed via search: Tennessee blew a 21-point lead and lost 45-38 in double overtime at Texas A&M on Oct. 8, 2016, a genuine, well-documented heartbreak loss. (The other three options check out: 2001 LSU SEC Championship Game loss 31-20 cost Tennessee a shot at the national title game; 2015 Arkansas was a 4-OT loss; 2019 Georgia State was a stunning home upset loss to a Sun Belt team.)
**Reason:** "2016 Georgia" is factually backwards — Tennessee **won** that game 34-31 on Jauan Jennings's last-play Hail Mary from Joshua Dobbs, one of the most celebrated wins (not losses) in recent program history. Offering a famous win as a "heartbreaking loss" option is a hard factual error, not a phrasing nitpick, and undermines the whole poll.
**Status:** ⏳ pending review

### daily_polls.6ed3438a-b297-46e8-8753-d690aa575cdc — 2026-09-07 — one option not parallel to the other three
**Current:** "What is the best Lady Vols basketball season since Pat Summitt?" A "A Holly Warlick season", B "A Kellie Harper season", C "A Kim Caldwell season", D "The program is still rebuilding"
**Suggested fix:** Replace D with a genuine specific-season choice parallel in kind to A-C (e.g. call out a specific notable season/run, such as Kellie Harper's Elite Eight/Sweet 16 seasons or a specific Caldwell-era highlight), rather than a meta commentary/opinion option about program state.
**Reason:** §33 — options should be distinct and parallel; A-C are each a coach-era pick answering "which season," while D isn't a season choice at all, it's a hedge/opinion statement that undermines the premise of the question (that there is a "best" season to pick).
**Status:** ⏳ pending review — flagged as uncertain on exact replacement wording

### Low-priority / informational notes
- **Thematic overlap, not a duplicate:** Todd Helton is the subject of two separate hard-difficulty trivia questions within this 4-day window — `9d6f33a0` (2026-09-06 slot 5, his Tennessee jersey number) and `2450363a` (2026-09-08 slot 5, his 2000 NL statistical titles). Both facts are independently accurate and distinct (verified: he wore #3 at Tennessee; he led the NL in batting average (.372) and RBI (147) in 2000), so this isn't a content-accuracy problem, just a repeated-subject note similar to the 1998-season overlap flagged on 2026-09-01. No fix proposed.
- **`2450363a` (2026-09-08 slot 5, Todd Helton 2000 stat category) — minor distractor quality:** Options include "Saves" and "Strikeouts" (option_b, option_c) alongside the correct "Batting average and RBI" (option_d) and "Stolen bases" (option_a). Saves/strikeouts are pitching categories, and Helton is a first baseman, so a fan who simply knows his position can eliminate two of the four options without knowing anything about his 2000 season specifically. Low priority — the correct answer itself is verified accurate (led NL in both batting average and RBI in 2000).

**Run notes:** Sources checked this pass: 247Sports, Rocky Top Talk, CBS Sports (Grant Williams/Purdue box score and stats); On3, WATE (Tennessee's No. 1 ranking history); UTSports (Grant Williams bio); Wikipedia, ESPN, SI, Bleacher Report (Deon Grant; Todd Helton; 2001 SEC Championship Game LSU 31-20; Peerless Price 1999 draft, 2nd round/Buffalo Bills; Robert Neyland 173-31-12 career record; Pat Summitt Naismith HOF induction, Oct. 13, 2000; Zakai Zeigler all-time steals leader, 251; Tennessee-Georgia 2016 Hail Mary win 34-31; Tennessee-Texas A&M 2016 2OT loss 45-38); Baseball-Reference/BR Bullpen/SABR (Todd Helton 2000 NL-leading batting average and RBI). Could not independently confirm: a specific Tennessee-Vanderbilt NCAA Tournament postseason meeting (trivia `02c9eaf9`), or a second Tennessee SEC Sixth Man of the Year winner beyond Lamonté Turner 2018 (trivia `af17891c`) — both logged above as flagged/uncertain per guardrails rather than guessed at.
**Status:** ⏳ pending review — all items above remain unresolved pending David's action
