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

## 2026-09-07 — run summary
- Checked: trivia 2026-09-07 to 2026-09-10 (20 rows, 5 slots × 4 days), polls 2026-09-07 to 2026-09-10 (4 rows, full coverage)
- Issues found: 9 new
- **Log discrepancy note:** I was briefed that a 2026-09-06 pass had already logged outstanding issues for 2026-09-08 and 2026-09-09 (including a high-priority poll error on the 2016 Georgia game). This file contains no 2026-09-06 section — the most recent prior entries are dated 2026-09-01 and cover 2026-09-01 through 2026-09-04 only, outside this run's window. Rather than take the briefing's claims on faith, I independently re-derived the full QA picture for 09-07–09-10 from the live database and web verification below. The 2016 Georgia issue described in the briefing does check out (see below) and is logged here for the first time in this file.

**2026-09-07 fixes verification (per David's direct edits) — all confirmed correct, independently checked:**
- Slot 1 (`72c5d746`, Smokey's breed): Bluetick Coonhound — confirmed correct; this is the well-established breed of UT's live mascot.
- Slot 2 (`9b43a18e`, Chamique Holdsclaw / 1997-98 team): unchanged from prior clean state — confirmed correct (Holdsclaw was the star of the undefeated 1997-98 national championship Lady Vols).
- Slot 3 (`02c9eaf9`, Tennessee baseball's first CWS title): **2024 — confirmed.** Tennessee beat Texas A&M 6-5 in the MCWS Finals for the program's first-ever national baseball title (per UTSports.com, CBS Sports, Baseball America).
- Slot 4 (`b8b28be3`, Neyland's career win total): **173 wins across 21 seasons — confirmed** (173-31-12 record, per Sports-Reference/CFB Hall of Fame). "Around 140" is now a plausible, non-self-eliminating distractor next to 173 (a real improvement over the old "Around 50").
- Slot 5 (`af17891c`, 2018 SEC Co-Sixth Man of the Year): **Lamonte Turner — confirmed.** Turner (Tennessee) and Jontay Porter (Missouri) were voted SEC Co-Sixth Man of the Year for 2018 (per SEC/secsports.com 2018 awards release).
- Poll (`6ed3438a`, best Lady Vols season since Summitt): 3 parallel coach-era options (Warlick/Harper/Caldwell), `option_d` null — structurally clean, no factual claims to verify. No issue.

All five 09-07 trivia slots and the 09-07 poll are resolved and clean **except** one categorization slip introduced alongside the slot 1 fix (see below) — flagging that as new rather than re-litigating the content itself, which is solid.

### trivia_questions.72c5d746-3288-46fd-90ee-b8c31450144c — 2026-09-07 / slot 1 — category no longer matches question content
**Current:** `category` = "Vol Baseball History" for the question "What breed of dog is Smokey, Tennessee's live mascot shared across all Vol sports?"
**Suggested fix:** Change `category` to "General Vol Athletics" (Smokey is explicitly described in the question itself as shared across all Vol sports, not baseball-specific).
**Reason:** §32 category-accuracy check. This looks like a leftover from whatever the slot originally held before David's in-conversation replacement swapped the question/options but not the category field.
**Status:** ⏳ pending review

### trivia_questions.acc835b5-c3a6-4a91-8500-21d8e56d0543 + trivia_questions.9cda3391-a7ca-4d18-a378-b300e5454479 — 2026-09-08 slot 1 & 2026-09-10 slot 1 — duplicate question within the 3-day window
**Current:** 09-08 slot 1: "Before divisions were eliminated, Tennessee played in which grouping of the SEC alongside Florida, Georgia, Kentucky, South Carolina, and Vanderbilt?" (category "SEC Knowledge") — Answer: SEC East. 09-10 slot 1: "Which division did Tennessee play in before the SEC eliminated divisions in 2024?" (category "Vol Football History") — Answer: SEC East.
**Suggested fix:** Keep 09-08 slot 1 as-is; fully replace 09-10 slot 1 with a different easy-difficulty fact (same category or reassign — up to the content team, since picking a good verified replacement fact needs editorial judgment I'd rather not guess at under this guardrail).
**Reason:** §32 duplicate/near-duplicate check — both rows ask the exact same underlying fact ("what division was Tennessee in before 2024 realignment") within the same 3-day window, just reworded.
**Status:** ⏳ pending review — flagging the duplicate; not proposing specific replacement text for 09-10 slot 1

### trivia_questions.2450363a-a0ef-453d-a976-663806d0bb12 — 2026-09-08 / slot 5 — distractors are wrong stat-type for the player, undermines "hard" difficulty
**Current:** "Which stat category did [Todd Helton] lead the National League in during his peak 2000 season?" A "Stolen bases", B "Saves", C "Strikeouts", D "Batting average and RBI" (correct)
**Suggested fix:** Replace B "Saves" and C "Strikeouts" (pure pitching stats — nonsensical for a first baseman, and self-eliminating to anyone who knows Helton was a hitter) with plausible hitting-stat categories Helton did *not* lead the NL in that year, e.g. "Home runs" and "Stolen bases" (keeping a real number-based option in place of A too). Underlying fact is confirmed accurate: Helton led the NL in 2000 with a .372 average and 147 RBI (also OBP, slugging, hits, doubles — per Baseball Hall of Fame/SABR), so "Batting average and RBI" as the correct answer is factually solid.
**Reason:** §32 — self-eliminating distractors (pitcher-only stats attached to a position player) plus a difficulty mismatch for a "hard" slot, since two of four options can be discarded on category alone without any specific knowledge. Also note the correct answer's compound format ("Batting average and RBI") is structurally inconsistent with the single-stat distractors — flagging for awareness, not a hard blocker.
**Status:** ⏳ pending review

### daily_polls.0e29a73e-0f9a-47d2-b823-6b938f1de09b — 2026-09-08 — factual error: 2016 Georgia game was a win, not a loss
**Current:** "What is the most heartbreaking loss in Tennessee football history?" options include C "2016 Georgia"
**Suggested fix:** Replace option C with an actual Tennessee loss commonly cited as a heartbreaker — e.g. "2015 Oklahoma" (Tennessee blew a 17-0 lead and lost 31-24 in overtime) is a reasonable candidate, but I'd recommend the content team confirm the exact replacement rather than take my suggestion as final, since I'm moderately (not fully) confident on that specific game's details.
**Reason:** §33 factual accuracy — confirmed via search (ESPN, SEC Sports, WBIR): on Oct 1, 2016, Tennessee beat Georgia 34-31 on a last-play Jauan Jennings Hail Mary from Josh Dobbs — one of the program's signature dramatic **wins**, not a loss. Listing it as a "loss" option in a "most heartbreaking loss" poll is a factual error, not just a framing issue. High priority — this is user-facing and plainly wrong to any knowledgeable Vol fan.
**Status:** ⏳ pending review — high priority

### trivia_questions.6ffeaf02-6c48-49cc-a93a-92ce4f2c51bf — 2026-09-09 / slot 1 — hedge/vague correct answer
**Current:** "How many times has the program reached the Elite Eight overall through the mid-2020s?" A "Zero times ever", B "A small handful of times" (correct), C "Every year since 2000", D "Over 20 times"
**Suggested fix:** Replace option B's text with the specific number: "Three times" (confirmed: 2010, 2024, 2025 — per UTSports.com/CBS Sports). Keep `correct_answer` as B.
**Reason:** §32 explicitly prohibits hedge/non-answers as the correct answer — "a small handful of times" is vague where a crisp number is knowable and current as of this question's own "mid-2020s" framing.
**Status:** ⏳ pending review

### trivia_questions.3d90e41c-e8fb-487f-82f8-ac45a716f216 — 2026-09-09 / slot 2 — non-answer distractors for a "Who" question
**Current:** "Who has held that role since 2015?" A "The commissioner role was eliminated", B "Greg Sankey" (correct), C "Not applicable", D "False, the SEC has no commissioner"
**Suggested fix:** Replace A/C/D with real, plausible person names instead of true/false-style non-answers — e.g. A "Mike Slive" (SEC's actual previous commissioner, 2002-2015 — a strong, genuinely plausible distractor), C "Bill Hancock", D "Jim Delany". Confirmed correct answer: Greg Sankey has been SEC commissioner since June 2015.
**Reason:** §32 — none of the three wrong options are actually answers to "who" (they're leftover True/False-style filler), making them trivially eliminable on format alone regardless of Vol/SEC knowledge.
**Status:** ⏳ pending review

### trivia_questions.0caa8be2-80e4-4f2e-938a-35b47d596c04 — 2026-09-09 / slot 4 — meta-commentary in option text + broken True/False structure
**Current:** "...True or false?" A "Only Tennessee players have won the Heisman within the SEC (false — no Tennessee player has won it)", B "Not applicable", C "True" (correct), D "The SEC has never had a Heisman winner"
**Suggested fix:** Restructure as a genuine 2-option True/False (option_a "True", option_b "False", option_c/option_d null, correct_answer "A"), or convert to a standard 4-option factual question with real plausible distractors. At minimum, strip the parenthetical "(false — no Tennessee player has won it)" from option A regardless of which fix is chosen — it tells the test-taker the answer.
**Reason:** §32 — this is the same recurring defect pattern logged repeatedly in the 2026-09-01 entries (meta-commentary/draft-reasoning bleeding into option text, e.g. `08ef515f`, `c3440429`; broken True/False structure with no clean False option, e.g. `a221e816`, `4bc04229`). It's resurfaced here nearly identically — the parenthetical literally spells out the answer.
**Status:** ⏳ pending review

### trivia_questions.230b0c07-7bbf-4e9d-b34c-259dd79c4f57 — 2026-09-10 / slot 3 — minor: non-answer distractor
**Current:** Options include D "Not applicable"
**Suggested fix:** Replace with a real, plausible-but-wrong characterization, e.g. "A return to a slower, more physical, defense-first system" (which is actually the opposite of what happened, making it a good distractor).
**Reason:** §32 distractor quality — "Not applicable" is a non-answer, same low-priority recurring issue noted elsewhere in this log. Low priority.
**Status:** ⏳ pending review

### trivia_questions.3164cb4d-0856-4a3b-922f-9d74ecdcdc68 — 2026-09-10 / slot 5 — Vol/SEC scope violation: pure rival-team trivia with no Tennessee connection
**Current:** "Vanderbilt's baseball program won its first College World Series championship in which year, defeating Virginia?" (category "SEC Knowledge") A "2020", B "2005", C "1995", D "2014" (correct)
**Suggested fix:** Full replacement recommended (same category "SEC Knowledge", same slot 5/hard difficulty) with a question that has an actual Tennessee angle, per the role definition's own worked example (OK: "Who won the 2018 SEC Championship game?" — NOT OK: "Who was Alabama's starting QB in 2018?"). I'm not proposing specific replacement text since picking a good verified hard-difficulty fact needs editorial judgment.
**Reason:** This question is entirely about Vanderbilt's own baseball history with zero Tennessee tie-in — the same category of violation the role file explicitly calls out as not OK, just with Vanderbilt instead of Alabama. (Underlying fact is itself accurate — confirmed via Washington Post/SI: Vanderbilt beat Virginia 3-2 on June 25, 2014 for its first CWS title — so this is purely a scope issue, not a factual-accuracy one.)
**Status:** ⏳ pending review

Sources checked this run: UTSports.com, CBS Sports, Baseball America, SI.com (2024 Tennessee baseball CWS title); Sports-Reference/CFB Hall of Fame (Neyland record); SEC Sports/secsports.com 2018 awards release (Lamonte Turner Co-Sixth Man); Saturday Down South/UTSports.com (Zeigler steals record); Naismith Hoop Hall/WATE (Summitt HOF induction); Pro-Football-Reference/footballdb.com (Peerless Price draft round); ESPN/SEC Sports/WBIR (2016 Tennessee-Georgia result); Washington Post/SI.com (Vanderbilt 2014 CWS title); Baseball Hall of Fame/SABR (Todd Helton 2000 NL leaders); UTSports.com/CBS Sports (Tennessee Elite Eight appearances).
**Status:** ⏳ pending review — all items above are new proposals pending David's action; the 5 trivia slots and poll for 2026-09-07 that David edited directly are confirmed resolved and are not re-flagged (except the one category-field slip noted above)
