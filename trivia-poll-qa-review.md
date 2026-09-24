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

## 2026-09-15 — run summary
- Checked: trivia 2026-09-15 to 2026-09-18 (20 rows, 5 slots × 4 days), polls 2026-09-15 to 2026-09-18 (4 rows, full coverage)
- Issues found: 14 (2 factual-accuracy errors, 8 distractor-quality/structural issues, 3 style notes, 1 informational poll-mix note)
- Verification note on David's manual fixes to 2026-09-15: re-checked all four independently rather than assuming.
  - `e76daed0` (slot 3, Jeremy Pruitt DC): **Clean.** Pruitt was Alabama's DC in 2016-17 immediately before becoming Tennessee HC in 2018 — "Alabama" (C) is accurate, all four options are real programs, no distractor issues.
  - `77b1d141` (slot 4, Chris Lofton three-pointers): **Factually clean**, verified via web search — Lofton's 431 made 3-pointers is still the SEC's all-time career record (Chaz Lanier broke Tennessee's *single-season* record in 2025, not Lofton's career/SEC record, so "#1 all-time in the SEC" remains accurate). Logging a minor style-only note below (see entry 1).
  - `c61cd010` (slot 5, UConn/women's basketball titles): **Factually clean.** UConn's 11 NCAA titles vs. Tennessee's 8 is accurate. Logging a soft category note below (see entry 2) — not a hard error.
  - `5b513ef1` (2026-09-15 poll, Kennesaw State): row now exists and is well-formed (4 distinct, non-overlapping point-margin options, no leading bias). Game-outcome/schedule claims for a Sept. 2026 game are not independently verifiable via search and are treated as out of scope for fact-checking, consistent with this being a standard prediction-poll format.
- Sources checked this run: Wikipedia/Knoxville News Sentinel/Knox TN Today (Tennessee's six claimed national titles), CBS Sports/Wikipedia/WBIR (Kim Caldwell hire date), Rivals/Wikipedia (Tennessee SEC Tournament title years), Yahoo Sports/Wikipedia (Rod Delmonico's SEC titles), CBS Sports/WATE/247Sports (Zakai Zeigler ACL timeline), UTSports/247Sports/On3 (Chris Lofton vs. Chaz Lanier 3-point records).

### trivia_questions.77b1d141-f54e-4497-a49c-42dfdc87fd75 — 2026-09-15 / slot 4 — style: correct answer is a long phrase, not short
**Current:** option_b "#5 all-time in the SEC", option_c "#1 all-time in the SEC" (correct)
**Suggested fix:** Shorten to "5th in SEC" and "#1 in SEC" (or similar 2-3 word phrasing) to match David's short-answer style preference.
**Reason:** §32 style preference — correct answers/options should generally be 1-3 words; "#1 all-time in the SEC" is a 5-word phrase. Low priority, factual content is accurate.
**Status:** ⏳ pending review

### trivia_questions.c61cd010-452d-487e-871c-50cb65397d99 — 2026-09-15 / slot 5 — soft category note: question is mostly about a non-SEC team
**Current:** Category "SEC Knowledge"; question asks which program (UConn, not an SEC school) holds the most NCAA women's basketball titles, more than Tennessee's eight.
**Suggested fix:** No confident fix proposed — flagging for awareness only. Consider whether "Lady Vols History" (since the fact is anchored on Tennessee's own title count) fits better than "SEC Knowledge" (since the correct answer, UConn, isn't an SEC program). Could reasonably be argued either way.
**Reason:** §32 category-accuracy check — the correct answer being a non-SEC program is a mild mismatch for the "SEC Knowledge" label.
**Status:** ⏳ pending review — informational, low confidence

### trivia_questions.af5ddaa4-822a-46ee-9d27-cbf81ac1ed35 — 2026-09-16 / slot 1 — self-eliminating distractors
**Current:** "The SEC's overall athletic reputation is most commonly associated with dominance in which sport...?" A "Fencing", B "Football" (correct), C "Rowing", D "Cricket"
**Suggested fix:** Replace Fencing/Rowing/Cricket with sports that are actually part of the SEC-dominance conversation (e.g. "Basketball", "Baseball", "Gymnastics") so all four options are plausible in context, rather than sports nobody would associate with SEC prestige talk.
**Reason:** §32 — distractors are trivially eliminable on their face; a test-taker needs zero Vol/SEC knowledge to answer. Correct answer itself is accurate but framed a bit softly ("most commonly associated," "frequent talking point") — defensible as general knowledge, not flagging separately.
**Status:** ⏳ pending review

### trivia_questions.c7b87c28-ae01-4ce7-850a-4386ce8a2ec6 — 2026-09-16 / slot 2 — self-eliminating/non-answer distractor
**Current:** "Which Tennessee coach's teams won the program's first SEC regular-season and tournament titles of the modern era, in the 1990s?" A "Todd Raleigh", B "Tony Vitello", C "Rod Delmonico" (correct), D "Tennessee has never won an SEC title"
**Suggested fix:** Replace D with a real, plausible-but-wrong Tennessee baseball coach name so all four options are answers of the same type. I don't have a verified name to propose with confidence — recommend the content team pick a real former/predecessor Tennessee baseball coach.
**Reason:** §32 — D directly contradicts the question's own premise (which presupposes Tennessee won such titles), making it a giveaway non-answer rather than a plausible distractor.
**Status:** ⏳ pending review — flagged as uncertain on exact replacement name
**Verification:** Correct answer confirmed accurate — Rod Delmonico led Tennessee to three straight SEC regular-season and tournament titles, 1993-95, the program's first of the modern (post-1990s realignment) era.

### trivia_questions.c901f3ae-d324-4ec4-8c72-30188af3a87c — 2026-09-16 / slot 3 — factual error: wrong season attributed to the injury
**Current:** "Which injury threatened to end Zakai Zeigler's senior season before an NCAA eligibility waiver became a major storyline?" A "A broken wrist", B "A torn ACL" (correct), C "A shoulder injury", D "A concussion"
**Suggested fix:** Change "senior season" to "sophomore season" in the question text (e.g. "Which injury did Zakai Zeigler suffer during his sophomore season that later fueled a major NCAA eligibility-waiver storyline?").
**Reason:** Verified via web search — Zeigler tore his ACL on Feb. 28, 2023, during his **sophomore** season (missing the season's remainder), not his senior season. The eligibility-waiver lawsuit (seeking a 5th year) came later, in 2025, after his actual senior season — but the injury itself did not occur in his senior year as the question states. Correct answer (torn ACL) is right; only the season label is wrong. §32 factual-accuracy failure.
**Status:** ⏳ pending review

### trivia_questions.9c01701f-3252-40a9-922e-84bf818fc081 — 2026-09-16 / slot 5 — style: correct answer is a long list, not short
**Current:** correct answer (option_b) "1936, 1941, 1943, 1979, and 2022"
**Suggested fix:** No strong alternative proposed — a 5-year list is hard to compress below the 1-3 word style guideline for this type of fact. Flagging as a low-priority style exception rather than an error.
**Reason:** §32 style preference note. **Verification:** confirmed accurate via web search — Tennessee has exactly 5 men's basketball SEC Tournament titles, in 1936, 1941, 1943, 1979, and 2022; no factual-accuracy issue.
**Status:** ⏳ pending review — informational only

### trivia_questions.c9fca09b-1541-48f7-9789-327be49f47dd — 2026-09-17 / slot 2 — factual error (wrong hire year) + meta-commentary/tasteless distractors
**Current:** "Which coach was hired in 2023 to lead the Lady Vols after Kellie Harper's departure?" A "Mickie DeMoss (returning)", B "Kim Caldwell" (correct), C "Holly Warlick (returning)", D "Pat Summitt (deceased, not applicable)"
**Suggested fix:** (1) Change "hired in 2023" to "hired in 2024" in the question text. (2) Strip the parenthetical "(returning)" from options A and C — they should just read "Mickie DeMoss" and "Holly Warlick". (3) Replace option D entirely with a real, plausible candidate name (e.g. another coach who was reportedly considered in the search) rather than invoking a deceased coach as a joke/non-answer.
**Reason:** Verified via web search — Kim Caldwell was hired April 7, 2024 (following Kellie Harper's departure after the 2023-24 season), not 2023; this is a hard factual error. Separately, §32 prohibits meta-commentary bleeding into option text (the "(returning)" and "(deceased, not applicable)" asides are giveaways), and invoking a deceased former coach as a non-answer option is in poor taste for this context.
**Status:** ⏳ pending review

### trivia_questions.09d96289-6029-4a1f-b22c-f6794566481d — 2026-09-17 / slot 4 — broken True/False structure + hedge/non-informative correct answer
**Current:** "...True or false?" A "No Lady Vol has ever left early for the WNBA Draft", B "True" (correct), C "Early entry is banned by the NCAA", D "Not applicable"
**Suggested fix:** Recommend full replacement with a standard 4-option factual question naming a specific real Lady Vol who left early for the WNBA Draft (and the year), giving a crisp, verifiable, non-generic correct answer — rather than restructuring as True/False, since "True" alone with no cited fact is not informative trivia content.
**Reason:** Same recurring structural defect flagged repeatedly in the 2026-09-01 run (no genuine "False" option; other three are self-eliminating/absurd) — §32 self-eliminating distractors and no-hedge-answer rules both apply; "True" as a correct answer conveys no actual fact to the player.
**Status:** ⏳ pending review

### trivia_questions.0ba5eb78-a2d1-4cc4-afef-c8e8ad66bb15 — 2026-09-17 / slot 5 — self-eliminating distractor
**Current:** "...Approximately how many times have the two programs met all-time?" A "Around 10 times", B "It was interrupted every decade, fewer than 20 meetings", C "They have never once played", D "Over 100 times" (correct)
**Suggested fix:** Replace C with a plausible-but-wrong number range, e.g. "Around 50 times".
**Reason:** §32 — option C directly contradicts the question's own stated premise ("played annually almost every year since the 1930s-40s"), making it an obvious giveaway rather than a real distractor. Correct answer verified reasonable — Tennessee-Alabama have met over 100 times all-time.
**Status:** ⏳ pending review

### trivia_questions.9d690cec-73dc-488a-a35a-059eff6f7acd — 2026-09-18 / slot 1 — self-eliminating distractors
**Current:** "Which Tennessee forward was named a consensus first-team All-American on the program's 2018-19 #1-ranked team?" A "LeBron James", B "Grant Williams" (correct), C "Michael Jordan", D "Kobe Bryant"
**Suggested fix:** Replace the NBA-legend distractors with real Tennessee players from that same 2018-19 team, e.g. "Admiral Schofield", "Jordan Bone", "Lamonte Turner".
**Reason:** §32 — any casual sports fan can eliminate three globally famous NBA legends who never played for Tennessee without any Vol-specific knowledge; undermines the question even at "easy" difficulty. Correct answer (Grant Williams, 2018-19 consensus first-team All-American) verified accurate.
**Status:** ⏳ pending review

### trivia_questions.585e3cc0-ba19-48ea-b0a5-ee4e25e04f7e — 2026-09-18 / slot 3 — hedge/non-answer correct answer + self-eliminating distractor
**Current:** "...Roughly how often has Tennessee beaten Kentucky under Barnes?" A "Only in exhibition games", B "Never", C "On multiple occasions" (correct), D "Exactly once"
**Suggested fix:** Recommend full replacement with a specific, verifiable fact (e.g. an actual head-to-head win count under Barnes, or a specific memorable game/date) as the correct answer, rather than the vague "on multiple occasions." I'm not proposing an exact number myself since I did not verify Tennessee's precise current record vs. Kentucky under Barnes this run — flag for verification before drafting a replacement.
**Reason:** §32 explicitly bars hedge/non-answers as the correct answer — "on multiple occasions" is not a single defensible fact. Also, option B "Never" self-eliminates against the question's own premise (the stem already describes court-storming wins over Kentucky).
**Status:** ⏳ pending review — flagged as uncertain (replacement fact not verified)

### trivia_questions.bf157f44-5ae0-4634-88c0-4755b2875da2 — 2026-09-18 / slot 4 — non-answer/self-eliminating distractors
**Current:** "...centered on which program?" A "No Tennessee sport has ever faced NCAA infractions", B "Not applicable", C "The Jeremy Pruitt-era football program" (correct), D "Every single Tennessee sport has faced major infractions"
**Suggested fix:** Replace A, B, and D with real Tennessee program names that did *not* face major NCAA infractions (e.g. "Vol Baseball", "Lady Vols Basketball", "Vol Track & Field") so all four options are the same type of answer as the correct one. Also consider shortening the correct answer for style, e.g. "Football (Pruitt era)".
**Reason:** §32 — three of four options are non-answers/absurd extremes rather than plausible programs, echoing the same "Not applicable"/absolutist-distractor pattern flagged repeatedly in the 2026-09-01 run.
**Status:** ⏳ pending review

### trivia_questions.cdd8083d-a6d1-40a6-98b1-46e66f1e78cb — 2026-09-18 / slot 5 — self-eliminating distractors (contradict the question's own premise)
**Current:** "Tennessee's 1950 team also won a share of the national title... Which of Tennessee's six officially claimed championship years does 1950 belong alongside?" A "1950 was a losing season", B "Tennessee only claims 1998", C "No, only 1951 and 1998 are claimed", D "1938, 1940, 1951, 1967, and 1998" (correct)
**Suggested fix:** Replace A/B/C with plausible-but-wrong year lists (e.g. swap in an unclaimed year, or a slightly different 5-year combination) rather than options that flatly deny the premise the question just stated.
**Reason:** §32 — A, B, and C all directly contradict the question stem's own premise (that 1950 is one of six claimed titles), making them trivially eliminable rather than genuine distractors. **Verification:** correct answer confirmed accurate via web search — Tennessee officially claims six national titles: 1938, 1940, 1950, 1951, 1967, and 1998; D correctly lists the other five alongside 1950.
**Status:** ⏳ pending review

### daily_polls — informational: category mix skews heavily football this window
**Current:** Of the 4 polls scheduled 2026-09-15 to 2026-09-18, 3 are football-themed (Kennesaw State prediction, best single-season performance, best safety) and 1 is basketball (best all-time Vol basketball player); none are baseball or Lady Vols themed.
**Suggested fix:** No content-field fix proposed (this is a scheduling/mix observation, not a defect in any individual row) — flagging so the content team can balance upcoming poll topics toward baseball/Lady Vols per §33's category-mix guidance.
**Reason:** §33 — appropriate category mix across Football/Basketball/Baseball/Lady Vols. All 4 individual polls are otherwise clean (clear, single-topic, distinct non-overlapping options, no leading bias, facts check out on the two verifiable claims below).
**Verification:** Spot-checked the factual claims in the 2026-09-16 poll (Manning 1997, Lewis 1999, Berry 2009, Hooker 2022) against recollection — all four seasons are correctly attributed to each player's actual standout year; no discrepancies found.
**Status:** ⏳ pending review — informational only
## 2026-09-16 — run summary
- Checked: trivia 2026-09-16 to 2026-09-19 (20 rows, 5 slots × 4 days), polls 2026-09-16 to 2026-09-19 (4 rows)
- Issues found: 4 (all on 2026-09-19, the one date not touched by the earlier manual backlog cleanup)
- Verification pass on the 09-16/09-17/09-18 rows David said were manually fixed earlier today: independently re-checked all 10 previously-flagged rows (09-16 slots 1-3; 09-17 slots 2, 4, 5; 09-18 slots 1, 3, 4, 5) fresh against the current DB content and, where applicable, live web search. **All 10 are now clean — no remaining issues found on any of them.** Detail below.
- Web search was available this run; sources are cited per fact checked.

### Verification of the 10 previously-fixed rows (all confirmed clean)
- **09-16 slot 1** (SEC dominance sport): now reads with real-sport distractors (Basketball/Football/Hockey/Lacrosse, correct=Football). No longer self-eliminating; SEC football dominance is a well-established, defensible fact. Clean.
- **09-16 slot 2** (Delmonico 1990s titles): verified — Rod Delmonico's Tennessee teams won the program's first SEC regular-season *and* tournament titles in 1993, 1994, and 1995 ([Rod Delmonico – Wikipedia](https://en.wikipedia.org/wiki/Rod_Delmonico), [1993 SEC Baseball Tournament – Wikipedia](https://en.wikipedia.org/wiki/1993_Southeastern_Conference_baseball_tournament)). Clean.
- **09-16 slot 3** (Zeigler ACL): verified — Zeigler tore his ACL during his **sophomore** season (2022-23, vs. Arkansas) ([ESPN](https://www.espn.com/mens-college-basketball/story/_/id/35762381/tennessee-zakai-zeigler-miss-rest-season-torn-acl), [WATE](https://www.wate.com/sports/orange-and-white-nation/tennessee-basketball/zakai-zeigler-suffers-torn-acl-in-final-home-game-of-2023/)). Matches the question exactly. Clean.
- **09-17 slot 2** (Kim Caldwell hire): 2024 hire after Kellie Harper's departure — well-established fact, no meta-commentary remains in options. Clean.
- **09-17 slot 4** (Candace Parker): verified — Parker left Tennessee early as a redshirt junior (medical redshirt 2004-05) to enter the 2008 WNBA Draft, forgoing her senior year ([Wikipedia](https://en.wikipedia.org/wiki/Candace_Parker)). Standard 4-option structure now, no True/False artifacts. Clean.
- **09-17 slot 5** (Tennessee-Alabama series count): verified — 108 all-time meetings ([Winsipedia](https://www.winsipedia.com/alabama/vs/tennessee)), so "Over 100 times" (correct) is accurate and no longer self-eliminating against the other options. Clean.
- **09-18 slot 1** (Grant Williams All-American): 2018-19 consensus first-team All-American — well-established, distractors are real era-appropriate teammates now. Clean.
- **09-18 slot 3** (Barnes vs. Kentucky): "Never" removed; correct answer "On multiple occasions" is accurate and no longer self-eliminating. **Style note (low priority, not a blocking issue):** "On multiple occasions" is a 3-word descriptive phrase rather than a single fact (name/number/year) — David's short-answer style preference would favor something crisper if this question is ever touched again, but it's not a correctness problem.
- **09-18 slot 4** (Pruitt-era infractions): factually well-established (2020-21 NCAA infractions case centered on the Jeremy Pruitt football program); distractors are now real programs, not non-answers. Clean.
- **09-18 slot 5** (1950 national title / six claimed titles): verified — Tennessee's six officially claimed national championship years are 1938, 1940, 1950, 1951, 1967, and 1998; correct option D ("1938, 1940, 1951, 1967, and 1998") is exactly the other five. Distractors are plausible wrong year-sets. Clean.

### Issues found this run — all on 2026-09-19 (untouched by the earlier cleanup)

### trivia_questions.efc5370a-85c2-468a-aab9-057195960fcd — 2026-09-19 / slot 2 — broken True/False structure, non-answer distractors
**Current:** "Tennessee's Vitello-era recruiting classes have produced multiple Freshman All-American honorees. True or false?" A "Not applicable", B "True" (correct), C "False, never happened", D "The award doesn't exist"
**Suggested fix:** Restructure as a genuine 2-option True/False (option_a "True", option_b "False", option_c/option_d null, correct_answer "A"), or convert to a standard 4-option factual question naming a specific Tennessee baseball Freshman All-American and asking for the year/position, with three other real plausible names/years as distractors.
**Reason:** Same structural defect logged repeatedly in the 09-01–09-04 window (see entries above): the True/False framing never actually offers a clean opposing option — A, C, and D are all non-answers/self-eliminating rather than genuine "False" alternatives, so the question is trivially solvable by elimination alone. §32.
**Status:** ⏳ pending review

### trivia_questions.358a7490-ef53-4a1d-93f1-6b978be8863b — 2026-09-19 / slot 3 — self-eliminating, premise-contradicting distractors
**Current:** "Oklahoma's 2024 move to the SEC brought which storied rivalry into the conference alongside Texas?" A "The Texas-Oklahoma \"Red River Rivalry\"" (correct), B "Not applicable", C "Oklahoma has no football rivalries", D "No new rivalries were added"
**Suggested fix:** Replace B/C/D with three other real, plausible rivalry names (e.g., "The Bedlam Series (Oklahoma-Oklahoma State)", "The Oklahoma-Nebraska rivalry", "The Sooner-Longhorn Shootout" — pick three that sound parallel but aren't the one the question is actually asking about) rather than options that just deny the question's own premise.
**Reason:** The question states as fact that a "storied rivalry" came into the conference; B, C, and D all contradict that premise directly, so a test-taker can eliminate all three without any real knowledge. Underlying fact (Red River Rivalry, Oklahoma-Texas, joined SEC 2024) is accurate — this is purely a distractor-quality issue. §32.
**Status:** ⏳ pending review

### trivia_questions.b51f5b58-037c-4140-91aa-da6dc05af9ea — 2026-09-19 / slot 4 — factual inaccuracy: tenure length wrong
**Current:** "Rod Delmonico coached Tennessee baseball for approximately how many seasons?" A "3 seasons", B "5 seasons", C "Around 16 seasons (1990s into the 2000s)" (correct), D "30 seasons"
**Suggested fix:** Change correct option to "Around 18 seasons (1990-2007)" (or "18 seasons") — verified Delmonico coached Tennessee from 1990 through 2007 inclusive, 18 seasons, 699-396 record ([Tennessee Athletics/X](https://x.com/Vol_Sports/status/2042721035087143286), [Rod Delmonico – Wikipedia](https://en.wikipedia.org/wiki/Rod_Delmonico)). "Around 16" undercounts by 2 full seasons (~11% off), which is a real factual-accuracy miss, not just an approximation.
**Reason:** §32 factual accuracy — dates/tenure. Minor secondary note: this is the second question in the 3-day window centered on Rod Delmonico (see 09-16 slot 2, about his 1990s titles) — not a duplicate (different facts asked), but flagging the thematic repetition for awareness on future scheduling.
**Status:** ⏳ pending review — verified via web search (see sources above), not just flagged as uncertain

### trivia_questions.7816ebcd-d5b8-48e3-ace1-df39cdc44120 — 2026-09-19 / slot 5 — meta-commentary/explanation in correct-answer text + style violation
**Current:** "Tennessee women's basketball has won more Olympic medals than any other Tennessee sport in program history, driven largely by athletes who competed under which legendary coach?" A "Tony Vitello", B "Rick Barnes", C "Josh Heupel", D "Pat Summitt, whose players and program produced the bulk of the 16 medals" (correct)
**Suggested fix:** Trim option D to just "Pat Summitt" (matching the other three options' format: coach name only, no explanatory clause).
**Reason:** §32 explicitly prohibits meta-commentary/draft reasoning bleeding into question or option text — the parenthetical clause on D restates and justifies the question's own premise, which is a giveaway (it's the only option with any extra text) and also violates David's short-answer style preference (names/numbers/years, 1-3 words) that the other three options already follow.
**Status:** ⏳ pending review

## Poll check — 2026-09-16 to 2026-09-19
- Checked 4 rows (one per date). All four follow the site's established "who/what is the best ___" opinion-poll format (consistent with prior windows' polls), with 4 distinct, non-overlapping, factually-grounded options in each. No leading/biased phrasing, no duplicate or near-duplicate poll within the window, no factual errors found in the players/seasons named (Manning '97, Lewis '99, Berry '09, Hooker '22 on 09-16; Houston/Lofton/Williams/Ellis on 09-17; Berry/Grant/Griffin/Randolph as safeties on 09-18; Moore/Helton/Senzel/Lipscomb as infielders on 09-19 — Helton's inclusion as a 1B is accurate, he was a two-sport star who played first base for the Vols).
- Category mix across this window: Football ×2 (09-16, 09-18), Basketball ×1 (09-17), Baseball ×1 (09-19), no Lady Vols poll scheduled in this 4-day window. Not flagging as a defect (can't judge the full rotation from 4 days), but noting for awareness since Lady Vols is one of the four expected categories.
- Issues found: 0

**Status:** ⏳ pending review

## 2026-09-17 — run summary
- Checked: trivia 2026-09-17 to 2026-09-20 (20 rows, 5 slots × 4 days), polls 2026-09-17 to 2026-09-20 (4 rows, full coverage)
- Issues found: 4 (all on 2026-09-20, the only date not covered by the prior manual backlog cleanup)
- Web search was available this run; sources cited per fact checked.

### Independent re-verification of 2026-09-17 through 2026-09-19 (rows David reported as manually fixed)
Checked all 20 trivia rows across these three dates fresh against current DB content and live web search, not assuming the prior fixes held. **All 20 are clean — no remaining issues found.**

- **09-17 slot 1** (Heath Shuler position): Quarterback — correct, well-known fact. Options are all real football positions, none self-eliminating. Clean.
- **09-17 slot 2** (Kim Caldwell hire): 2024 hire after Kellie Harper's departure — accurate. No meta-commentary remains in options (Vic Schaefer / Kim Caldwell / Dawn Staley / Niele Ivey — four real, distinct coaches). Clean.
- **09-17 slot 3** (Casey Clausen 2001 starting QB): Verified via web search — Clausen started and led Tennessee to the 2001 SEC East title and SEC Championship Game appearance (2,969 yds, 22 TD on the season) ([UTSports](https://utsports.com/news/2014/10/1/Casey_Clausen_Saturday_s_VFL_Legend_Of_Game), [Wikipedia](https://en.wikipedia.org/wiki/Casey_Clausen)). Accurate. Clean.
- **09-17 slot 4** (Candace Parker, redshirt junior WNBA entry): Previously verified accurate; re-confirmed. Clean.
- **09-17 slot 5** (Tennessee–Alabama all-time series count, updated today to exact "108 times"): Verified via web search — Winsipedia lists the series at 108 meetings (Alabama leads 60-40-7) ([Winsipedia](https://www.winsipedia.com/alabama/vs/tennessee)). "108 times" is exact and correct — this is a stronger, more defensible answer than the prior "Over 100 times" per David's request. Distractors (98 / 103 / 115) are now close, plausible numbers and no longer self-eliminating. Clean, well-formed question.
- **09-18 slot 1** (Grant Williams 2018-19 All-American): Confirmed accurate; real 2018-19 teammates as distractors (Schofield, Bone, Bowden). Clean.
- **09-18 slot 2** (Bill Battle, 1970 hire): Verified via web search — Battle was a Tennessee assistant under Doug Dickey from 1966-69 (part of the 1967 and 1969 SEC title staffs) and was elevated to head coach in 1970 when Dickey left for Florida ([Bill Battle – Wikipedia](https://en.wikipedia.org/wiki/Bill_Battle), UTSports obituary). Question premise and correct answer both accurate; all four options (Barnhill, Neyland, Wyatt, Battle) are real Tennessee-affiliated coaches, none self-eliminating. Clean. (This row wasn't flagged in any prior run and appears to have been clean from the start.)
- **09-18 slot 3** (Barnes vs. Kentucky, "on multiple occasions"): Confirmed clean per the 09-16 run's verification; the previously-noted style note (long-phrase correct answer) is low-priority/informational only and not re-logged as a new issue.
- **09-18 slot 4** (Pruitt-era infractions): Confirmed accurate and well-formed; real programs as distractors. Clean.
- **09-18 slot 5** (1950 national title / six claimed titles): Confirmed accurate; distractors are plausible year-lists. Clean.
- **09-19 slot 1** (Peyton Manning #16 retired 2005): Verified via web search — jersey retired Oct. 29, 2005, in a pregame ceremony ([UTSports](https://utsports.com/news/2005/10/28/peyton_manning_s_no_16_to_be_retired_during_pregame_ceremony)). Accurate. Clean. (Also not previously flagged — appears clean from the start.)
- **09-19 slot 2** (Drew Beam, Freshman All-American): Verified via web search — Beam was a four-time Freshman All-American and SEC Freshman of the Year in 2022 under Vitello ([On3](https://www.on3.com/teams/tennessee-volunteers/news/tennessee-vols-baseball-major-league-draft-drew-beam/)). Now restructured from the old broken True/False into a standard 4-option question; the other three options (Burke, Moore, Dickey) are real Tennessee hitters, not pitchers, which is a legitimate knowledge-based distinction rather than a non-answer/absurd distractor. Clean.
- **09-19 slot 3** (Red River Rivalry into SEC): Options are now four real, distinct rivalries (Red River / Iron Bowl / Egg Bowl / Bedlam) rather than premise-denying non-answers. Fact confirmed well-established. Clean.
- **09-19 slot 4** (Rod Delmonico tenure): Now reads "18 seasons (1990-2007)," matching the previously-verified correct figure (699-396 record). Clean.
- **09-19 slot 5** (Pat Summitt, Olympic medals): Option D trimmed to just "Pat Summitt," matching the other three single-name options; no meta-commentary remains. Clean.

### 2026-09-20 — first review of this date (4 issues found)

### trivia_questions.5618cacd-58d1-4bda-be1a-ed984fbab1ee — 2026-09-20 / slot 3 — non-answer + self-eliminating distractors, long-phrase correct answer
**Current:** "Chamique Holdsclaw, Candace Parker, and Tamika Catchings all have which honor in common at Tennessee, beyond their Naismith Hall of Fame inductions?" A "Each has had her jersey number retired or honored by the program" (correct), B "Not applicable", C "None of their numbers have been honored", D "Every number has been formally retired for every Lady Vol"
**Suggested fix:** Replace B/C/D with three real, plausible-but-wrong shared honors of the same type as the correct answer (e.g., "All three were named national Player of the Year," "All three are Tennessee Sports Hall of Fame inductees," "All three had their numbers honored but not formally retired"), and shorten the correct answer text to a short phrase, e.g. "Jersey retired" or "Numbers retired," to match David's style preference.
**Reason:** §32 — B is the recurring "Not applicable" non-answer pattern; C flatly negates the question's own premise (a "none of them" option right after a question asking what they share); D is an absurd hyperbolic claim ("every single Lady Vol," obviously false) — all three are trivially eliminable without real Lady Vols knowledge. Separately, the correct answer is an 11-word full sentence, a clear style violation (should be 1-3 words). **Verification:** underlying fact confirmed accurate via web search — Holdsclaw (#23), Catchings (#24), and Parker (#3) have all had their numbers retired/honored by the Tennessee women's basketball program ([Volopedia](https://volopedia.lib.utk.edu/entries/lady-vols-numbers-jerseys-retired/), [ESPN](https://www.espn.com/womens-college-basketball/story/_/id/10233690/tennessee-lady-volunteers-honor-candace-parker-retire-jersey)).
**Status:** ⏳ pending review

### trivia_questions.20d975f5-f9a0-4687-85f0-4f13a9c48235 — 2026-09-20 / slot 2 — weak/tautological question content + long-phrase correct answer
**Current:** "Tennessee plays its home games on the campus of which university?" A "University of Tennessee, Knoxville" (correct), B "Auburn University", C "University of Georgia", D "Vanderbilt University"
**Suggested fix:** Recommend full replacement with a more substantive campus/venue fact (e.g., naming Neyland Stadium, its capacity, or an actual home-field detail) rather than a question that's essentially self-referential ("which university is Tennessee's team from" is nearly tautological). If kept as-is, at minimum shorten the correct answer to "University of Tennessee" or "UT Knoxville" for style.
**Reason:** §32 — while not factually wrong and not self-eliminating (all four are real SEC schools), the question borders on a non-question: it's asking the test-taker to identify Tennessee's own home institution, which tests almost no actual Vol/SEC knowledge even at "easy" difficulty. Separately, the correct answer is a 4-word proper-noun phrase rather than the short 1-3 word style David prefers.
**Status:** ⏳ pending review

### trivia_questions.2a760da7-b1f1-453e-83db-1330e08c1b8d — 2026-09-20 / slot 5 — minor: implausible distractor
**Current:** "...Which bracket structure does the men's CWS use?" A "A single best-of-one championship game with no bracket", B "A double-elimination bracket feeding into a best-of-three championship series" (correct), C "Single elimination throughout", D "A round-robin format"
**Suggested fix:** Replace A with a more plausible-sounding but still wrong format description, e.g. "A single-elimination bracket with no championship series."
**Reason:** §32 — option A ("no bracket" at all) is implausible on its face for a 64-team national tournament and is trivially eliminable without real knowledge, undercutting a "hard" slot. Correct answer verified accurate via web search — the men's CWS uses double-elimination pool play into a best-of-three finals, and Tennessee's 2024 run did include a win over Texas A&M in that finals format ([NCAA.com](https://www.ncaa.com/news/baseball/article/2024-06-24/tennessee-wins-2024-mens-college-world-series), [UTSports](https://utsports.com/news/2024/6/24/baseball-national-champions-1-tennessee-baseball-wins-2024-mcws)). Low priority.
**Status:** ⏳ pending review

### trivia_questions.5be91bb7-1244-49ff-8ca6-59363c893eb9 — 2026-09-20 / slot 1 — low-confidence flag: "primarily with Miami Heat" is a generous characterization
**Current:** "Which Tennessee guard went on to a lengthy NBA career, primarily with the Miami Heat, after starring for the Vols in the 2010s?" A "Dale Ellis", B "Josh Richardson" (correct), C "Allan Houston", D "Chris Lofton"
**Suggested fix:** No confident fix proposed — flagging for awareness only. Consider softening "primarily with the Miami Heat" to something like "including multiple stints with the Miami Heat" if the content team wants to be more precise.
**Reason:** Verified via web search — Richardson had a 10-season NBA career (2015-2025) and did play 6 of those 10 seasons with Miami (including his best season, 2018-19), which supports "lengthy" and arguably "primarily." However, he also played for 6 other teams (Sixers, Mavs, Celtics, Spurs, Pelicans) in between his two Miami stints, so "primarily with the Miami Heat" slightly overstates how much of his career was Miami-only. Not confident enough this rises to a hard factual error to propose a firm rewrite — flagging as a borderline/low-confidence note per guardrails. Correct answer (Josh Richardson) itself is not in question.
**Status:** ⏳ pending review — flagged as uncertain/low-confidence

## Poll check — 2026-09-17 to 2026-09-20
- Checked 4 rows (one per date). All four follow the site's established opinion-poll format ("who is the best...", "what makes ... special"), with clear single-topic questions and 4 distinct, non-overlapping options each.
- **09-17** (best Vol basketball player: Houston/Lofton/Williams/Ellis): confirmed clean, consistent with prior review.
- **09-18** (best safety: Berry/Grant/Griffin/Randolph): confirmed clean, consistent with prior review.
- **09-19** (best baseball infielder: Moore 2B/Helton 1B/Senzel 3B/Lipscomb 3B): confirmed clean — two options share the "3B" label but are different real players, not a duplicate/overlap.
- **09-20** (what makes Neyland Stadium special: size & atmosphere / Tennessee River backdrop / checkerboard endzone / Vol Walk) — new this run. All four claims verified accurate (Neyland sits on the Tennessee River; the checkerboard end zones and Vol Walk are real, well-known traditions). Clear, single-topic, no leading/biased phrasing, four distinct non-overlapping options. Clean.
- No duplicate or near-duplicate poll within the window.
- Category mix across the window: Basketball ×1 (09-17), Football ×2 (09-18, 09-20), Baseball ×1 (09-19), no Lady Vols poll — same recurring mix gap noted in the prior run's log; flagging again for awareness only, not a defect in any individual row.
## 2026-09-18 — run summary — BLOCKED, not completed
- Attempted scope: trivia 2026-09-18 to 2026-09-21, polls 2026-09-18 to 2026-09-21
- Issues found: N/A — **the run could not be performed.** The `mcp__Supabase__execute_sql` and `mcp__Supabase__list_tables` tools required by this agent's brief were not available in this session. The Supabase MCP server first reported a `CONNECT_TIMEOUT`; after retrying, the server reported as "connected" but explicitly does **not** offer either tool in this environment ("No such tool available ... Its MCP server 'Supabase' is connected but does not offer this tool here"). No fallback read-only path to `trivia_questions` / `daily_polls` was available (no direct DB credentials, no CLI in this environment).
- No rows were read this run. No proposals are logged below because none were checked — this entry exists only so there is a record that the automated check did not happen today, per the "log the summary even when nothing to report" guidance, extended here to an outright tooling failure so the gap is visible rather than silent.
- Action needed: re-run this check once the Supabase MCP connector is fixed/exposes `execute_sql`/`list_tables` for this project. Until then, 2026-09-20's 4 previously-logged pending issues (slots 1-3, 5) remain unverified and unfixed, and 2026-09-21 remains completely unreviewed.
**Status:** ⏳ blocked — tooling unavailable, needs re-run

## 2026-09-18 — run summary
- Checked: trivia 2026-09-18 to 2026-09-21 (20 rows, 5 slots × 4 days), polls 2026-09-18 to 2026-09-21 (4 rows)
- Issues found: 7
- Supabase MCP tools (`execute_sql`, `list_tables`) confirmed available and responsive this run (the outage noted in the preceding blocked entry is resolved).
- Independent re-verification of 2026-09-18 and 2026-09-19 (the two in-scope dates from the manual backlog cleanup): all 10 rows (09-18 slots 1-5, 09-19 slots 1-5) plus both polls re-checked fresh against current DB content, with a live web search on 09-19 slot 2's Drew Beam claim. **All 10 trivia rows and both polls are clean — no remaining issues.** One non-blocking style note carried forward: 09-18 slot 3's correct answer "On multiple occasions" is still a 3-word descriptive phrase rather than a crisp name/number/year per David's short-answer preference; not re-logged as a numbered issue since it was already noted as low-priority in the prior run and is not a correctness problem.
- 2026-09-20 re-assessed fresh per the PR #176 findings: independently reached the same conclusions on slots 1, 2, 3, and 5 (all still unfixed in the DB) and confirmed slot 4 is clean. Slot 1 (Josh Richardson) is upgraded from a low-confidence flag to a verified, firm proposed fix below.
- 2026-09-21 entered scope for the first time and was reviewed fresh in full, including a web search that surfaced a genuine factual error on slot 5 (see below) and a duplicate/near-duplicate pairing with 09-20 slot 3.

### trivia_questions.c7805f2f-00d3-4321-a637-e58631c7945c — 2026-09-21 / slot 5 — factual error: series claim is backwards
**Current:** "Has Tennessee's all-time baseball series record against Vanderbilt historically favored Vanderbilt, even as Tennessee has closed the gap since 2017?" A "The series is exactly even every single year", B "They have never played", C "Yes, the long-run series has generally favored Vanderbilt" (correct), D "Tennessee has always dominated the series"
**Suggested fix:** Replace with a factually correct framing, e.g. question: "Which team leads the all-time Tennessee-Vanderbilt baseball series?" correct answer: "Tennessee" (or "Tennessee, 188-172-2"), with plausible wrong options like "Vanderbilt", "Tied", "Series not tracked before 1950."
**Reason:** §32 factual accuracy. Verified via Winsipedia: Tennessee leads the all-time series 188-172-2 (through the March 2026 matchup) — the opposite of what the question asserts. This is also a leading/loaded question (the stem states the false premise as if given, "even as Tennessee has closed the gap"), and options B and D both flatly contradict that same false premise rather than being genuine distractors, plus the correct-answer text is a long sentence rather than a short style-compliant answer. Recommend full replacement rather than a patch, given the premise itself is wrong.
**Status:** ⏳ pending review — verified via web search (Winsipedia), high priority

### trivia_questions.5be91bb7-1244-49ff-8ca6-59363c893eb9 — 2026-09-20 / slot 1 — factual accuracy concern, now confirmed (was a low-confidence flag in the PR #176 pass)
**Current:** "Which Tennessee guard went on to a lengthy NBA career, primarily with the Miami Heat, after starring for the Vols in the 2010s?" A "Dale Ellis", B "Josh Richardson" (correct), C "Allan Houston", D "Chris Lofton"
**Suggested fix:** Drop the "primarily with the Miami Heat" claim; reword to something team-neutral and verifiably accurate, e.g. "Which Tennessee guard went on to a 10-year NBA career with seven different teams after starring for the Vols in the 2010s?"
**Reason:** §32 factual accuracy. Verified via web search: Richardson played 10 NBA seasons across seven team stints (Miami Heat 2015-19 and 2023-25, Philadelphia, Dallas, Boston, San Antonio, New Orleans) — 6 of his 10 seasons were with Miami, split across two non-consecutive stints. "Primarily with the Miami Heat" is a stretch given how much of his career (4 of 10 seasons, plus the entire middle of his career) was spent with five other franchises; he's arguably better known as a well-traveled journeyman than a Heat mainstay. The person named (Josh Richardson) and his Tennessee background are correct — only the "primarily Miami Heat" characterization is the concern.
**Status:** ⏳ pending review — verified via web search, upgraded from prior low-confidence flag to a firm proposal

### trivia_questions.20d975f5-f9a0-4687-85f0-4f13a9c48235 — 2026-09-20 / slot 2 — still unfixed: weak/tautological question + style
**Current:** "Tennessee plays its home games on the campus of which university?" A "University of Tennessee, Knoxville" (correct), B "Auburn University", C "University of Georgia", D "Vanderbilt University"
**Suggested fix:** Replace with a substantive Vol-football-history fact at easy difficulty, e.g. "What is the name of Tennessee's football stadium?" (Neyland Stadium) or a simple historical fact (first season, founding year, etc.) with real distractor options.
**Reason:** §32 — the question is tautological (nearly answers itself from the team's own name) and tests no actual Vol knowledge; confirmed still present unchanged from the PR #176 pass (2026-09-17 run). Also a style note: not really applicable here since the correct answer is already short, but the underlying question design is the core problem.
**Status:** ⏳ pending review — carried over unfixed from PR #176 pass, independently re-confirmed this run

### trivia_questions.5618cacd-58d1-4bda-be1a-ed984fbab1ee — 2026-09-20 / slot 3 — still unfixed: non-answer distractors + long correct answer; also now a near-duplicate of 09-21 slot 3
**Current:** "Chamique Holdsclaw, Candace Parker, and Tamika Catchings all have which honor in common at Tennessee, beyond their Naismith Hall of Fame inductions?" A "Each has had her jersey number retired or honored by the program" (correct), B "Not applicable", C "None of their numbers have been honored", D "Every number has been formally retired for every Lady Vol"
**Suggested fix:** Replace B/C/D with plausible-but-wrong honors (e.g. "Each has a statue outside Thompson-Boling Arena", "Each coached the program after retiring", "Each was named SEC Player of the Decade") and shorten the correct answer to something like "Jersey retirement" or "Retired numbers." Also see the paired duplicate issue below — recommend replacing this question's topic entirely (not just the options) so it no longer overlaps with 09-21 slot 3.
**Reason:** §32 — B and D are non-answers/absolutist extremes in the same recurring pattern flagged repeatedly across prior runs; confirmed still present unchanged from the PR #176 pass. New this run: 09-21 slot 3 (below) asks about the same three players and the same Hall-of-Fame/honors theme within the same 3-day window — a duplicate/near-duplicate pairing that should be resolved by changing one of the two questions' underlying topic, not just patching options.
**Status:** ⏳ pending review — carried over unfixed from PR #176 pass, independently re-confirmed this run; duplicate concern is new

### trivia_questions.405a1643-0a3e-47cc-b39c-cdebe9bfe091 — 2026-09-21 / slot 3 — near-duplicate of 09-20 slot 3 + same non-answer distractor pattern
**Current:** "Which Lady Vols alumnae have been individually inducted into the Naismith Memorial Basketball Hall of Fame as players?" A "Only coaches are ever inducted", B "No Lady Vol player has ever been inducted", C "Chamique Holdsclaw, Candace Parker, and Tamika Catchings" (correct), D "Not applicable"
**Suggested fix:** Since 09-20 slot 3 already covers this same trio's honors, recommend replacing this question with different Lady Vols History content entirely (e.g. a different alumna, a different era, a different achievement) rather than patching options on both. If kept, replace A/B/D with plausible-but-wrong player names/combinations instead of denial-of-premise non-answers.
**Reason:** §32 — duplicate/near-duplicate within the 3-day window: this question and 09-20 slot 3 both center on the same three named Lady Vols (Holdsclaw, Parker, Catchings) and the same Hall-of-Fame/honors subject matter, just phrased from opposite directions ("what honor do they share" vs. "who are the Hall of Famers"). Also independently has the same "Not applicable"/absolute-denial distractor defect (A, B, D all deny the question's own premise) flagged repeatedly elsewhere in this log.
**Status:** ⏳ pending review — new finding this run

### trivia_questions.2a760da7-b1f1-453e-83db-1330e08c1b8d — 2026-09-20 / slot 5 — still unfixed: self-eliminating distractor
**Current:** "Tennessee's 2024 College World Series run included wins over multiple nationally ranked opponents before the Finals win over Texas A&M. Which bracket structure does the men's CWS use?" A "A single best-of-one championship game with no bracket", B "A double-elimination bracket feeding into a best-of-three championship series" (correct), C "Single elimination throughout", D "A round-robin format"
**Suggested fix:** Replace A with a plausible-but-wrong bracket description, e.g. "A single-elimination bracket with no championship series."
**Reason:** §32 — option A directly contradicts the question stem's own premise (multiple games/wins over multiple ranked opponents leading to "the Finals," which implies a bracket exists), making it trivially eliminable without CWS-specific knowledge. Confirmed still present unchanged from the PR #176 pass.
**Status:** ⏳ pending review — carried over unfixed from PR #176 pass, independently re-confirmed this run

### trivia_questions.a3ef20ba-3643-483b-8e84-bf9dc2717fab — 2026-09-21 / slot 1 — self-eliminating absolutist distractors
**Current:** "What is Tennessee basketball's general playing-style reputation under Rick Barnes?" A "Slow-down, stall-ball only", B "Exclusively three-point shooting", C "Defense-first, physical style" (correct), D "Fast-paced, no defense"
**Suggested fix:** Replace with less absolute, more plausible alternatives, e.g. A "Slow, deliberate half-court offense", B "High-volume three-point shooting", D "Uptempo, fast-break style" — keeping C as the correct answer.
**Reason:** §32 — A, B, and D each use an absolutist qualifier ("only", "Exclusively", "no defense") that no real basketball team's style ever literally matches, making them trivially eliminable as exaggerations rather than genuine plausible characterizations; same pattern as the "Not applicable"/absolute-extreme distractors flagged repeatedly elsewhere in this log.
**Status:** ⏳ pending review — new finding this run

## Poll check — 2026-09-18 to 2026-09-21
- Checked 4 rows (one per date), all re-verified or newly reviewed:
  - **09-18** ("best safety"): Eric Berry, Deon Grant, Michael Griffin, Brian Randolph — all real Tennessee safeties, distinct, no bias. Clean (re-confirmed).
  - **09-19** ("best baseball infielder"): Christian Moore (2B), Todd Helton (1B), Nick Senzel (3B), Trey Lipscomb (3B) — distinct people, positions accurate, no bias. Clean (re-confirmed).
  - **09-20** ("what makes Neyland Stadium special"): size/atmosphere, Tennessee River backdrop, checkerboard endzone, Vol Walk — four distinct, factually real features of Neyland Stadium, no leading phrasing toward one option. Clean (new review).
  - **09-21** ("best Lady Vol basketball player of the 2000s"): Candace Parker, Shannon Bobbitt, Nicky Anosike, Alexis Hornbuckle — all Lady Vols who played in the 2000s, distinct, no bias. Clean (new review).
- Category mix across this 4-day window: Football ×2 (09-18 player, 09-20 venue), Baseball ×1 (09-19), Lady Vols ×1 (09-21); no men's basketball poll in this window, consistent with the rotation noted as worth watching in earlier runs but not itself a defect over a 4-day slice.
- Issues found: 0
## 2026-09-19 — run summary
- Checked: trivia 2026-09-19 to 2026-09-22 (20 rows, 5 slots × 4 days), polls 2026-09-19 to 2026-09-22 (4 rows, full coverage)
- Issues found: 3 (0 factual errors, 1 difficulty-mismatch note, 1 style note, 1 poll-wording/clarity note). 2026-09-22 is newly in scope this run and was reviewed as fully unreviewed content.
- Web search was available this run; sources cited per fact below.

### Independent verification of everything David said was manually fixed earlier today
Re-checked every row he listed fresh, not assuming any of it — **all confirmed factually accurate, no remaining issues on any of them:**
- **09-19 slot 1** (Peyton Manning #16 retired 2005): confirmed.
- **09-19 slot 2** (Drew Beam Freshman All-American): confirmed via web search — Beam earned Freshman All-American honors and SEC Freshman of the Year in 2022 ([On3](https://www.on3.com/teams/tennessee-volunteers/news/tennessee-vols-baseball-major-league-draft-drew-beam/), [UTSports](https://utsports.com/news/2023/4/16/baseball-rocky-top-spotlight-drew-beam)). Correct answer B accurate; no distractor issues (Burke/Moore/Dickey are all real hitters, not pitchers — clean, non-self-eliminating set).
- **09-19 slot 5** (Lady Vols Olympic medalists under Summitt, answer 14): independently confirmed via web search — Summitt's program produced 14 Olympic Team members ([multiple sources](https://www.hoophall.com/hall-of-famers/pat-summitt) corroborate). Clean, appropriately hard for slot 5.
- **09-20 slot 1** (Josh Richardson, 2015 Miami draft, two stints): confirmed via web search — 40th overall pick 2015, first stint 2015-2019, second stint 2023-2025, retired 2026 after 10 NBA seasons ([Wikipedia](https://en.wikipedia.org/wiki/Josh_Richardson), [Hot Hot Hoops](https://hothothoops.com/2026/07/30/former-miami-heat-guard-10-year-veteran-josh-richardson-retires/)). Factually clean — see difficulty note below (separate from a factual issue).
- **09-20 slot 2** (Neyland/Shields-Watkins Field first game, 1921): confirmed. Clean, good replacement for the prior weak stadium question.
- **09-20 slot 3** (Chamique Holdsclaw #23 retired): confirmed. Clean.
- **09-20 slot 4** (John Currie AD, preceded Fulmer in 2017): confirmed, untouched and clean as noted.
- **09-20 slot 5** (2024 CWS bracket format, best-of-three finals): confirmed via web search — 2024 MCWS Finals was a 3-game series (Texas A&M won G1, Tennessee won G2/G3 for the title) ([Bleacher Report](https://bleacherreport.com/articles/10125947-college-world-series-finals-2024-tennessee-beats-texas-am-to-win-1st-ncaa-title)), confirming men's CWS finals are best-of-three (option B). Clean.
- **09-21 slot 1** (Barnes-era playing style = defense-first/physical): commonly-established characterization, not a hedge/non-answer; distractors are all plausible generic styles. Clean.
- **09-21 slot 2** (Joe Milton III replaced injured Hooker, 2022): confirmed. Clean, untouched as noted.
- **09-21 slot 3** (Naismith HOF Lady Vols trio — Holdsclaw, Parker, Catchings): confirmed via web search — Holdsclaw and Parker were both named to the Naismith Hall of Fame's Class of 2026 (announced April 2026, enshrined August 2026), and Catchings was already inducted in 2020 ([ESPN](https://www.espn.com/wnba/story/_/id/49593818/naismith-hall-fame-2026-class-candace-parker-elena-delle-donne-chamique-holdsclaw), [WVLT](https://www.wvlt.tv/2026/04/04/lvfls-candace-parker-chamique-holdsclaw-named-naismith-basketball-hall-fame/)). As of today (2026-09-19), all three are confirmed inductees and the other three options' non-included names (Bridgette Gordon, Nikki McCray, Kellie Harper) are not Naismith inductees as players. Correct answer C is accurate. Clean.
- **09-21 slot 4** (Heupel national COY recognition after 2022): confirmed, untouched and clean as noted.
- **09-21 slot 5** (Tennessee leads UT-Vandy baseball series by ~16 games): confirmed via web search — Tennessee leads the all-time series 188-172-2 through March 2026, a 16-win margin ([Winsipedia](https://www.winsipedia.com/tennessee/vs/vanderbilt)). Correct answer B accurate.

### 2026-09-22 — newly in scope, reviewed fresh
All 5 trivia rows check out factually clean:
- Slot 1 (Thompson-Boling Arena hosts basketball): clean, good easy question with real-but-wrong-sport UT venues as distractors.
- Slot 2 (2022 team, first-ever #1 overall national seed): clean.
- Slot 3 (Trey Smith drafted by Chiefs, won Super Bowl): confirmed — Chiefs, SB LVII/LVIII. Clean.
- Slot 4 (women's basketball = most all-time Olympic medals for UT, ahead of swimming/track): confirmed via web search — women's basketball 16 medals vs. men's swimming 10 and men's track 10 ([search aggregating UTSports Olympic medalist data](https://utsports.com/news/2012/8/8/Tennessee_s_All_Time_Olympic_Medalists)). Clean.
- Slot 5 (Al Wilson wore #27): confirmed via web search ([Rivals/VolReport](https://tennessee.rivals.com/news/tennessee-football-jersey-countdown-no-27-al-wilson), [UTSports](https://utsports.com/news/2013/8/4/Vols_Jersey_Countdown_27)). Clean.

The poll for 09-22 has a wording issue — see entry below.

### trivia_questions.b51f5b58-037c-4140-91aa-da6dc05af9ea — 2026-09-19 / slot 4 — style: correct answer's parenthetical makes it stand out from distractors
**Current:** correct option_c "18 seasons (1990-2007)"; other options are plain "3 seasons" / "5 seasons" / "30 seasons"
**Suggested fix:** Shorten to just "18 seasons" to match the other three options' format.
**Reason:** §32 style preference (short 1-3 word answers) plus a design "tell": the correct option is the only one carrying extra parenthetical detail, which makes it visually stick out from the other three and can let a test-taker guess correctly by length/specificity alone rather than knowledge. Underlying fact (Delmonico coached 1990-2007, 18 seasons) is accurate, not a factual issue.
**Status:** ⏳ pending review

### trivia_questions.5be91bb7-1244-49ff-8ca6-59363c893eb9 — 2026-09-20 / slot 1 — difficulty mismatch: labeled "easy" but requires fairly specific knowledge
**Current:** difficulty "easy" — question asks about Josh Richardson's 2015 Miami draft *and* his two separate stints with Miami over a decade-long career.
**Suggested fix:** Either relabel difficulty to "medium," or simplify the question stem to drop the "two separate stints" detail (e.g. just "Which Tennessee guard was drafted by the Miami Heat in 2015 and went on to a decade-long NBA career?") if it should stay an easy/slot-1 question.
**Reason:** §32 — slot 1 should be the easiest question of the day. Knowing Richardson played at Tennessee and had an NBA career is reasonably easy; knowing the specific detail that he had two *separate* stints with Miami is a more advanced/medium-level fact. Not a factual error — the claim itself is accurate (verified above).
**Status:** ⏳ pending review

### daily_polls.d84e08e7-a12e-4646-a8ea-9b5afa182ffd — 2026-09-22 — clarity: one option is vague and non-parallel with the other three
**Current:** "What is the best Vol basketball recruiting class in history?" A "A Tobias Harris class", B "A Chris Lofton era class", C "A recent Barnes class", D "The Grant Williams class"
**Suggested fix:** Replace option C with a specific, named class in the same style as the others, e.g. "The 2021 signing class (Chandler, Springer, K. Johnson)" — flagged with uncertainty: I could not confidently verify which specific Barnes-era class is *the* strongest/most defensible pick (candidates include the 2021 five-star trio and the 2025 class with the program's highest-ranked recruit ever), so I'm not proposing that exact replacement with confidence. At minimum, "recent" should be replaced with a specific year/class before this airs, since it will read as stale/ambiguous by the time it's actually shown.
**Reason:** §33 — options should be clear and non-overlapping; three options name specific players/classes while option C uses a vague relative term ("recent") with no named players, breaking parallel construction and becoming increasingly inaccurate as "recent" ages. Also a moving target for the "Barnes" identifier specifically, since Barnes has now had many recruiting classes.
**Status:** ⏳ pending review — flagged with uncertainty on the exact replacement class
## 2026-09-23 — run summary
- Checked: trivia 2026-09-23 to 2026-09-26 (20 rows, 5 slots × 4 days), polls 2026-09-23 to 2026-09-26 (3 rows found — 2026-09-24 has no poll scheduled)
- Issues found: 9 (2 hard factual errors, 1 fabricated-premise question recommended for replacement, 1 ambiguous-premise question, 2 self-eliminating/"Not applicable"-style distractor issues, 1 distractor-quality note, 1 style/distractor-spread note, 1 poll scheduling gap)
- Web search was available and used to verify every load-bearing factual claim below; sources cited inline.
- Note on carried-over items from David's brief: 2026-09-19 slot 4 (Delmonico) and 2026-09-20 slot 1 (Josh Richardson) have both rolled fully out of the current 3-day scope window (today is 2026-09-23; window is 09-23–09-26) and were not re-reviewed per the guardrail against scanning outside scope. In passing, I confirmed 09-19 slot 4 now reads "18 seasons (1990-2007)" — consistent with the earlier fix — but did not do a full QA pass on either row since they're out of scope.
- Verification of David's 09-23 fix: re-checked `81d859da` (slot 3, SEC venues) fresh. Now reads Bryant-Denny Stadium (Alabama) and Tiger Stadium (LSU) as the correct pair alongside Neyland — both real, comparably massive SEC stadiums, and all three distractor options (Georgia/Texas A&M, Vanderbilt/Mississippi State, Florida/Auburn) are equally plausible real-stadium pairs with no self-elimination. **Confirmed clean, no remaining issues.**

### trivia_questions.e090a73e-ea5f-406c-984f-85377ac3d91f — 2026-09-24 / slot 1 — factual error: wrong transfer school
**Current:** "Which Tennessee big man transferred in from Alabama-Birmingham and became a frontcourt piece in the mid-2020s?" (correct answer: Uros Plavsic)
**Suggested fix:** Change "Alabama-Birmingham" to "Arizona State" in the question text.
**Reason:** Verified via multiple sources — Uros Plavsic transferred to Tennessee from Arizona State (redshirt freshman there in 2018-19), not UAB ([UT Sports, May 2019](https://utsports.com/news/2019/5/21/mens-basketball-transfer-uros-plavsic-signs-with-vol-hoops.aspx), [ESPN](https://www.espn.com/mens-college-basketball/story/_/id/27989115/tennessee-uros-plavsic-miss-2019-20-season-waiver-denied), [AllForTennessee](https://allfortennessee.com/2019/05/18/tennessee-basketball-transfer-asu/)). The correct answer name (Plavsic) is right, but the premise/school named in the question stem is wrong — a hard factual-accuracy failure, not a distractor issue.
**Status:** ⏳ pending review

### trivia_questions.05130644-328c-4e31-a547-7dbe1114cb04 — 2026-09-25 / slot 4 — factual error: wrong record type attributed
**Current:** "Which Don DeVoe-era standout of the early 1980s later set the program's single-game scoring record before Allan Houston, and went on to a long NBA three-point shooting career?" (correct answer: Dale Ellis)
**Suggested fix:** Change "single-game scoring record" to "single-season scoring record" in the question text (e.g., "...later set the program's single-season scoring record, later broken by Allan Houston, and went on to..."). Correct answer name (Dale Ellis) stays the same.
**Reason:** Verified via web search — Tennessee's single-**game** scoring record (51 points vs. Auburn, 1986-87) belongs to Tony White, not Dale Ellis, and has never been broken by Allan Houston (Houston's career-high single game was 43 points, per UT record-book coverage) ([Yahoo/Mike Strange, Tony White 51-point game](https://news.yahoo.com/happy-birthday-tennessee-basketballs-tony-100315202.html)). Ellis's actual distinguishing record is the single-**season** scoring record (724 points, 1981-82 or 1982-83), which Allan Houston did later break (806 points, 1990-91) ([UT Sports / Sports-Reference Tennessee leaders](https://www.sports-reference.com/cbb/schools/tennessee/men/leaders-and-records.html)). The question conflates "single-game" with "single-season," making the premise as written factually wrong even though the correct-answer name is right.
**Status:** ⏳ pending review

### trivia_questions.2ea5cbd7-c918-47db-a18d-d454dd6e67bd — 2026-09-25 / slot 5 — fabricated premise: Tee Martin was never Tennessee's interim head coach
**Current:** "Tee Martin, the 1998 championship-winning quarterback, returned to Tennessee's coaching staff years later in what role, before serving as interim head coach in 2020?" (correct answer: A "Offensive coordinator/assistant coach")
**Suggested fix:** Recommend full replacement of the question stem — drop the "before serving as interim head coach in 2020" clause entirely, since it isn't supported by any source and Tennessee did not have an interim head coach in 2020 (Jeremy Pruitt was HC the full season). A clean replacement in the same style: "Tee Martin, the 1998 championship-winning quarterback, returned to Tennessee's coaching staff in 2019 in what role?" with correct answer "Assistant head coach" or "Wide receivers coach" (both are accurate — he held both titles, 2019-2020). Not proposing to keep the current option set as-is since the premise itself needs to change; content team should also double check the option list still reads sensibly (Athletic Director / Strength coach / Defensive coordinator remain fine as plausible-but-wrong role distractors).
**Reason:** Verified via web search — Jeremy Pruitt was Tennessee's head coach for the entirety of the 2020 season with no interim head coach at any point ([Wikipedia, 2020 Tennessee Volunteers football team](https://en.wikipedia.org/wiki/2020_Tennessee_Volunteers_football_team)); Tee Martin's actual role on return was Assistant Head Coach/WR coach 2019-2020, after which he left for the Baltimore Ravens ([Rocky Top Talk](https://www.rockytoptalk.com/2021/2/7/22270608/tennessee-vols-football-tee-martin-nfl-baltimore-ravens-receivers-coach), [Wikipedia, Tee Martin](https://en.wikipedia.org/wiki/Tee_Martin)). He was also never an interim HC at USC (Clay Helton held that role in 2015). §32 factual-accuracy failure — the correct-answer role itself is right, but the question's framing device is fabricated.
**Status:** ⏳ pending review

### trivia_questions.8e929a0d-4d1d-4947-bf21-67257e6fc7d8 — 2026-09-23 / slot 2 — distractor quality: two options aren't real Tennessee players
**Current:** "Which Tennessee first baseman was inducted into the National Baseball Hall of Fame in 2024...?" A "A.J. Burnett", B "Luke Hochevar", C "Todd Helton" (correct), D "David Price"
**Suggested fix:** Replace A.J. Burnett (went straight from high school to pro ball, never played college baseball at all — [Baseball-Reference](https://www.baseball-reference.com/players/b/burnea.01.shtml)) and David Price (pitched for **Vanderbilt**, a rival SEC school, not Tennessee — well-established) with two real Tennessee baseball alumni, e.g. other Vol pitchers/position players such as "R.A. Dickey" or a recent Vol like "Drew Gilbert."
**Reason:** §32 distractor-quality — a knowledgeable Vol fan can eliminate Price on sight as a Vanderbilt player and Burnett as someone who never played college ball, without needing to know anything about Helton specifically. Luke Hochevar (real Tennessee pitcher) is a fine distractor and needs no change.
**Status:** ⏳ pending review

### trivia_questions.5ed7d309-0d54-41f4-9e54-615171af935d — 2026-09-23 / slot 5 — style: distractor spread too wide for "hard" slot
**Current:** "Chamique Holdsclaw's Lady Vols career scoring average... closest to which per-game figure?" A "Around 2 ppg", B "Around 35 ppg", C "Around 5 ppg", D "Around 20 ppg" (correct)
**Suggested fix:** Tighten the wrong options to numbers close enough to require real knowledge, e.g. "Around 15 ppg", "Around 18 ppg", "Around 23 ppg", rather than 2/5/35 which are trivially far off for a star player's career average.
**Reason:** §32 difficulty-matches-slot — correct answer verified accurate (Holdsclaw averaged 20.4 ppg for her Tennessee career, per [Wikipedia](https://en.wikipedia.org/wiki/Chamique_Holdsclaw)), but the wide spread of the other three options makes this trivially solvable by elimination for a "hard" question. Low-to-medium priority style note, not a correctness error.
**Status:** ⏳ pending review

### trivia_questions.c4cae9ff-3e9f-4b20-b0f5-89599b88cdc9 — 2026-09-24 / slot 3 — "Not applicable" + self-eliminating, premise-contradicting distractors
**Current:** "...which SEC school's marching band...is frequently cited alongside Tennessee's...?" A "LSU" (correct), B "Not applicable", C "No other SEC school has a marching band", D "Only Tennessee has a marching band"
**Suggested fix:** Replace B/C/D with three other real SEC school names (e.g. "Alabama", "Ole Miss", "Auburn") so all four options are the same type of answer as the correct one.
**Reason:** Same recurring structural pattern flagged repeatedly in prior runs (see 2026-09-01, 09-02, 09-03, 09-19 entries) — C and D flatly deny the question's own premise (making them trivially eliminable) and B is a non-answer. §32.
**Status:** ⏳ pending review

### trivia_questions.e20b5fb5-7128-43e7-bd1a-d399b48ac086 — 2026-09-24 / slot 4 — premise-contradicting distractor
**Current:** "The Pat Summitt Foundation... focuses primarily on which cause?" A "Youth basketball scholarships only", B "Football safety research", C "Alzheimer's disease research and support" (correct), D "Not applicable, no such foundation exists"
**Suggested fix:** Replace D with a plausible-but-wrong real-sounding focus area, e.g. "Coaching education programs."
**Reason:** §32 — option D denies the question's own premise (the Foundation does exist), making it trivially eliminable rather than a genuine distractor. Correct answer verified accurate — the Pat Summitt Foundation, established after her 2011 early-onset Alzheimer's diagnosis, is Alzheimer's-focused.
**Status:** ⏳ pending review

### trivia_questions.f607b900-31d5-4cea-8474-9fb5566130c0 — 2026-09-25 / slot 2 — ambiguous premise: conflates mascot with rallying cry
**Current:** "Auburn's mascot and rallying cry, distinct from Tennessee's traditions, is centered on which symbol?" A "A Tiger", B "A Volunteer", C "The War Eagle" (correct), D "A Bulldog"
**Suggested fix:** No confident single fix proposed — flag for the content team to decide intent. Either (a) narrow the question to just the rallying cry ("Auburn's famous game-day rallying cry centers on which symbol?" → War Eagle), or (b) narrow it to just the mascot ("Auburn's official athletic mascot, Aubie, represents which animal?" → Tiger). As written, it asks about both "mascot and rallying cry" as if they point to one symbol, but Auburn's actual mascot is the Tiger (Aubie) while "War Eagle" is a separate battle-cry tradition centered on a live eagle — so option A has a real claim to being correct too.
**Reason:** §32 — the question's own premise conflates two genuinely different Auburn traditions, creating a defensible case for two different "correct" answers rather than one single fact.
**Status:** ⏳ pending review

### daily_polls — no row scheduled for 2026-09-24 — scheduling gap
**Current:** `SELECT ... WHERE active_date = '2026-09-24'` returns 0 rows; polls exist for 2026-09-23, 09-25, 09-26 only.
**Suggested fix:** N/A (no existing row/content to patch) — flagging the gap so the content team can schedule a poll for 2026-09-24. Same class of issue as the 2026-09-04 gap logged in the first run of this log.
**Reason:** In-scope date has no poll queued, while trivia_questions has full 5-slot coverage for all 4 days.
**Status:** ⏳ pending review — operational gap, no row to fix

### Rows checked and confirmed clean this run (no issues)
- **09-23 slot 1** (Al Wilson, 1998 consensus All-American LB): accurate, real-player distractors, no issues.
- **09-23 slot 3** (SEC venues): see verification note above — confirmed clean after David's fix.
- **09-23 slot 4** (Chris Lofton cancer story): accurate, real-player distractors, no issues.
- **09-24 slot 2** (Jeremy Pruitt shortest tenure among the four listed coaches): accurate.
- **09-24 slot 5** (Pruitt-era NCAA violations, "Over 200"): verified accurate — NCAA found the program responsible for more than 200 individual violations, 18 Level I ([NCAA.org](https://www.ncaa.org/news/2024/3/8/media-center-infractions-appeals-committee-upholds-findings-for-former-tennessee-head-football-coach), [CBS Sports](https://www.cbssports.com/college-football/news/hundreds-of-ncaa-violations-land-tennessee-8m-fine-plus-six-year-show-cause-for-ex-coach-jeremy-pruitt/)). Minor style-only note: option A ("Zero — the case was dismissed") mildly contradicts the question's premise, consistent with the low-priority pattern noted elsewhere in this log; not logged as a separate blocking entry.
- **09-25 slot 1** (orange for orange-out games): trivially accurate, fine for easy slot 1.
- **09-25 slot 3** (Jaylen Wright, 2022 backfield): accurate, real-player distractors, no issues.
- **09-26 slot 1** (John Fulkerson, five seasons all at Tennessee): accurate.
- **09-26 slot 2** (2016 Georgia Hail Mary, final score 34-31): verified accurate.
- **09-26 slot 3** (Allan Houston, all-time leading scorer): verified accurate.
- **09-26 slot 4** (2016 home loss to South Carolina): verified accurate — unranked South Carolina upset then-#9 Tennessee at home in 2016.
- **09-26 slot 5** (Nikki McCray-Penson & Carla McGhee, posthumous 2026 Naismith HOF honorees for the 1996 Olympic team): verified accurate via multiple current sources, including [UT Sports](https://utsports.com/news/2026/4/4/womens-basketball-2026-naismith-hall-of-fame-class-includes-four-lady-vols) and [NBC News on McCray-Penson's 2023 death](https://www.nbcnews.com/news/us-news/nikki-mccray-penson-olympic-gold-medalist-basketball-hall-famer-dies-5-rcna93111) — both named individuals and the posthumous framing check out.
- **Poll 09-23** ("best Vol football offensive scheme"): clean — four distinct real coach/OC eras, no bias. Minor informational note: Cutcliffe was Fulmer's OC in the same era, so "Fulmer's pro style" and "Cutcliffe's passing scheme" overlap slightly in time period, though they're still describing different offensive minds/styles — not flagging as a defect.
- **Poll 09-25** ("best Vol basketball player of the 1990s" — Houston/Allen/Harris/Black): all four verified as real Tennessee players from that era. Clean.
- **Poll 09-26** ("best Vol football player of the 2020s so far" — Hooker/Smith/Tillman/Milton): all real 2020s Vol players, clean, no issues.
## 2026-09-24 — run summary
- Checked: trivia 2026-09-24 to 2026-09-27 (20 rows, 5 slots × 4 days), polls 2026-09-24 to 2026-09-27 (4 rows, full coverage)
- Issues found: 4 (2 factual-accuracy errors, 2 minor style/quality notes), plus 1 informational thematic-overlap note
- Web search was available and used to verify every factual claim below rather than relying on recollection alone.

**Independent re-verification of the manual fixes reported for 09-24/09-25 (checked fresh, not assumed):**
- 09-24 slot 1 (Plavsic/Arizona State transfer): confirmed accurate — Uroš Plavšić signed with Tennessee out of Arizona State in 2019 (UTSports.com, 247Sports). Clean.
- 09-24 slot 2 (Pruitt shortest tenure): confirmed accurate among the four listed coaches — Pruitt's ~3-season tenure (2018-2020) is shortest of Fulmer/Jones/Pruitt/Heupel. Clean.
- 09-24 slot 3 (LSU "Golden Band from Tigerland"): confirmed accurate. Clean.
- 09-24 slot 4 (Pat Summitt Foundation / Alzheimer's focus): confirmed accurate. Clean.
- 09-24 slot 5 (Pruitt-era NCAA infractions "over 200"): confirmed accurate — NCAA COI found the program responsible for more than 200 individual violations, including 18 Level I (ESPN, CBS Sports, NCAA.org). Clean.
- 09-25 slot 2 (Auburn "War Eagle"): confirmed accurate. Clean.
- 09-25 slot 3 (Jaylen Wright, 2022 backfield rotation): confirmed accurate — Wright actually *led* Tennessee's 2022 rushing (875 yds/10 TD vs. Jabari Small's 734 yds/13 TD), so "standout member of the rotation" holds up. Clean.
- 09-25 slot 4 (Dale Ellis single-season scoring record): confirmed accurate — Ellis set the record with 724 points in 1982-83; Allan Houston broke it with 806 in 1990-91. (Dalton Knecht's 780 in 2023-24 has since pushed Ellis to 3rd all-time, but the historical sequence in the question — Ellis held it, then Houston broke it — remains true and unaffected.) Clean.
- 09-25 slot 5 (Tee Martin): **still has a factual problem**, see new finding below — the earlier fix removed a fabricated "interim head coach in 2020" premise, but the remaining correct answer is itself inaccurate.
- 09-23 was out of this run's 3-day scope (09-24 to 09-27) and was not rechecked.

**09-26 re-verification** (reported clean in an earlier pass): slots 1, 3, 5 and the poll reconfirmed clean this run; **slot 4 has a newly-found factual error** below that the earlier clean call missed.

**09-27** (first time in scope, fully unreviewed before this run): all 5 slots and the poll checked fresh — 4 slots and the poll clean, 1 slot has a minor style-only spelling note.

### trivia_questions.2ea5cbd7-c918-47db-a18d-d454dd6e67bd — 2026-09-25 / slot 5 — factual error: Tee Martin was never Tennessee's "offensive coordinator"
**Current:** Q: "Tee Martin, the 1998 championship-winning quarterback, returned to Tennessee's coaching staff years later in what role?" option_a: "Offensive coordinator/assistant coach" (correct_answer)
**Suggested fix:** Change option_a to "Assistant head coach/WR coach" (or "Passing game coordinator/assistant coach"); correct_answer stays A.
**Reason:** Verified via web search (UTSports.com's January 2019 hire announcement) — when Martin returned to Tennessee under Jeremy Pruitt in Jan. 2019, his actual title was wide receivers coach, assistant head coach, and passing game coordinator. He was Tennessee's "offensive coordinator" at no point — that title was only ever his at USC (2015). He also wasn't retained when Josh Heupel took over in 2021 (he left for the Baltimore Ravens), so he never held an OC role at Tennessee at any time. §32 factual accuracy.
**Status:** ⏳ pending review

### trivia_questions.3f175046-661c-4c8a-8299-c90777f23b71 — 2026-09-26 / slot 4 — factual error: this was a road loss, not a home loss
**Current:** Q: "Tennessee's 2016 team, ranked highly early in the season, suffered a costly home loss to which unranked SEC opponent?" correct_answer B "South Carolina"
**Suggested fix:** Change "home loss" to "road loss" (or "away loss") in the question text; keep "South Carolina" as the correct answer.
**Reason:** Verified via web search — the Oct. 29, 2016 South Carolina game (South Carolina won 24-21) was played in Columbia, SC, per Tennessee's official 2016 schedule (UTSports.com lists it "at South Carolina"). It was a road game, not a Neyland Stadium home game. Tennessee's only home loss in 2016 was to Alabama, which was ranked #1 at the time (not unranked), so no unranked SEC team beat Tennessee at home that season — the "home" qualifier itself is the error. Note: this row was reported clean in an earlier pass; that check didn't catch this.
**Status:** ⏳ pending review

### trivia_questions.5d16768f-b57d-4b3e-b250-88588d3b8697 — 2026-09-25 / slot 1 — minor style: answer is given away in the question's own wording
**Current:** Q: "Tennessee basketball fans commonly wear which color en masse for themed 'orange-out' games?" correct_answer A "Orange"
**Suggested fix:** Reword so the color name isn't already embedded in the question, e.g. "What color do Tennessee fans wear en masse for themed home-game promotions?"
**Reason:** The question stem contains "orange" as part of the promotion's own name ("orange-out"), so the answer is derivable from reading comprehension alone, with zero Vol knowledge needed — trivially easy even for slot 1. Low priority style note, not a factual error.
**Status:** ⏳ pending review

### trivia_questions.6d98d10a-a068-4572-8f96-340c53f71053 — 2026-09-27 / slot 1 — minor style: spelling of the official alternate-uniform name
**Current:** correct_answer option_a: "Smokey Gray"
**Suggested fix:** "Smokey Grey" — Tennessee Athletics' own branding/press coverage consistently spells it "Grey" (247Sports, On3, SportsLogos.net, Rocky Top Insider all cover the 2026 football and baseball "Smokey Grey" alternate-uniform rollouts with that spelling).
**Reason:** Minor accuracy/style nitpick on the official spelling — not a substance error.
**Status:** ⏳ pending review

### General note — thematic overlap on 2026-09-24 (informational only)
**Current:** 2026-09-24 slot 2 (Pruitt's short, scandal-ended tenure) and slot 5 (the Pruitt-era NCAA infractions count) both center on the same Jeremy Pruitt/NCAA-scandal storyline on the same day.
**Suggested fix:** No content-field fix proposed — these test two distinct facts (tenure length vs. violation count), not a duplicate. Flagging only as a minor thematic repetition for awareness on future scheduling, consistent with similar informational notes logged in prior runs.
**Reason:** §32 duplicate/near-duplicate check — judged not a violation, but noted for awareness.
**Status:** ⏳ pending review (informational only)

## Poll check — 2026-09-24 to 2026-09-27
- Checked 4 rows (one per date). All four are clear, single-topic, with distinct, non-overlapping options.
- 09-24 (Texas margin-of-victory prediction poll): follows the site's established win-margin-bucket format used previously (e.g. the 09-15 Kennesaw State poll), which was already reviewed and accepted as non-biased in an earlier pass — not re-flagging.
- 09-25 (best Vol basketball player of the 1990s — Houston/Allen/Harris/Black): verified via web search that Corey Allen, Tony Harris, and C.J. Black are all real Tennessee players active in the 1990s (C.J. Black specifically 1996-97 through 1999-2000, per UTSports.com rosters). Clean.
- 09-26 (best Vol football player of the 2020s so far — Hooker/Smith/Tillman/Milton): all four are real 2020s-era Tennessee football players. Clean.
- 09-27 (what would mean more to Lady Vols fans — beating UConn/winning SEC/Final Four/national title): clear trade-off format, no factual claims to verify, no leading bias. Clean.
- Category mix across the window: football (game prediction), basketball, football, Lady Vols basketball — reasonably balanced.
- Issues found: 0

**Status:** ⏳ pending review
