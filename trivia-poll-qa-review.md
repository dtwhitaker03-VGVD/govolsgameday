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

## 2026-09-13 — run summary
- Checked: trivia 2026-09-13 to 2026-09-16 (20 rows, 5 slots × 4 days), polls 2026-09-13 to 2026-09-16 (3 rows — 2026-09-15 still missing)
- Issues found: 9 (plus 3 informational notes below)
- David personally edited `trivia_questions.bc0c60b5` (2026-09-13 slot 2) directly between passes — verified independently, see resolved item below, not re-flagged.
- WebSearch was available this run; all factual claims below were checked against live sources rather than assumed.

### trivia_questions.bc0c60b5-1c5a-419f-820f-2a0b35f533e0 — 2026-09-13 / slot 2 — RESOLVED (David's direct edit confirmed correct)
**Current:** correct_answer C = "ESPN/ABC (SEC Network)"; distractor D = "CBS Sports Network"
**Verification:** Confirmed accurate independently. SEC media rights as of the mid-2020s are held under the ESPN/ABC deal (2024-2034), with games also carried on SEC Network — matches "ESPN/ABC (SEC Network)". "CBS Sports Network" is a real, plausible-but-wrong distractor (CBS over-the-air broadcast, not "CBS Sports Network," held the prior SEC package through 2023), and it is no longer self-eliminating the way the old "No broadcast partnership exists" option was. Also matches David's short-answer style preference.
**Status:** ✅ resolved — David's edit confirmed correct, no further action needed

### trivia_questions.e76daed0-c91c-40dd-9907-82c7a2da0f3e — 2026-09-15 / slot 3 — distractors are also factually true (more than one defensible correct answer)
**Current:** Q: "Jeremy Pruitt, Tennessee's head coach from 2018-2020, previously served as defensive coordinator at which powerhouse program?" A "LSU", B "Florida State", C "Alabama" (correct), D "Georgia"
**Suggested fix:** Reword the stem to disambiguate, e.g. "Immediately before taking the Tennessee job, Pruitt was defensive coordinator at which program?" (keeps correct_answer C "Alabama", his 2016-17 stop right before Tennessee). Alternatively, if a stem rewrite isn't wanted, swap B and/or D for a program Pruitt never coached at (LSU already works as a safe distractor).
**Reason:** Verified via search: Pruitt was defensive coordinator at Florida State (2013, national title season), Georgia (2014-2015), AND Alabama (2016-2017) before taking the Tennessee job in 2018 — so options B and D are also true statements, not false distractors. Only "immediately prior to Tennessee" uniquely singles out Alabama. As worded, a well-informed fan could correctly argue for B or D too, which breaks the single-defensible-correct-answer rule.
**Status:** ⏳ pending review

### trivia_questions.c61cd010-452d-487e-871c-50cb65397d99 — 2026-09-15 / slot 5 — self-eliminating distractors (question stem gives away 3 of 4 options)
**Current:** Q: "As of the mid-2020s, no current SEC member's women's basketball program has more NCAA titles than Tennessee's eight. Which non-SEC program leads all of Division I women's basketball in titles?" A "LSU", B "Kentucky", C "Alabama", D "UConn" (correct)
**Suggested fix:** Replace A/B/C with non-SEC programs that are plausible-but-wrong (e.g. "Stanford", "USC", "Old Dominion") so all four options are actually the type of answer the question asks for (a non-SEC program).
**Reason:** §32 — LSU, Kentucky, and Alabama are all current SEC members, and the question stem explicitly says it wants a *non-SEC* program. A test-taker can eliminate A/B/C purely from the stem, with zero basketball knowledge — a self-eliminating-distractor problem, just engineered via the stem rather than the option text. (Underlying fact checked and accurate: UConn leads all NCAA D-I women's basketball with more titles than Tennessee's 8.)
**Status:** ⏳ pending review

### trivia_questions.c901f3ae-d324-4ec4-8c72-30188af3a87c — 2026-09-16 / slot 3 — factual/timeline error: the injury did not threaten his senior season
**Current:** Q: "Which injury threatened to end Zakai Zeigler's senior season before an NCAA eligibility waiver became a major storyline?" A "A broken wrist", B "A torn ACL" (correct), C "A shoulder injury", D "A concussion"
**Suggested fix:** Reword the stem, e.g. "Which injury, suffered during Zeigler's sophomore season, later fueled his push for a fifth year of eligibility?" — keep correct_answer B "A torn ACL" (the injury type itself is right; only the "senior season" timing claim is wrong).
**Reason:** Verified via search (on3.com, CBS Sports, Yahoo Sports): Zeigler tore his ACL on February 28, 2023, during his **sophomore** season — he went on to play out his junior (2023-24) and senior (2024-25) seasons on the recovered knee without further injury. The 2025 eligibility-waiver lawsuit sought a *fifth* season specifically because that sophomore-year injury cost him development time, not because anything threatened his senior year. As written, the stem misstates which season was actually in jeopardy.
**Status:** ⏳ pending review

### trivia_questions.5786a59c-53e6-4323-8bf2-5666b890a5f8 — 2026-09-14 / slot 5 — correct answer is defensible but weaker than an available distractor
**Current:** Q: "Which Tennessee player earned significant national defensive recognition, including Naismith Defensive Player of the Year consideration, during the Rick Barnes era?" A "Josiah-Jordan James", B "Santiago Vescovi", C "Jahmai Mashack", D "Grant Williams" (correct)
**Suggested fix:** Not proposing a confident swap — flagging for David's judgment. If the intent is "the player with the most significant/notable Naismith DPOY recognition," consider changing correct_answer to C "Jahmai Mashack" instead.
**Reason:** Verified via search: Grant Williams was a **semifinalist** (one of 10) for the 2019 Naismith DPOY award — real, but a lower tier of "consideration." Jahmai Mashack was an actual **finalist** (one of 4) in 2025, part of the first time two teammates (Mashack and Zakai Zeigler) were finalists in the award's history — a more clearly "significant" national defensive honor. Both are technically true "received consideration" statements, so this isn't a clean-cut factual error, but the stem's emphasis on "significant" recognition fits Mashack better than the marked-correct Williams. Flagging as uncertain per guardrails rather than proposing a confident fix.
**Status:** ⏳ pending review — flagged as uncertain

### trivia_questions.4a4911bc-eb72-4e7c-9011-3de3e1231e28 — 2026-09-14 / slot 3 — vague/unverifiable premise in question stem
**Current:** Q: "Which Tennessee coach's introductory remarks upon hiring emphasized a 'toughness and defense first' program identity that has largely held true?" A "Rick Barnes" (correct), B "Buzz Peterson", C "Cuonzo Martin", D "Bruce Pearl"
**Suggested fix:** Reword to a more concretely verifiable claim, e.g. "Which Tennessee coach is best known for building his program's identity around toughness and defense?" — drops the specific "introductory press conference" framing, which isn't something I could verify against an actual quote or transcript.
**Reason:** Could not verify that Barnes' specific introductory remarks upon hiring (2015) explicitly stated a "toughness and defense first" identity — this reads as a retrospective characterization of his tenure rather than a checkable fact about a specific press conference. The general premise (Barnes teams are known for toughness/defense) is fair and well-supported; the "introductory remarks" framing risks being an invented specific. Flagging per guardrails rather than confirming or rejecting outright.
**Status:** ⏳ pending review — flagged as uncertain (unverified specific claim)

### trivia_questions.d9188989-3e3a-48b0-b25c-efde5c21b3e5 — 2026-09-14 / slot 4 — style: long descriptive-phrase answer
**Current:** correct_answer B = "UConn's various undefeated championship seasons"
**Suggested fix:** Shorten to "UConn" per David's standing preference for 1-3 word/name/number answers; if a specific season is wanted for precision, name one (e.g. "UConn (2002)") rather than the vaguer "various."
**Reason:** Style check per David's standing preference — trivia answers should generally be short names/numbers/years, not full descriptive phrases. Separately (not proposing a change): "often compared in retrospective media coverage" is a soft/subjective framing rather than a single crisp fact — defensible given how commonly Summitt's 1997-98 team and UConn's dynasty are discussed together, but borderline in the same way as some items flagged in the 2026-09-01 pass.
**Status:** ⏳ pending review — style note

### trivia_questions.9c2de16a-6f71-42db-bb98-b865f83f3d6d — 2026-09-13 / slot 4 — style: long compound answer + inconsistent option formatting
**Current:** correct_answer D = "Northeastern JC and Northern Colorado"; distractors A "Kentucky (SEC)" and B "Duke (ACC)" carry parenthetical conference tags that C/D don't.
**Suggested fix:** Consider shortening the correct answer (e.g. "Northern Colorado" alone, if the JC leg is secondary to the point of the question); drop the "(SEC)"/"(ACC)" parentheticals from A/B so all four options are formatted consistently.
**Reason:** Style note — correct answer is longer/more compound than David's preferred short format. Separately, the parenthetical conference tags appearing on only two of four options are a minor formatting inconsistency worth tidying (not meta-commentary, but it makes those two options visually stand out). Underlying facts verified accurate via search: Knecht played Northeastern Junior College (2019-21) then Northern Colorado (2021-23) before transferring to Tennessee.
**Status:** ⏳ pending review — style note

### trivia_questions.77b1d141-f54e-4497-a49c-42dfdc87fd75 — 2026-09-15 / slot 4 — style: long phrase answer
**Current:** correct_answer C = "#1 all-time in the SEC"
**Suggested fix:** Shorten to "#1 in the SEC" or just "#1", matching David's short-answer preference.
**Reason:** Style note per David's standing preference. Underlying fact verified accurate: Chris Lofton's 431 career three-pointers is the SEC career record (per UT Sports and other sources).
**Status:** ⏳ pending review — style note

### trivia_questions.af5ddaa4-822a-46ee-9d27-cbf81ac1ed35 — 2026-09-16 / slot 1 — minor: absurd/self-eliminating distractors (low priority given easy slot)
**Current:** A "Fencing", B "Football" (correct), C "Rowing", D "Cricket"
**Suggested fix:** Replace with real sports the SEC is also known for but isn't "most associated with" (e.g. "Baseball", "Basketball", "Track and Field") so the question isn't solvable on vibes alone. Low priority — slot 1 is meant to be easy, so some trivial-ness is tolerable.
**Reason:** §32 distractor-quality — fencing/rowing/cricket aren't sports the SEC is generally associated with at all, so they're eliminable with zero actual trivia knowledge. Same low-priority pattern as the WNBA "Over 20,000" item flagged in the 2026-09-01 pass.
**Status:** ⏳ pending review — low priority

### General note — 2026-09-16 slot 5 answer format (informational only)
**Current:** trivia_questions.9c01701f (2026-09-16 slot 5) correct_answer B = "1936, 1941, 1943, 1979, and 2022" (verified accurate — these are Tennessee men's basketball's five actual SEC Tournament title years).
**Suggested fix:** No change required — a five-year list is inherent to what this question asks ("in which years did these titles come") and can't be shortened to 1-3 words without changing the question itself.
**Reason:** Style-guideline check only — noted as a reasonable exception since numbers/years are explicitly within David's stated allowance, even as a list of five.
**Status:** ⏳ pending review (informational only)

### daily_polls — no row scheduled for 2026-09-15 — scheduling gap still open
**Current:** `SELECT ... WHERE active_date = '2026-09-15'` returns 0 rows. Polls exist for 2026-09-13, 09-14, 09-16 only.
**Suggested fix:** N/A (no existing row to patch) — this gap was first flagged in the 2026-09-12 pass and remains unfilled. Recommend scheduling a poll for 2026-09-15 before that date arrives.
**Reason:** In-scope date has no poll queued; carried over from the prior pass, still unresolved.
**Status:** ⏳ pending review — operational gap, carried over from 2026-09-12 pass

### Poll content check — 2026-09-13, 2026-09-14, 2026-09-16 — no issues found
**Current:** All three scheduled polls checked against §33 — "best Vol basketball season" (2026-09-13), "best Vol baseball road series atmosphere" (2026-09-14), "best single season performance in Tennessee football history" (2026-09-16).
**Suggested fix:** N/A
**Reason:** Each is a clear, single-topic, opinion-style question with 4 distinct, non-overlapping, non-leading options; every season/award/ranking referenced in the options was checked and is factually real (2007-08 and 2018-19 #1 rankings, 2010 Elite Eight, 2022 SEC Tournament title, Manning's 1997 season, Jamal Lewis's 1999 season, Eric Berry's 2009 season, Hooker's 2022 season). No duplicate/near-duplicate poll found in the window.
**Status:** ✅ no issue

**Sources checked this run:** 247Sports, UTSports.com, Wikipedia (Dalton Knecht, Jahmai Mashack, Jeremy Pruitt, SEC men's basketball tournament, 1936/1943 SEC tournament pages), on3.com and CBS Sports/Yahoo Sports (Zakai Zeigler ACL/eligibility lawsuit coverage), NBA.com draft profile, rockytopinsider.com and utsports.com (Grant Williams 2019 Naismith DPOY watch list/semifinalist status).
**Status:** ⏳ pending review — all items above remain unresolved pending David's action, except the resolved 2026-09-13 slot 2 item and the two "no issue" checks noted above
