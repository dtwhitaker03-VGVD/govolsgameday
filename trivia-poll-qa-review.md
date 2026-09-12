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

## 2026-09-11 — run summary
- Checked: trivia 2026-09-11 to 2026-09-14 (20 rows, 5 slots × 4 days — full coverage, no gaps), polls 2026-09-11 to 2026-09-14 (4 rows — full coverage, no gaps)
- Issues found: 9 (5 substantive content issues + 4 informational/low-priority notes)
- Verified independently: the 2026-09-10 slot 3 fix David made directly (Kim Caldwell coaching-style question, `trivia_questions.230b0c07-7bbf-4e9d-b34c-259dd79c4f57`) is **confirmed resolved** — queried the row directly; option_b now reads "A modest tweak while keeping the same half-court, post-oriented sets" exactly as described, replacing the old self-eliminating "No change at all from the Summitt era." No further action needed on this row; note it's now outside the 3-day scope (2026-09-11 to 09-14) going forward.
- WebSearch was available this run and was used to verify several factual claims below rather than guess from memory. Sources: Wikipedia/ESPN (Tennessee–UConn rivalry history), Wikipedia/utsports.com (SEC basketball championship history), 247Sports/On3/Rocky Top Insider (Dylan Sampson 2024 rushing record), utsports.com/247Sports/AOL (Lane Kiffin's 2008 introductory presser), utsports.com (Grant Williams' 2019 Naismith DPOY watch list), Bleacher Report/SABR (R.A. Dickey's 1996 draft/UCL story).
- Facts checked and **confirmed accurate** (no issue): 2026-09-11 slot 1 (Holly Warlick succeeded Summitt in 2012); slot 4 (Tennessee's first outright SEC title was 1935-36, in the 1930s); slot 5 (Dylan Sampson broke Travis Stephens' 2001 record — 23 years — in the 2024 finale at Vanderbilt); 2026-09-12 slot 1 (Summitt became head coach at 22); slot 4 (R.A. Dickey, 18th overall to Texas Rangers in 1996, missing UCL found on physical); slot 5 (Summitt's career record 1,098–208); 2026-09-14 slot 5's correct answer (Grant Williams was on the 2019 Naismith Defensive POY watch list/semifinalist).

### trivia_questions.cd1d1634-911f-4720-97e1-71d5b14eb1a9 — 2026-09-11 / slot 3 — correct answer is a vague hedge that soft-pedals the real, well-documented cause
**Current:** Q: "...before the series resumed in 2020. What is commonly cited as the underlying cause?" Correct answer B: "A reported dispute between the two programs over scheduling and other issues"
**Suggested fix:** Replace option B with a specific, verifiable statement of the actual cause, e.g. "A recruiting dispute — Pat Summitt accused UConn of improper conduct during the two schools' battle for recruit Maya Moore." Keep it as the correct answer (B).
**Reason:** §32 prohibits hedge/non-answers as the correct answer. "Scheduling and other issues" is vague filler that avoids the actual, widely reported cause (the 2007 Maya Moore recruiting battle and Summitt's formal complaint accusing Auriemma of improper recruiting tactics, per ESPN's retrospective). As written it reads like it's dodging the real answer rather than stating a single defensible fact.
**Status:** ⏳ pending review

### trivia_questions.87810114-6e6e-4a24-bc97-06c4de5f495c — 2026-09-13 / slot 5 — two factual errors in the question stem
**Current:** "Which Tennessee coach's introductory press conference in 2009 featured a widely mocked comment about singing 'Rocky Top' on the road while recruiting?"
**Suggested fix:** "Which Tennessee coach's introductory press conference in December 2008 featured a widely mocked promise to sing 'Rocky Top' all night after beating Florida?"
**Reason:** §32 factual accuracy. Verified via utsports.com/247Sports/AOL: Lane Kiffin's introductory presser was December 1, **2008**, not 2009. The actual quote was about singing Rocky Top after beating Florida ("in the Swamp"), not about singing it "on the road while recruiting" — that framing doesn't match the documented quote. The correct answer (Lane Kiffin) itself is right, but the question stem has two factual errors.
**Status:** ⏳ pending review

### trivia_questions.9c2de16a-6f71-42db-bb98-b865f83f3d6d — 2026-09-13 / slot 4 — self-eliminating distractor that just negates the question's premise
**Current:** Q: "Which junior-college and mid-major stops did Dalton Knecht play at before transferring to Tennessee...?" Option C: "He was a Tennessee native recruit, with no transfer"
**Suggested fix:** Replace option C with a plausible-but-wrong pair of actual JC/mid-major schools (matching the format of the correct answer, "Northeastern JC and Northern Colorado"). I'm not confident enough in a specific alternate real school pairing to propose exact replacement text without further verification — flagging the defect and recommending the content team swap in a real JC+mid-major pair.
**Reason:** §32 — option C doesn't answer the question in the format the other three do; it just contradicts the question's own premise (that a transfer happened), making it trivially eliminable without any Dalton Knecht-specific knowledge, similar to the "Not applicable"/non-answer pattern flagged repeatedly in the 2026-09-01 pass.
**Status:** ⏳ pending review — flagged as uncertain on exact replacement wording

### trivia_questions.d9188989-3e3a-48b0-b25c-efde5c21b3e5 — 2026-09-14 / slot 4 — 3 of 4 options are non-answers, not real comparisons
**Current:** Q: "Pat Summitt's 1997-98 undefeated team is often compared... to which program's later perfect seasons?" A "The comparison is always to a men's team", B "UConn's various undefeated championship seasons" (correct), C "No other team has ever gone undefeated" (factually false), D "Not applicable"
**Suggested fix:** Replace A, C, D with real programs known for perfect seasons, e.g. A "Baylor's undefeated 2011-12 national championship team", C "Indiana's undefeated 1975-76 men's national championship team", D "Texas's undefeated 1985-86 national championship team". (These are strong recollections, not independently re-verified this run — please confirm exact records before publishing.) Keep B as correct.
**Reason:** §32 — three of four options are non-answers/self-eliminating rather than real teams, and C is an outright false claim (other teams, including UConn itself, have gone undefeated) rather than a plausible distractor. Same broken pattern flagged repeatedly in the 2026-09-01 pass.
**Status:** ⏳ pending review — replacement options are a confident recollection but not re-verified this run; flagged for confirmation

### trivia_questions.5786a59c-53e6-4323-8bf2-5666b890a5f8 — 2026-09-14 / slot 5 — 3 of 4 options are non-answers, not real player names
**Current:** A "No Tennessee player has ever been recognized nationally for defense", B "This recognition doesn't exist", C "Only offensive awards have gone to Vols", D "Grant Williams" (correct)
**Suggested fix:** Replace A, B, C with real Tennessee Rick Barnes-era player names, e.g. A "Josiah-Jordan James", B "Santiago Vescovi", C "Jahmai Mashack". Keep D as correct.
**Reason:** §32 — same non-answer/self-eliminating pattern as d9188989 above; three of four options don't even attempt to be a player name, so the question is trivially solvable by format alone. The correct answer itself (Grant Williams, 2019 Naismith DPOY watch list/semifinalist) is verified accurate.
**Status:** ⏳ pending review

### General note — Rick Barnes "introductory press conference" defense/toughness claim unverified
**Current:** trivia 2026-09-14 slot 3 — "Which Tennessee coach's introductory remarks upon hiring emphasized a 'toughness and defense first' program identity that has largely held true?" Correct answer: Rick Barnes.
**Suggested fix:** No confident fix proposed. The general characterization (Barnes-era Tennessee basketball = elite defense/toughness identity) is well supported by many in-season quotes, but I could not find a source confirming this specific framing was said at his *introductory* press conference specifically, as opposed to being a theme that emerged over his tenure. Recommend the content team either confirm against his actual 2015 introductory presser transcript or soften "introductory remarks upon hiring" to something like "tenure" or "early years" that doesn't hinge on one specific press event.
**Reason:** §32 factual accuracy — flagging as uncertain per guardrails rather than asserting confidence I don't have.
**Status:** ⏳ pending review — flagged as uncertain (unverified specific claim)

### General note — heavy Pat Summitt/Lady Vols thematic concentration across the window
**Current:** 2026-09-11 slot 1 (who succeeded Summitt), 2026-09-12 slot 1 (Summitt's hiring age), 2026-09-12 slot 5 (Summitt's career record), and 2026-09-14 slot 4 (Summitt's 1997-98 undefeated team) are all Summitt/Lady-Vols-centric — 4 of 20 questions in the window.
**Suggested fix:** No change required — each is a distinct fact (succession, age, record, undefeated-season comparison), not a duplicate. Flagging only as thematic overlap; consider spacing Summitt-themed questions further apart in future scheduling, consistent with the similar note logged 2026-09-01.
**Reason:** §32 duplicate/near-duplicate check — judged not a violation, but noted for awareness.
**Status:** ⏳ pending review (informational only)

### General note — minor: "undersized" descriptor for Jarnell Stokes is borderline
**Current:** trivia_questions.0ccebf79 — 2026-09-11 slot 2 — "Which undersized but tough forward was a breakout star during the 2014 Sweet 16 run..." (Jarnell Stokes, listed around 6'8"/260 lbs)
**Suggested fix:** No change required — defensible since Stokes was undersized relative to the true centers he often matched up against in the post, even if not undersized for a forward generally. Low priority, flagging only for awareness.
**Reason:** §32 factual accuracy — borderline characterization, not a clear error.
**Status:** ⏳ pending review (informational only, no fix proposed)

### General note — minor: poll option not fully parallel in kind
**Current:** daily_polls.9b73b6c2 — 2026-09-11 — "What is the greatest win in Tennessee football history?" Option A "1998 National Championship" (a season/title) alongside B/C/D which are each a single specific game ("1986 Sugar Bowl," "2016 comeback vs Georgia," "2022 Alabama upset").
**Suggested fix:** No change required — defensible as shorthand for the Fiesta Bowl win that clinched the 1998 title. Low priority, flagging only for awareness, similar in kind to the "not fully parallel option" note logged for the 2026-09-03 poll.
**Reason:** §33 — options should be distinct and parallel in kind; this is a soft case, not a clear violation.
**Status:** ⏳ pending review (informational only, no fix proposed)

**Status:** ⏳ pending review — all items above remain unresolved pending David's action; the 2026-09-10 slot 3 fix noted above is the only recently-resolved item
