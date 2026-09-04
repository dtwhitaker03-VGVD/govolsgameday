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

## 2026-09-04 — run summary
- Checked: trivia 2026-09-04 to 2026-09-07 (20 rows, 5 slots × 4 days), polls 2026-09-04 to 2026-09-07 (4 rows — the 09-04 gap flagged in the 09-01 run is now filled)
- Issues found: 9 new (8 content issues + 1 informational thematic-overlap note); plus 1 previously-flagged item carried forward as unverified rather than resolved (09-04 slot 4)
- 2026-09-04 fixes (made directly by David, outside this subagent) verified independently this run — see confirmations below.
- 2026-09-05 and 2026-09-06 have not been touched since the 2026-09-01 run; their previously-logged issues (in the section above, dated 2026-09-01) remain outstanding and are not repeated here. 2026-09-07 is newly in scope this run.

### 2026-09-04 fixes — verification of David's edits
All 5 trivia slots and the poll for 2026-09-04 were reviewed against §32/§33 and, where the fix introduced a new factual claim, checked against a web search.

- **Slot 1 (Nkamhoua)** — unchanged, confirmed still clean, no new issue.
- **Slot 2 (Georgia record)** — "Tennessee's all-time record against Georgia is 23-30-2" — **confirmed accurate.** Multiple sources (Yahoo Sports, Winsipedia) state Georgia leads the series 30-23-2 (Georgia's wins-losses-ties); expressed from Tennessee's side that is 23-30-2, matching the row exactly, and the "(Georgia leads)" framing is correct. Distractors (27-26-2 / 33-20-2 / 28-25-1) are all plausible win-loss-tie totals in the same range (54-55 total games) — not self-eliminating. **Resolved, no issue.**
- **Slot 3 (Shriners Showdown)** — **confirmed accurate.** The 2024 Shriners Children's College Showdown was held at Globe Life Field Feb 16-18, 2024; Tennessee beat Texas Tech 6-2 on Feb 16 (ESPN, FloBaseball, Texas Tech's own site). The "#18 Texas Tech" ranking is defensible: Baseball America's 2024 preseason Top 25 had Texas Tech at No. 18 (Texas Tech's own site headline at game time used a different poll, D1Baseball's No. 21 — both numbers exist in circulation depending on which preseason poll is cited, so "#18" is not an error, just one of two legitimate contemporaneous rankings). **Resolved, no issue.**
- **Slot 4 (international student-athletes)** — **could not verify.** Searched for an official UT Athletics or NCAA figure for "about 50 international student-athletes arrive at Tennessee each year, across all sports" and found no source stating this number (or any comparable figure) explicitly. This isn't confirmed wrong — it's simply unconfirmable with the tools available this run. Per the guardrail against proposing confident fixes for unverifiable claims, this is being flagged as **uncertain, not corrected**, rather than carried forward as resolved. Distractor set (5 / 50 / 150 / 300) is otherwise well-formed (no self-elimination, plausible spread). Recommend the content team either confirm this figure against a UT Athletics/international-student-services source before it airs, or swap in a fact you can source with confidence.
- **Slot 5 (Pat Summitt co-author)** — "Not applicable" replaced with "John Feinstein" — **resolved.** Feinstein is a real, well-known sports author known for co-writing books with coaches (e.g., Bob Knight), making him a plausible-but-wrong distractor rather than a non-answer. Correct answer Sally Jenkins (co-author of *Reach for the Summit* and *Sum It Up*) is accurate.
- **Poll (new 09-04 row)** — "What will the Vols record be this year?" (8-5 / 9-4 / 12-2 / 16-0) — **resolved**, gap is filled. Options are distinct, non-overlapping, not leading, and no factual claims to verify. No duplicate elsewhere in window.

**2026-09-04 is now fully resolved except slot 4, which is flagged uncertain (unverifiable numeric claim) rather than confirmed clean.**

### trivia_questions.0d245c5d-d1d2-45c6-8f0b-db69836e9033 — 2026-09-05 / slot 2 — meta-commentary in distractor
**Current:** "Which Tennessee coach's teams were especially known for elite defensive rankings nationally during his tenure?" A "Bruce Pearl, known more for offense and energy" (wrong), B "Don DeVoe", C "Ray Mears", D "Rick Barnes" (correct)
**Suggested fix:** Replace option A with just "Bruce Pearl" — drop the parenthetical-style editorializing clause.
**Reason:** §32 prohibits meta-commentary bleeding into option text. "known more for offense and energy" tells the test-taker why A is wrong, which is both a giveaway and a self-elimination issue — the same defect flagged repeatedly in the 2026-09-01 run (e.g. `f422496d`, `08ef515f`).
**Status:** ⏳ pending review

### trivia_questions.c0dc66dd-0241-4fec-b597-eba580e35f36 — 2026-09-05 / slot 3 — correct answer repeats a claim UT's own archive labels a myth
**Current:** "Tennessee's checkerboard end zone design was inspired by the clock tower atop which campus building?" ... C "Ayres Hall" (correct)
**Suggested fix:** Flagging for verification/replacement rather than proposing a confident fix — recommend either dropping this question or rewriting it around the actual sourced history (the checkerboard was adopted in 1964 under coach Doug Dickey, who said he got the idea from a magazine ad; Neyland-era motivational rhetoric about "reaching the checkerboard" on Ayres Hall's tower predates and is separate from the actual design decision).
**Reason:** §32 factual accuracy. UT's own library archive (Volopedia, volopedia.lib.utk.edu) has an entry titled "Myth—Checkerboard end zones were adopted to mirror the checkerboard design on Ayres Hall," explicitly debunking this as a popular myth, not the actual design origin. The question states the myth as settled fact.
**Status:** ⏳ pending review — flagged as uncertain/likely-incorrect (source directly contradicts the premise)

### trivia_questions.ee9c3e59-33da-4d60-b692-1c56001a34e7 — 2026-09-05 / slot 4 — wrong seed number
**Current:** "To reach the 2010 Elite Eight, Tennessee upset which #1 seed in the Sweet 16, winning 76-73?" A "Ohio State" (correct)
**Suggested fix:** Change "which #1 seed" to "which #2 seed" in the question text (option A "Ohio State" and the 76-73 score are correct as-is).
**Reason:** §32 factual accuracy. Ohio State was the #2 seed in the Midwest Region in the 2010 NCAA tournament (confirmed via 247Sports/Ohio State's own tournament history coverage), not a #1 seed. The result itself (Tennessee 76-73, first-ever Elite Eight appearance) is accurate and doesn't need to change.
**Status:** ⏳ pending review

### trivia_questions.95da837e-c366-4c42-8e12-b62242b28a7d — 2026-09-06 / slot 2 — question stem gives away the answer + weak distractor
**Current:** "Grant Williams scored a team-high total in Tennessee's 2019 Sweet 16 overtime loss to Purdue. Did Tennessee ultimately win that game?" A "The game ended in a tie", B "No, Purdue won in overtime despite Williams' strong performance" (correct), C "Tennessee won in double overtime", D "Yes, Tennessee won in regulation"
**Suggested fix:** Rewrite the stem so it doesn't already state the outcome — e.g. drop "loss to Purdue" from the setup (just "...in Tennessee's 2019 Sweet 16 overtime game against Purdue") — or better, convert to a real 4-option question about a distinct fact from that game (e.g. Williams' point total) rather than a yes/no wrapped as 4 options. Also replace option A ("tie") — not possible in an elimination tournament game, self-eliminating.
**Reason:** §32 — the question stem itself already says "loss to Purdue," so "Did Tennessee ultimately win?" is answered by the premise before the reader even looks at the options. This is the same yes/no-dressed-as-4-options pattern flagged repeatedly in the 2026-09-01 run (e.g. `4bc04229`, `c3440429`), plus a self-eliminating "tie" option.
**Status:** ⏳ pending review

### trivia_questions.024a94ee-08c9-41a8-848a-a78b853ffd05 — 2026-09-06 / slot 4 — factual error: wrong class year
**Current:** "Which Tennessee player's breakout sophomore season, in 2018-19, coincided with the program's first #1 ranking?" A "Sophomores are ineligible", B "No sophomore has ever started for Tennessee", C "Grant Williams' sophomore breakout coincided with the team's rise to #1" (correct), D "Only seniors play meaningful minutes"
**Suggested fix:** Change "sophomore" to "junior" in both the question stem and option C (Grant Williams enrolled 2016-17; 2017-18 was his sophomore breakout/first SEC Player of the Year season, and 2018-19 — when Tennessee reached #1 for the first time — was his junior year). Also replace the absurd/self-eliminating options A/B/D with real plausible names of other Tennessee players from that era (e.g. Admiral Schofield, Jordan Bone).
**Reason:** §32 factual accuracy — multiple sources (UTSports, 247Sports, Rocky Top Talk) confirm Williams was a two-time SEC Player of the Year, sophomore in 2017-18 and junior in 2018-19; 2018-19 was not his sophomore year. Also a structural issue: options A/B/D are nonsensical non-answers (self-eliminating), and correct answer C just restates the question — same "yes/no or restated-question dressed as 4 options" pattern flagged elsewhere in this file.
**Status:** ⏳ pending review

### General note — Grant Williams thematic overlap on 2026-09-06
**Current:** trivia 2026-09-06 slot 2 (Grant Williams' 2019 Sweet 16 game vs. Purdue) and slot 4 (Grant Williams' breakout season) both center on Grant Williams on the same date.
**Suggested fix:** No hard duplicate — different facts (a specific game vs. a season/ranking milestone) — but consider spacing same-player questions further apart within a day when scheduling; two of five slots on one date both keying off the same player is a notable concentration.
**Reason:** §32 duplicate/near-duplicate check — judged not a violation, but flagging for awareness, consistent with the informational note logged in the 2026-09-01 run for the 1998-season overlap.
**Status:** ⏳ pending review (informational only)

### trivia_questions.72c5d746-3288-46fd-90ee-b8c31450144c — 2026-09-07 / slot 1 — broken True/False structure
**Current:** "...True or false?" A "False, baseball has a separate mascot", B "Baseball has no mascot", C "True" (correct), D "Not applicable"
**Suggested fix:** Restructure as a genuine 2-option True/False (option_a "True", option_b "False", option_c/option_d null, correct_answer "A"), or convert to a standard 4-option factual question.
**Reason:** Same recurring structural defect flagged multiple times in this file (`a221e816`, `c3440429`, `4bc04229`) — no clean "False" option is actually offered; the other three options are absurd/non-parallel rather than a real alternative.
**Status:** ⏳ pending review

### trivia_questions.02c9eaf9-8527-44c1-8555-ba86a373372b — 2026-09-07 / slot 3 — hedge/non-answer as the correct answer (severe)
**Current:** "Tennessee and Vanderbilt... Has this rivalry included postseason (NCAA Tournament) meetings in recent years?" A "It's plausible given both programs' postseason frequency, though the exact matchup history should be checked against official NCAA brackets" (correct), B "They have never met in the postseason", C "Not applicable", D "They are barred from meeting in the postseason due to conference rules"
**Suggested fix:** Full replacement recommended (same category "Vol Baseball History", same slot 3/medium difficulty). The correct answer needs to be a single defensible fact (e.g. a specific year/round Tennessee and Vanderbilt met in an NCAA regional/super regional, if verifiable), not an instruction to go check elsewhere. Not proposing specific replacement text without being able to confirm an exact tournament meeting.
**Reason:** §32 explicitly prohibits hedge/non-answers as the correct answer — option A tells the reader to go verify it themselves rather than stating a fact, which is a direct violation. C "Not applicable" is also a non-answer distractor (recurring pattern). This is one of the more severe issues in this run.
**Status:** ⏳ pending review — flagged as uncertain on replacement content, but the current row is confirmed broken as-is

### trivia_questions.af17891c-7852-42dd-94e8-0475cdc5db24 — 2026-09-07 / slot 5 — vague yes/no framing + unverified "multiple winners" claim
**Current:** "Tennessee has had multiple SEC Sixth Man of the Year winners provide key bench scoring under Rick Barnes. Is this award given annually by the conference?" A "Only starters are eligible", B "The award doesn't exist in the SEC", C "Yes, it is an annual SEC honor" (correct), D "No Tennessee player has won this award"
**Suggested fix:** Convert to a real 4-option factual question (e.g. "Which Tennessee player won SEC Sixth Man of the Year under Rick Barnes?" with real player-name options) rather than a yes/no wrapped as 4 options. Separately, **flag for verification**: I could only confirm one Tennessee SEC Sixth Man of the Year under Barnes (Lamonté Turner, co-winner, 2018) — I could not confirm the premise that Tennessee has had "multiple" winners under Barnes. Recommend the content team verify the full winner list before this airs; if only one, the premise itself needs correcting, not just the options.
**Reason:** Same yes/no-dressed-as-4-options structural pattern flagged repeatedly above, plus options A/B/D are self-eliminating (A contradicts the question's own premise of "bench scoring"; B and D are trivially false to anyone aware the question is being asked at all). The "multiple winners" premise is unverified, not confirmed accurate.
**Status:** ⏳ pending review — flagged as uncertain (unverified "multiple" claim) in addition to the structural issue

Sources checked this run: Yahoo Sports and Winsipedia (Georgia-Tennessee series record), ESPN/FloBaseball/Texas Tech Athletics/Baseball America (2024 Shriners Children's College Showdown and preseason rankings), UT Volopedia library archive (checkerboard end zone origin), 247Sports/Ohio State Athletics (2010 NCAA tournament seeding), UTSports/247Sports/Rocky Top Talk (Grant Williams class year and awards), Wikipedia/Chattanoogan/UTSports (Todd Helton jersey number), Sports-Reference/Wikipedia (Robert Neyland career record — confirmed accurate, 173-31-12 over 21 seasons, no issue), Sports-Reference (SEC Sixth Man of the Year), UTSports/SwimCloud (Allan Jones Aquatic Center), WBIR/CBS Sports/UTSports (Kim Caldwell hire, confirms 09-07 poll accurate).
**Status:** ⏳ pending review — all items above remain unresolved pending David's action, except the 2026-09-04 items explicitly marked resolved
