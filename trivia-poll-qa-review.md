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

## 2026-09-05 — run summary
- Checked: trivia 2026-09-05 to 2026-09-08 (20 rows, 5 slots × 4 days), polls 2026-09-05 to 2026-09-08 (4 rows, full coverage — the 09-04 scheduling gap noted in the earlier pass is now out of this run's window and no longer checked)
- Issues found: 9 new
- Previously-flagged items for 2026-09-01 through 09-04 are out of this run's 3-day scope and were not re-checked; they remain as logged above.

### David's 2026-09-05 fixes — independently re-verified, all four now resolved
David edited all 5 trivia rows for 2026-09-05 directly in conversation since the last logged pass (which predates this file's first 2026-09-05 coverage — there is no prior dated entry for 09-05 to compare against, so this section documents first-time verification of the current row content, per his summary of what changed):
- **Slot 1** (`df9458f8-9e11-4de2-a32e-b7b087141e57`, Allan Jones Aquatic Center → Swimming and diving): confirmed clean, no issues.
- **Slot 2** (`0d245c5d-d1d2-45c6-8f0b-db69836e9033`): option A now reads simply "Bruce Pearl" with no meta-commentary — confirmed trimmed as described. Question ("elite defensive rankings" → Rick Barnes) checks out; Barnes' Tennessee teams are widely known for top-tier national defensive rankings. **Resolved.**
- **Slot 3** (`c0dc66dd-0241-4fec-b597-eba580e35f36`): now reads "Which Tennessee coach introduced the checkerboard end zones in 1964?" correct answer Doug Dickey, distractors Robert Neyland / Phillip Fulmer / Johnny Majors — **independently verified via WebSearch: confirmed accurate.** Dickey became head coach in 1964 and introduced the orange-and-white checkerboard end zone design that year (debuted Oct. 10, 1964 vs. Boston College), per UTSports.com, Wikipedia, and Saturday Down South. All three distractors are real, plausible Tennessee coaches — no self-eliminating options. **Resolved, no remaining concerns.**
- **Slot 4** (`ee9c3e59-33da-4d60-b692-1c56001a34e7`): now reads "#2 seed" (was "#1 seed"). **Independently verified via WebSearch: confirmed accurate.** Tennessee was the #6 seed and beat #2-seed Ohio State 76-73 in the 2010 Sweet 16 (Midwest Region, March 26, 2010) en route to the Elite Eight, per ESPN box score and NCAA.com tournament records. **Resolved.**
- **Slot 5** (`48d5a693-7ca7-4672-a231-6c4e3fe5912d`, SEC Championship location → Atlanta): unchanged, confirmed still clean. The earlier low-priority "too easy for a hard slot" note from a prior pass still applies as an observation only — no content fix was requested and none is proposed here.
- Poll `d6d1e48a-46c5-4f22-abf5-21149b416de3` (2026-09-05, "What would a Vol basketball national championship mean to you?"): unchanged, confirmed still clean.

### trivia_questions.95da837e-c366-4c42-8e12-b62242b28a7d — 2026-09-06 / slot 2 — question stem gives away its own answer
**Current:** Q: "Grant Williams scored a team-high total in Tennessee's 2019 Sweet 16 overtime loss to Purdue. Did Tennessee ultimately win that game?" A "The game ended in a tie", B "No, Purdue won in overtime despite Williams' strong performance" (correct), C "Tennessee won in double overtime", D "Yes, Tennessee won in regulation"
**Suggested fix:** Rewrite as a substantive fact question that doesn't restate its own answer, e.g. "How many points did Grant Williams score in Tennessee's 2019 Sweet 16 overtime loss to Purdue?" with his real point total as the correct answer and plausible nearby point totals as distractors. If keeping an outcome-based question, drop "loss to Purdue" from the stem so the outcome isn't pre-revealed.
**Reason:** The stem already states it was a "loss," so asking "did Tennessee ultimately win?" answers itself — trivially guessable with zero basketball knowledge. Also a yes/no frame with narrative-filler options rather than parallel factual answers, similar to the broken True/False pattern logged in the 2026-09-01 run.
**Status:** ⏳ pending review

### trivia_questions.024a94ee-08c9-41a8-848a-a78b853ffd05 — 2026-09-06 / slot 4 — two factual errors (class year, "first" ranking claim)
**Current:** Q: "Which Tennessee player's breakout sophomore season, in 2018-19, coincided with the program's first #1 ranking?" A "Sophomores are ineligible", B "No sophomore has ever started for Tennessee", C "Grant Williams' sophomore breakout coincided with the team's rise to #1" (correct), D "Only seniors play meaningful minutes"
**Suggested fix:** Two corrections needed: (1) 2018-19 was Grant Williams' **junior** season, not sophomore — he was a sophomore in 2017-18; (2) it was **not** the program's first-ever #1 ranking — Tennessee had previously been ranked #1 in 2008, so 2018-19 was Tennessee's first #1 ranking *since 2008*. Suggested rewrite: "Which Tennessee player's breakout junior season, in 2018-19, coincided with the program's first #1 ranking since 2008?" correct answer "Grant Williams", with real player names as distractors (e.g. Admiral Schofield, Jordan Bone, Lamonte Turner) instead of the current meta-statement options.
**Reason:** §32 factual accuracy — verified via WebSearch (CBS Sports 2018-19 game coverage confirms junior season; multiple sources confirm Tennessee's prior #1 ranking was in 2008). Also carries the same non-parallel/self-eliminating distractor defect as other flagged rows (options are eligibility statements, not player names).
**Status:** ⏳ pending review — high confidence on both factual corrections; recommend prioritizing given this airs in 1 day (2026-09-06)

### trivia_questions.72c5d746-3288-46fd-90ee-b8c31450144c — 2026-09-07 / slot 1 — broken True/False structure
**Current:** "...True or false?" A "False, baseball has a separate mascot", B "Baseball has no mascot", C "True" (correct), D "Not applicable"
**Suggested fix:** Restructure as a genuine 2-option True/False (option_a "True", option_b "False", option_c/option_d null, correct_answer "A"), or convert to a standard 4-option factual question with real plausible distractors about Vol mascots/traditions.
**Reason:** Same structural defect logged repeatedly in the 2026-09-01 run (e.g. `a221e816`, `c3440429`, `4bc04229`) — no clean "False" option is ever offered; the other three are narrative filler/non-answers.
**Status:** ⏳ pending review

### trivia_questions.02c9eaf9-8527-44c1-8555-ba86a373372b — 2026-09-07 / slot 3 — hedge/non-answer as the correct answer
**Current:** Q: "...Has this rivalry included postseason (NCAA Tournament) meetings in recent years?" A "It's plausible given both programs' postseason frequency, though the exact matchup history should be checked against official NCAA brackets" (correct), B "They have never met in the postseason", C "Not applicable", D "They are barred from meeting in the postseason due to conference rules"
**Suggested fix:** Full replacement recommended. The correct answer as written literally tells the player to go verify elsewhere rather than stating a fact. Replace with a specific, checkable question, e.g. naming an actual year Tennessee and Vanderbilt baseball met in the NCAA Tournament as the correct answer, with other plausible years as distractors. I did not confirm a specific matchup/year in this pass — recommend the content team source one concrete meeting before publishing rather than guessing.
**Reason:** This is the exact "no hedge/non-answers as the correct answer" violation called out explicitly in the QA checklist §32 — not a borderline case.
**Status:** ⏳ pending review — high priority; airs in 2 days (2026-09-07)

### trivia_questions.b8b28be3-2577-44da-80cf-32017be7a682 — 2026-09-07 / slot 4 — minor: implausible distractor
**Current:** Options A "Around 50", B "Around 90", C "Around 250", D "173" (correct)
**Suggested fix:** Replace A ("Around 50") with a closer, more plausible figure (e.g. "Around 140").
**Reason:** Correct answer verified accurate via WebSearch — Robert Neyland's career record was 173-31-12 across 21 seasons. "Around 50" wins over 21 seasons at a major program is implausibly low and easily eliminated without any real knowledge. Low priority.
**Status:** ⏳ pending review — low priority

### trivia_questions.af17891c-7852-42dd-94e8-0475cdc5db24 — 2026-09-07 / slot 5 — meta/structural question, not a substantive fact test
**Current:** Q: "...Is this award given annually by the conference?" A "Only starters are eligible", B "The award doesn't exist in the SEC", C "Yes, it is an annual SEC honor" (correct), D "No Tennessee player has won this award"
**Suggested fix:** Replace with a genuine, checkable trivia fact — e.g. name an actual Tennessee SEC Sixth Man of the Year winner and ask which player won it, with real Tennessee players as distractors — instead of a meta yes/no question about the award's existence/frequency.
**Reason:** Same structural pattern as other flagged rows — the "correct" answer is a statement about award mechanics rather than a substantive fact, and the distractors are absurd/non-parallel (not real player names or plausible facts).
**Status:** ⏳ pending review

### trivia_questions.2450363a-a0ef-453d-a976-663806d0bb12 — 2026-09-08 / slot 5 — minor: self-eliminating distractor
**Current:** Options A "Stolen bases", B "Saves", C "Strikeouts", D "Batting average and RBI" (correct)
**Suggested fix:** Replace B "Saves" with a plausible hitting stat Helton didn't lead the NL in that year (e.g. "Home runs").
**Reason:** "Saves" is a pitching stat and self-eliminating for a question about a first baseman's batting season. Underlying fact confirmed accurate via WebSearch — Helton led the NL in batting average (.372) and RBI (147) in 2000. Low priority.
**Status:** ⏳ pending review — low priority

### daily_polls.a94a824a-1843-435d-9faa-3a4ef7454e11 — 2026-09-06 — overlapping/non-exclusive options
**Current:** "What is the best Vol football game you personally attended?" A "Alabama game", B "Florida game", C "A bowl game", D "A night game at Neyland"
**Suggested fix:** Make the four options mutually exclusive — e.g. replace D with something that can't overlap with A-C (such as "A game against another SEC East rival"), or otherwise ensure no single real game could satisfy two of the four options at once.
**Reason:** §33 — options must be distinct/non-overlapping. A fan's favorite Alabama or Florida game could easily also be "a bowl game" or "a night game at Neyland," so respondents can't cleanly pick one.
**Status:** ⏳ pending review

### daily_polls.6ed3438a-b297-46e8-8753-d690aa575cdc — 2026-09-07 — non-parallel hedge option
**Current:** "What is the best Lady Vols basketball season since Pat Summitt?" A "A Holly Warlick season", B "A Kellie Harper season", C "A Kim Caldwell season", D "The program is still rebuilding"
**Suggested fix:** Replace D with a genuine parallel option (a specific season/coach-tenure choice), or drop to 3 options (set option_d to null) since A/B/C already form a complete, parallel set of the three post-Summitt coaches.
**Reason:** §33 — D is an opinion/hedge statement, not parallel in kind to A/B/C (each of which names "a season under coach X"); it's a non-answer similar to the "Not applicable" pattern flagged in prior trivia rows.
**Status:** ⏳ pending review

### Verified clean — no issues found
- `060c925f` (2026-09-06 slot 1, volleyball as fall sport): accurate, no issue.
- `5b7bd78c` (2026-09-06 slot 3, Deon Grant / 1998 secondary): verified via WebSearch — Grant started at free safety as a sophomore in 1998, had a key interception in the OT win over Florida, and went on to a 12-year NFL career (Panthers/Jaguars/Seahawks/Giants). Accurate.
- `9d6f33a0` (2026-09-06 slot 5, Todd Helton #3 first retired number): verified via WebSearch — Helton's #3 was retired by Tennessee baseball on Jan. 30, 2008, confirmed as the first number the program ever retired. Accurate.
- `9b43a18e` (2026-09-07 slot 2, Chamique Holdsclaw / 1997-98 team): accurate — Holdsclaw was the acknowledged star of the 39-0 title team. (Minor aside: Tamika Catchings, listed as a distractor, was actually a freshman role player on that same roster, but Holdsclaw remains the unambiguous correct "star" — not treated as an issue.)
- `acc835b5`, `bcc84f0c`, `a5666ce8`, `a51e8763` (2026-09-08 slots 1-4: SEC East, Zeigler steals record, Summitt's 2000 Naismith induction, 2001 LSU SEC Championship Game): all verified via WebSearch, all accurate.
- Poll `0e29a73e` (2026-09-08, "most heartbreaking loss"): all four options (2001 LSU, 2015 Arkansas, 2016 Georgia, 2019 Georgia State) check out as real, well-documented Tennessee losses; the 2019 Georgia State date in particular was double-checked (confirmed 2019, not 2018) since it read as a plausible off-by-one-year risk. No issue.

Sources checked this run: UTSports.com, Wikipedia (Doug Dickey, 1964 Tennessee Volunteers football team, Robert Neyland, Deon Grant, Todd Helton), ESPN (2010 Tennessee-Ohio State box score), NCAA.com (2010 tournament bracket/records), CBS Sports (2018-19 Tennessee basketball game coverage), Saturday Down South (Zakai Zeigler steals record; Tennessee checkerboard history), Bleacher Report / Rocky Top Talk / WATE (2019 Georgia State upset).
**Status:** ⏳ pending review — all 9 new items above remain unresolved pending David's action
