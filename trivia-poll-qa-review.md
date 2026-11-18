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

## 2026-09-28 — run summary
- Checked: trivia 2026-09-28 to 2026-10-01 (20 rows, 5 slots × 4 days), polls 2026-09-28 to 2026-10-01 (4 rows)
- Issues found: 11 (4 factual-accuracy errors, 2 of which are unsalvageable-premise replacements; 4 self-eliminating-distractor/broken-structure issues; 2 minor style notes), plus 1 informational-only note — poll section below has 2 additional factual errors
- Web search was used to verify every factual claim below rather than relying on recollection alone; this window (09-28 through 10-01) had not been reviewed in any prior run.

### trivia_questions.4ed76caa-616e-4504-971f-b9a9ea0035cc — 2026-09-28 / slot 1 — factual error (wrong ranking) + self-eliminating distractor
**Current:** Q: "As of the mid-2020s, Tennessee's all-time win total ranks in roughly what position among all FBS programs?" A "2nd", B "Around 10th" (correct), C "Outside the top 100", D "50th"
**Suggested fix:** Change option_b to "Around 14th" (correct_answer stays B); separately replace option_c "Outside the top 100" with a more plausible wrong ranking, e.g. "Around 25th".
**Reason:** Verified via multiple sources (Sports Illustrated's 2025 winningest-programs ranking, Sports-Reference) — Tennessee's all-time record (881-420-53, .670) currently ranks 14th, not "around 10th," a large enough gap that "roughly" doesn't cover it. Separately, "Outside the top 100" is self-eliminating for a 130+-year blue-blood program — no knowledgeable fan needs any specific ranking knowledge to rule it out. §32 factual accuracy + self-eliminating distractor.
**Status:** ⏳ pending review

### trivia_questions.bac11872-57e9-4046-bbf8-753f3b49de5d — 2026-09-28 / slot 4 — broken structure, non-answer distractors (unsalvageable)
**Current:** Q: "Has Tennessee had multiple players contend for the program's all-time career stolen-base record across different eras?" A "Not applicable", B "The record belongs to a football player", C "No stolen bases have ever been recorded for Tennessee", D "Yes, across both earlier eras and the modern Vitello era" (correct)
**Suggested fix:** Full replacement recommended — rebuild as a direct question naming the actual career stolen-base record holder(s), with three other real Tennessee baseball player names as distractors, rather than a yes/no dressed up as 4 options.
**Reason:** §32 — three of four options are non-answers or absurd/self-eliminating rather than genuine competing facts ("Not applicable" and "no stolen bases ever recorded" are transparently false for any real baseball program; "belongs to a football player" doesn't answer a stolen-base question). This is the same broken pattern flagged repeatedly in past runs (e.g. 09-01's "Not applicable"/True-False issues). **Flagging as uncertain** — I have not verified who actually holds Tennessee's career stolen-base record, so I'm not proposing specific replacement names; recommend verifying before drafting the replacement.
**Status:** ⏳ pending review — flagged as uncertain (replacement names unverified)

### trivia_questions.9dba8f09-2f10-40ef-827b-3ba6ca6cb5bd — 2026-09-28 / slot 5 — self-eliminating distractor
**Current:** Q: "What is the general historical head-to-head trend between Tennessee and Kentucky in football?" A "The series is dead even", B "Kentucky leads the all-time series", C "Tennessee holds a large historical advantage" (correct), D "They have never met"
**Suggested fix:** Replace D with a plausible wrong answer, e.g. "Kentucky leads by a slim margin."
**Reason:** §32 — D is self-eliminating; Tennessee-Kentucky ("Battle for the Beer Barrel") is a long-running annual SEC series, obviously false to any fan regardless of specific knowledge of the series record. Minor secondary note: the "general historical trend" framing is vaguer than the site's usual crisp-fact format — the correct answer is directionally accurate (Tennessee leads by a wide margin) but not tied to a specific number; consider tightening to the actual series record if verified.
**Status:** ⏳ pending review

### trivia_questions.050a6884-3e92-4360-a468-ddcb48ebd251 — 2026-09-29 / slot 2 — self-eliminating distractor
**Current:** Q: "Neyland Stadium's seating capacity exceeds how many fans?" A "50,000", B "150,000", C "100,000" (correct), D "25,000"
**Suggested fix:** Replace B "150,000" with a more plausible number in range, e.g. "85,000."
**Reason:** §32 — no college football stadium in the country has anywhere near 150,000 capacity (the largest, Michigan Stadium, is ~107k), so B is immediately eliminable as absurd without any Neyland-specific knowledge. Neyland's actual capacity (~101,915) confirms C is correctly the intended answer.
**Status:** ⏳ pending review

### trivia_questions.d979f4ad-1600-4d65-9759-4e6978e921b5 — 2026-09-29 / slot 5 — minor style: hedge/compound correct answer
**Current:** Q: "...how many Olympians...per the program's own count through the 2020s?" correct_answer A "Around 24 (men's) plus additional Lady Vol Olympians"
**Suggested fix:** Tighten to a single specific figure rather than a compound/hedged answer — e.g. a verified combined men's+women's total, if available, or keep strictly to the men's-only framing and drop the "plus additional" qualifier.
**Reason:** Verified the "~24 men's Olympians" figure is roughly accurate (UT Athletics has cited 24 men's Olympians over program history; one source separately cites 43 combined men's+women's). Not a factual error, but the "plus additional" phrasing is a soft hedge rather than a single defensible fact, per §32's hedge guidance. Low priority style note.
**Status:** ⏳ pending review

### trivia_questions.d507096f-9f76-445b-8ad1-8df6a5927c8a — 2026-09-30 / slot 1 — informational only (editorial note, not a §32 violation)
**Current:** Q: "Tennessee's official fight song, distinct from 'Rocky Top,' is called what?" A "Dixie", B "Down the Field" (correct), C "Fight, Vols, Fight", D "Sweet Caroline"
**Suggested fix:** No factual correction needed — verified "Down the Field" is in fact Tennessee's official fight song. Optional: consider swapping "Dixie" for a different wrong answer given the song's strong Confederacy/racial associations, even used only as an intentionally-wrong distractor on a public-facing site.
**Reason:** Flagging for awareness only, consistent with prior "informational only" notes logged in this file — not a factual-accuracy or structural issue.
**Status:** ⏳ pending review (informational only)

### trivia_questions.bdfc744d-520c-413c-b1da-6dd849aa98e5 — 2026-09-30 / slot 4 — factual error, false premise (unsalvageable)
**Current:** Q: "Tennessee's first-ever #1 overall NCAA Tournament seed came in which season?" A "2007-08", B "2018-19" (correct), C "2000-01", D "1976-77"
**Suggested fix:** Full replacement — Tennessee men's basketball has never received a #1 overall NCAA Tournament seed in program history (verified via multiple current sources, including an NCAA.com all-time #1-seeds piece that doesn't list Tennessee). The 2018-19 team actually received a #2 seed (South Region; beat Colgate and Iowa, lost the Sweet 16 to Purdue). Recommend replacing with: "What seed did Tennessee's 2018-19 team — which reached the Sweet 16 — receive in the NCAA Tournament?" A "1-seed", B "2-seed" (correct), C "4-seed", D "6-seed."
**Reason:** §32 factual accuracy — the entire premise is false, not just the specific year, so no option in the current set can be made correct by patching alone.
**Status:** ⏳ pending review

### trivia_questions.e3dda0d2-e1cb-47f6-9e92-969b06bfc2a4 — 2026-09-30 / slot 5 — factual error: wrong decade, correct decade missing from options
**Current:** Q: "Permanent lighting for regular night games was added to Neyland Stadium in which decade?" A "1950s", B "1920s", C "1990s" (correct), D "2000s"
**Suggested fix:** Replace option_b "1920s" (least plausible of the current wrong options) with "1970s," and change correct_answer to that letter.
**Reason:** Verified via multiple sources — lights were installed as part of the 1972 south-end upper-deck expansion specifically to enable Neyland Stadium's first-ever night game (Sept. 16, 1972 vs. Penn State). No source found supports a separate "1990s" permanent-lighting installation; every account of the stadium's lighting history points to 1972. §32 factual accuracy.
**Status:** ⏳ pending review

### trivia_questions.22487837-bef2-45ac-85a4-9e2e74ac57d1 — 2026-10-01 / slot 3 — broken True/False structure, non-answer distractors (unsalvageable)
**Current:** Q: "The Lady Vols program has produced multiple dominant single-season rebounding performances across different eras, including Chamique Holdsclaw's. True or false?" A "Not applicable", B "Only guards have led in rebounding", C "No rebounding records exist for the Lady Vols", D "Yes" (correct)
**Suggested fix:** Full replacement recommended — rebuild as a standard 4-option question naming actual single-season rebounding record-holders across eras (e.g. Holdsclaw-era vs. a more modern name) as concrete, verifiable answer options, rather than a True/False dressed up to satisfy the NOT NULL constraint.
**Reason:** §32 — same recurring broken-structure pattern: none of A/B/C is a real competing answer (all are non-answers or self-eliminating), and the underlying True/False framing itself needs rebuilding per the guardrail on broken True/False questions. **Flagging as uncertain** — I have not independently verified specific record-holder names to propose as replacement options, so recommend verifying before drafting.
**Status:** ⏳ pending review — flagged as uncertain (replacement names unverified)

### trivia_questions.0e94db66-3b04-4ab4-972e-b1d19e8be851 — 2026-10-01 / slot 4 — self-eliminating distractor + unverified hedge correct answer
**Current:** Q: "Under Josh Heupel, how has Tennessee generally fared in games decided by one score?" A "Exactly .500", B "Overwhelmingly poor", C "Generally favorably, contributing to a strong overall winning percentage" (correct), D "No such games have occurred"
**Suggested fix:** Replace D with a plausible wrong answer (e.g. "Roughly break-even, slightly above .500"). Separately, consider replacing the correct answer with a specific verified won-loss record in one-score games rather than the current vague "generally favorably" phrasing.
**Reason:** §32 — D is self-eliminating (Heupel has coached numerous one-score games, e.g. the 52-49 2022 win over Alabama), obviously false regardless of Heupel-specific knowledge. Separately, **flagging as uncertain**: I could not verify Heupel's exact record in one-score games this run, so I can't confirm "generally favorably" is accurate — recommend verifying with a specific W-L figure before this airs, rather than trusting the current hedge phrasing.
**Status:** ⏳ pending review — flagged as uncertain (correct-answer accuracy unverified)

### trivia_questions.c77779e6-1d5c-49c1-8cb2-5c823a2c78e6 — 2026-10-01 / slot 5 — broken structure + embedded factual error in a distractor
**Current:** Q: "Which Tennessee slugger broke the program's career home run record with his 41st homer in April 2024, before Christian Moore later tied him?" A "Not applicable", B "Todd Helton's total, unchanged, remains the sole record", C "No Tennessee player has ever hit a home run", D "Blake Burke" (correct)
**Suggested fix:** Replace A/B/C with real Tennessee baseball player names (e.g. "Luc Lipcius," "Todd Helton," "Christian Moore" as plain name-only distractors) rather than non-answer/false filler text. Keep D "Blake Burke" as correct.
**Reason:** Verified the core premise is accurate — Blake Burke broke Luc Lipcius's record with career HR #41 on April 6, 2024, and Christian Moore did tie Burke's total multiple times that season (at 42 and again at 43) before ultimately surpassing it to finish with 61. However, three of four options are non-answers rather than real competing names, matching the recurring broken-structure pattern — and option B additionally asserts a separate factual error on its own terms: Todd Helton was never the prior record holder (that was Luc Lipcius), so B is misleading even as throwaway text. §32 factual accuracy + broken distractor structure.
**Status:** ⏳ pending review

### General note — thematic overlap check, 2026-09-28 to 2026-10-01 (informational only)
**Current:** No duplicate or near-duplicate trivia questions found within this window or against the trailing few days already logged in this file.
**Suggested fix:** None needed.
**Reason:** §32 duplicate check — clean.
**Status:** ✅ no action needed

## Poll check — 2026-09-28 to 2026-10-01
- Checked 4 rows (one per date).
- Issues found: 2 factual errors (both premise-breaking, both below), 2 clean.

### daily_polls.35e7c3f9-ead3-45d3-9e75-5ce829ade780 — 2026-09-28 — factual error: two options don't meet the poll's own "from the state of Tennessee" criterion
**Current:** Q: "Who is the best Vol football player from the state of Tennessee?" A "Peyton Manning", B "Eric Berry", C "Al Wilson", D "Trey Smith"
**Suggested fix:** Replace Peyton Manning and Eric Berry with verified in-state (Tennessee-born) Vol football legends. Verified one strong replacement: Reggie White (born Chattanooga, TN). Recommend David pick the second replacement name rather than me guessing a second one under time pressure.
**Reason:** Verified via web search — Peyton Manning was born and raised in New Orleans, Louisiana (Isidore Newman School), and Eric Berry was born in Fairburn, Georgia (Creekside High School) — neither is "from the state of Tennessee" despite both being Vol legends. Only Al Wilson (Jackson, TN) and Trey Smith (Humboldt, TN) actually satisfy the poll's own stated criterion. §33 factual accuracy.
**Status:** ⏳ pending review — flagged as uncertain (second replacement name not yet chosen)

### daily_polls.2beff22b-21fc-43fa-a3a3-4482ade09ea1 — 2026-09-29 — factual error: one "Tennessee baseball alum" never played at Tennessee
**Current:** Q: "Which Tennessee baseball alum had the best MLB career?" A "David Price", B "Todd Helton", C "R.A. Dickey", D "Nick Senzel"
**Suggested fix:** Replace David Price with a verified actual Tennessee baseball alum with a notable MLB career. I don't have a specific name I'm confident enough in to propose without guessing — recommend David pick the replacement.
**Reason:** Verified via web search — David Price played his college baseball at Vanderbilt University (three seasons, 2005-2007, College Baseball Hall of Fame 2025 as a Vanderbilt alum), not Tennessee. Todd Helton, R.A. Dickey, and Nick Senzel are all confirmed genuine Tennessee baseball alums. §33 factual accuracy.
**Status:** ⏳ pending review — flagged as uncertain (replacement name not yet chosen)

### daily_polls.7e2a6c65-1f59-4dd0-8041-7249f9b7acd2 — 2026-09-30 — clean
**Current:** Q: "Who is the best coach in Tennessee basketball history?" A "Ray Mears", B "Don DeVoe", C "Bruce Pearl", D "Rick Barnes"
**Suggested fix:** None needed.
**Reason:** All four are real Tennessee men's basketball head coaches; clear single-topic, non-overlapping, no leading bias.
**Status:** ✅ no action needed

### daily_polls.18d2daef-b39c-4807-88a0-778b85e36c64 — 2026-10-01 — clean
**Current:** Q: "Who was the best Vol head coach since 2000?" A "Phillip Fulmer", B "Lane Kiffin", C "Derek Dooley", D "Josh Heupel"
**Suggested fix:** None needed.
**Reason:** All four are real Tennessee football head coaches since 2000; clear single-topic, non-overlapping, no leading bias.
**Status:** ✅ no action needed

**Status:** ⏳ pending review

## 2026-09-30 — run summary
- Checked: trivia 2026-09-30 to 2026-10-03, polls 2026-09-30 to 2026-10-03
- 2026-09-30 through 10-02 (15 trivia rows, 3 polls) were already reviewed in prior runs (logged 2026-09-28 and 2026-09-29, still pending merge to main) — not re-checked here.
- New this run: 2026-10-03 (5 trivia rows, 1 poll), reviewed fresh. Web search used to verify every factual claim, including a very recent, specific real-world event (Tony Vitello's October 2025 departure).
- Issues found (new): 3 (1 meta-commentary + self-eliminating distractor; 2 self-eliminating-distractor issues where the correct answer itself checked out accurate), plus 1 minor poll style note.

### trivia_questions.4ca4e9e2-e313-4f90-98aa-7e3200bf7b55 — 2026-10-03 / slot 1 — meta-commentary in option text + self-eliminating distractor
**Current:** Q: "...Which award recognizes the sport's top overall amateur player nationally?" A "The Dick Howser Trophy is a separate, similar honor", B "The Heisman Trophy", C "The Golden Spikes Award" (correct), D "There is no such award in college baseball"
**Suggested fix:** Replace A with a plain, real-but-wrong award name with no editorializing (e.g. just "The Dick Howser Trophy" on its own, or another real baseball honor like "The Cy Young Award"). Replace D (self-eliminating) with another plausible wrong name.
**Reason:** §32 — option A tells the test-taker outright that it's "a separate, similar honor" to the correct answer, which is meta-commentary/an editorial aside rather than a plain distractor (the same issue flagged for other rows earlier in this file). D is self-eliminating — major college baseball obviously has awards, so it's rejectable without any specific knowledge. The correct answer (Golden Spikes Award — the actual top overall amateur baseball honor) is accurate.
**Status:** ⏳ pending review

### trivia_questions.9762fe32-0810-4eae-85ea-ae222041c44f — 2026-10-03 / slot 4 — self-eliminating distractors (correct answer verified accurate)
**Current:** Q: "...does the Tennessee-UConn all-time women's basketball series record favor UConn?" A "Tennessee has never lost to UConn", B "No, Tennessee leads comfortably", C "Yes, UConn leads the all-time series" (correct), D "They have never played"
**Suggested fix:** Replace A and D with plausible-but-wrong framings, e.g. "It's roughly even" and "Tennessee leads by a slim margin."
**Reason:** Verified via web search — UConn leads the all-time series 18-10 (and 5-2 in NCAA tournament meetings), so C is correct. But A ("Tennessee has never lost to UConn") and D ("They have never played") are both obviously false to anyone aware this is one of women's basketball's most famous rivalries — self-eliminating without needing to know the actual record. §32.
**Status:** ⏳ pending review

### trivia_questions.352ae3c2-0431-4073-b585-23e536445c48 — 2026-10-03 / slot 5 — non-answer distractors (correct answer verified accurate)
**Current:** Q: "In October 2025, Tony Vitello left Tennessee to become a Major League manager... Which MLB team hired him, and who was promoted from within to replace him at Tennessee?" A "San Francisco Giants; longtime assistant Josh Elander was promoted to head coach" (correct), B "Coaches at Tennessee serve one-year terms only", C "The New York Mets; Frank Anderson took over", D "No Tennessee coach has ever left for professional baseball"
**Suggested fix:** Replace B and D (non-answers) with other plausible team+name combinations in the same format as A/C, e.g. "The Texas Rangers; pitching coach Frank Anderson was promoted."
**Reason:** Verified via web search (Oct. 2025 news coverage, including UTSports.com's official announcement) — Vitello did leave for the Giants (the first manager hire in MLB history with no prior pro playing/coaching experience), and Josh Elander, an 8-year Tennessee assistant, was named the permanent replacement on Oct. 25, 2025 (Frank Anderson had briefly served as interim before that). A is accurate. C is a well-formed plausible wrong pairing (real name, wrong team) — no issue there. But B and D don't answer the two-part question at all (no team, no name) — same recurring non-answer-distractor pattern. §32.
**Status:** ⏳ pending review

## Poll check — 2026-10-03 (new this run)

### daily_polls.32b2b14e-8148-4b26-9d41-d5f7bd5a6d0e — 2026-10-03 — minor style: one option is an outcome, not a "thing that would improve" the team
**Current:** Q: "What single thing would most improve Tennessee basketball right now?" A "Elite recruiting class", B "Better home court advantage", C "Deeper bench", D "Stronger conference record"
**Suggested fix:** Replace D with an input-type factor parallel to A/B/C, e.g. "A proven closer/late-game execution" or "Better depth at point guard."
**Reason:** §33 — A/B/C are all causal factors (things that could drive improvement); D ("Stronger conference record") is itself an outcome/result of improvement rather than a cause of it, so it isn't parallel in kind to the other three options. Low severity — subjective opinion poll, no factual claims to verify.
**Status:** ⏳ pending review

## 2026-10-01 — run summary
- Checked: trivia 2026-10-01 to 2026-10-04, polls 2026-10-01 to 2026-10-04
- 2026-10-01 through 10-03 (15 trivia rows, 3 polls) were already reviewed in prior runs (logged 2026-09-28 through 2026-09-30, still pending merge to main) — not re-checked here.
- New this run: 2026-10-04 (5 trivia rows, 1 poll), reviewed fresh.
- Issues found (new): 3 (2 broken-structure/non-answer-distractor issues, 1 meta-commentary-in-option issue — correct answers all verified accurate), plus 1 poll factual error (a repeat of a previously-flagged mistake in a different row).

### trivia_questions.4da7f78c-b918-4c17-843b-95b2f5699f08 — 2026-10-04 / slot 2 — broken structure, non-answer distractors (unsalvageable)
**Current:** Q: "Which Lady Vols standout later became Tennessee's own head coach after a long assistant coaching career under Pat Summitt?" A "Not applicable", B "Only men become head coaches", C "No Lady Vols assistant has ever become a head coach", D "Holly Warlick" (correct)
**Suggested fix:** Full replacement recommended — rebuild with three other real Lady Vols assistant-coach or player names as distractors instead of non-answer filler text.
**Reason:** §32 — same recurring broken-structure pattern: A/B/C are non-answers/self-eliminating (B and C are both transparently false — Holly Warlick herself disproves both), not real competing names. The correct answer itself is accurate — Holly Warlick, a Lady Vols standout player, spent decades as Pat Summitt's top assistant before becoming Tennessee's head coach (2012-2019).
**Status:** ⏳ pending review

### trivia_questions.891c724a-8bcb-40af-886e-3d8914215d86 — 2026-10-04 / slot 4 — meta-commentary baked into option text
**Current:** Q: "Which Nashville-born swimmer, not a Tennessee athlete herself, is sometimes confused with Lady Vol swimmers due to her four-medal haul at the 2024 Paris Olympics?" A "Erika Connolly", B "Simone Manuel", C "Katie Ledecky", D "Gretchen Walsh (swam collegiately for Virginia, not Tennessee)" (correct)
**Suggested fix:** Trim option D to just "Gretchen Walsh" — the parenthetical gives away the answer and duplicates information already stated in the question itself.
**Reason:** §32 — the parenthetical in option D is meta-commentary/an editorial aside that doesn't belong in option text (same category of issue flagged elsewhere in this file), though here it's also redundant with the question stem, which already says "not a Tennessee athlete herself." Underlying facts all verified accurate: Gretchen Walsh was born in Nashville, TN, swam collegiately at Virginia (not Tennessee), and won 2 gold + 2 silver (4 medals) at the 2024 Paris Olympics. Also verified option A, Erika Connolly, is a real Tennessee swim alum and Olympic medalist — a genuinely plausible, non-fabricated distractor. Clean otherwise.
**Status:** ⏳ pending review

### trivia_questions.c0a073ce-f961-483c-90c5-225852e61df8 — 2026-10-04 / slot 5 — self-eliminating distractors (correct answer verified accurate)
**Current:** Q: "Which Tennessee players are commonly cited among the program's best single-season scoring averages, at 20+ points per game?" A "Scoring averages have never been tracked", B "Only walk-ons have led the team in scoring", C "Lofton, Ellis, and King all posted 20+ point scoring averages in standout seasons" (correct), D "No Tennessee player has ever averaged over 15 points"
**Suggested fix:** Replace A, B, and D with other plausible-but-wrong Tennessee player-name groupings in the same format as C.
**Reason:** §32 — A, B, and D are all self-eliminating/absurd (a major program obviously tracks scoring stats and has had prolific scorers), leaving C as the only real-format answer. Verified C is accurate: Bernard King set Tennessee's single-season scoring average record at 26.4 ppg (1974-75); Chris Lofton led the SEC with 20.8 ppg in 2006-07; Dale Ellis's 1982-83 record-setting 724-point season (previously verified elsewhere in this file) computes to roughly 26 ppg. All three exceed 20 ppg in a standout season.
**Status:** ⏳ pending review

## Poll check — 2026-10-04 (new this run)

### daily_polls.425e116f-f9e2-470b-9a1b-8ecc0b054a1e — 2026-10-04 — factual error: repeat of a previously-flagged mistake (David Price never played at Tennessee)
**Current:** Q: "Who is the greatest Vol baseball player of all time?" A "Todd Helton", B "David Price", C "R.A. Dickey", D "Luke Hochevar"
**Suggested fix:** Replace David Price with a verified actual Tennessee baseball alum. I don't have a specific name I'm confident enough in to propose without guessing — recommend David pick the replacement (same unresolved gap as the 09-29 poll finding below).
**Reason:** Same error already logged against the 2026-09-29 poll (`daily_polls.2beff22b-...`) — David Price played his college baseball at Vanderbilt, not Tennessee, so he doesn't belong in a "greatest Vol baseball player" poll regardless of which specific poll row he appears in. Worth checking whether this name is sitting in a shared options pool that's getting reused across multiple polls, since this is now the second occurrence. Todd Helton, R.A. Dickey, and Luke Hochevar are all freshly verified as genuine Tennessee baseball alums (Hochevar: Tennessee ace 2003-2005, Roger Clemens Award winner, #1 overall 2006 draft pick). §33 factual accuracy.
**Status:** ⏳ pending review

## 2026-10-02 — run summary
- Checked: trivia 2026-10-02 to 2026-10-05, polls 2026-10-02 to 2026-10-05
- 2026-10-02 through 10-04 (15 trivia rows, 3 polls) were already reviewed in prior runs (logged 2026-09-30 and 2026-10-01, still pending merge to main) — not re-checked here.
- New this run: 2026-10-05 (5 trivia rows, 1 poll), reviewed fresh.
- Issues found (new): 2 (1 factual date error, 1 self-eliminating-distractor issue), plus 1 broken-structure issue repeating the recurring pattern. Poll clean.

### trivia_questions.e1b43aa6-71cc-4d4f-aa88-703022245428 — 2026-10-05 / slot 1 — factual error: wrong hire year
**Current:** Q: "Which Lady Vols coach took over the program in 2023, bringing an up-tempo offensive system?" A "Kellie Harper", B "Mickie DeMoss", C "Kim Caldwell" (correct), D "Holly Warlick"
**Suggested fix:** Change "2023" to "2024" in the question text. Keep "Kim Caldwell" as the correct answer.
**Reason:** Verified via web search — Kim Caldwell was hired as Tennessee's Lady Vols head coach and introduced at a press conference on April 9, 2024, not 2023 (she'd been at Marshall through the 2023-24 season before Tennessee hired her). The person is correct, but the year in the question stem is off by one. §32 factual accuracy.
**Status:** ⏳ pending review

### trivia_questions.3ab0c20d-ce7b-461a-a094-a44e569fa9ff — 2026-10-05 / slot 3 — self-eliminating distractor (correct answer verified accurate)
**Current:** Q: "Across Pat Summitt's tenure, the Lady Vols won a combined 32 SEC regular-season and tournament championships. Roughly how many seasons did she coach to accumulate that total?" A "5 seasons", B "100 seasons", C "10 seasons", D "38 seasons" (correct)
**Suggested fix:** Replace B "100 seasons" with a more plausible wrong number, e.g. "25 seasons."
**Reason:** §32 — B is self-eliminating (no NCAA coach has ever coached 100 seasons; the timeframe alone makes it absurd regardless of Summitt-specific knowledge). Verified the underlying facts are accurate: Summitt coached 38 seasons (1974-2012) and won exactly 16 SEC regular-season titles + 16 SEC tournament titles = 32 combined, matching the question's premise precisely.
**Status:** ⏳ pending review

### trivia_questions.14fcef04-1dde-486b-8e43-53cd797be214 — 2026-10-05 / slot 5 — broken structure, non-answer distractors (unsalvageable)
**Current:** Q: "...What is typically cited as the primary rationale for such realignment moves?" A "Leaving the SEC entirely", B "Eliminating football", C "Increased competitive and financial strength for member schools" (correct), D "Not applicable"
**Suggested fix:** Full replacement recommended — rebuild with three other plausible (but wrong) rationale-type statements as distractors, matching the format of the correct answer.
**Reason:** §32 — same recurring broken-structure pattern flagged throughout this file: A, B, and D are non-answers/self-eliminating (none of them is a type of "rationale" at all), leaving C as the only real-format answer. The correct answer itself (increased competitive/financial strength as the typical cited rationale for SEC realignment) is a reasonable, defensible characterization.
**Status:** ⏳ pending review

## Poll check — 2026-10-05 (new this run)

### daily_polls.ca9ddfda-37ee-494e-9c43-12701c25a7d9 — 2026-10-05 — clean
**Current:** Q: "Who deserves a statue outside Thompson-Boling for Lady Vols basketball?" A "Pat Summitt", B "Chamique Holdsclaw", C "Candace Parker", D "All three"
**Suggested fix:** None needed.
**Reason:** All three named figures are legitimate, significant Lady Vols figures (legendary coach plus two legendary players); "All three" is a valid non-exclusive option; no factual claims to verify, no leading bias, clear single-topic opinion poll.
**Status:** ✅ no action needed

## 2026-10-03 — run summary
- Checked: trivia 2026-10-03 to 2026-10-06, polls 2026-10-03 to 2026-10-06
- 2026-10-03 through 10-05 (15 trivia rows, 3 polls) were already reviewed in prior runs (logged 2026-10-01 and 2026-10-02, still pending merge to main) — not re-checked here.
- New this run: 2026-10-06 (5 trivia rows, 1 poll), reviewed fresh.
- Issues found (new): 3 (1 factual timing error, 1 minor broken-distractor issue, 1 severe self-answering question structure). Poll clean.

### trivia_questions.f76b9be7-3d40-498c-80c5-81db7f8c8460 — 2026-10-06 / slot 3 — factual error: wrong decade qualifier
**Current:** Q: "Which Tennessee wide receiver led the SEC in receiving in the mid-1990s and later played in the NFL for Cincinnati?" correct_answer D "Carl Pickens"
**Suggested fix:** Change "mid-1990s" to "early 1990s" in the question text. Keep "Carl Pickens" as the correct answer.
**Reason:** Verified via web search — Carl Pickens played at Tennessee 1989-1991 and led the SEC in receiving yards per game in both 1990 and 1991 (early 1990s), then had a long NFL career with the Cincinnati Bengals — the NFL/Cincinnati detail uniquely identifies him among the options. But "mid-1990s" is the wrong era for him; that label actually fits Joey Kent (1995-96 seasons), who's one of the three real-name distractors here, creating a factual contradiction between the question's own timeframe and its correct answer. §32 factual accuracy.
**Status:** ⏳ pending review

### trivia_questions.04a2f5dd-45c5-4e91-91de-856e759a6c18 — 2026-10-06 / slot 4 — minor: two non-answer distractors
**Current:** Q: "The SEC's academic performance metrics (APR) across member institutions are tracked and enforced by which national governing body?" A "Not applicable", B "The NCAA" (correct), C "A private third-party company with no NCAA affiliation", D "The SEC has no academic oversight"
**Suggested fix:** Replace A and D with other plausible-but-wrong governing-body names, matching the format of B/C.
**Reason:** §32 — A and D are non-answers/self-eliminating (a "which governing body" question deserves a governing-body-shaped wrong answer, not "not applicable" or a flat denial). C is a reasonably-formed distractor. Correct answer (NCAA tracks/enforces APR) is accurate.
**Status:** ⏳ pending review

### trivia_questions.abeffacc-10c4-4f3b-ba59-8ac02c338669 — 2026-10-06 / slot 5 — severe structural issue: question names its own answer
**Current:** Q: "Which Tennessee guard, Jordan McRae, was a four-year contributor during a stretch of NCAA Tournament near-misses in the early-to-mid 2010s?" A "Not applicable", B "Jordan McRae is an example of this kind of veteran continuity" (correct), C "Only one-and-done players have started at Tennessee", D "No four-year starters have ever existed at Tennessee"
**Suggested fix:** Full rebuild required. Rewrite the question so it doesn't name the answer in its own stem — e.g. "Which Tennessee guard was a four-year contributor (2010-2014) during a stretch of NCAA Tournament near-misses?" with "Jordan McRae" as a plain name-only option alongside three other real Tennessee guard names from that era.
**Suggested fix (cont'd):** Also rebuild the three distractors as plain names rather than non-answer statements.
**Reason:** §32 — the question stem already states "Jordan McRae" by name, so option B is just a tautological restatement of the question rather than a real answer choice; no actual recall or knowledge is tested. This compounds the recurring non-answer-distractor pattern seen elsewhere in this file (A/C/D). The underlying fact itself is accurate — McRae did play four seasons at Tennessee (2010-11 through 2013-14) during a run of NCAA Tournament near-misses before the 2014 Sweet 16 team — but the question as written is unsalvageable without a full rewrite.
**Status:** ⏳ pending review

## Poll check — 2026-10-06 (new this run)

### daily_polls.626be5fa-2ee9-41ff-869b-7e9dcbd460b0 — 2026-10-06 — clean
**Current:** Q: "What is your prediction for Tennessee's biggest win this season?" A "Alabama", B "Georgia", C "Florida", D "Oklahoma"
**Suggested fix:** None needed.
**Reason:** All four are real, current SEC opponents on Tennessee's schedule; clear single-topic subjective prediction poll, no factual claims to verify, no leading bias.
**Status:** ✅ no action needed

## 2026-10-04 — run summary
- Checked: trivia 2026-10-04 to 2026-10-07, polls 2026-10-04 to 2026-10-07
- 2026-10-04 through 10-06 (15 trivia rows, 3 polls) were already reviewed in prior runs (logged 2026-10-01 through 2026-10-03, still pending merge to main) — not re-checked here.
- New content this run: trivia 2026-10-07 (5 rows), poll 2026-10-07 (1 row)
- Issues found: 3

### trivia_questions.548f67c0-0f50-491c-b948-a0ec95d5a5de — 2026-10-07 / slot 3 — self-eliminating/non-answer distractors
**Current:** Q: "Which two SEC programs have most consistently signed nationally #1-ranked recruiting classes in recent football cycles, a frequent comparison point for Tennessee's own recruiting under Josh Heupel?" A "No SEC school has ever had a top recruiting class", B "Not applicable", C "Georgia and Alabama" (correct), D "Only Tennessee has ever had a top class"
**Suggested fix:** Replace A, B, and D with real plausible SEC recruiting-duo distractors, e.g. A "LSU and Texas A&M", B "Florida and Auburn", D "Ole Miss and Mississippi State" — keep C "Georgia and Alabama" as correct.
**Reason:** Verified via WebSearch — an SEC school has had the nation's #1 class every year since 2010 (Florida 2010, Alabama 2011-17/2019/2021, Georgia 2018/2020, Texas A&M 2022), so Georgia and Alabama are legitimately the most consistent #1-class programs recently; C is accurate. But A, B, and D are self-eliminating/non-answer distractors (A and D are both obviously false absolute claims, B is a non-answer) — only one of four options is a real competing answer. §32.
**Status:** ⏳ pending review

### trivia_questions.3a63d6f7-da46-47a8-8607-2fb4070f3ea4 — 2026-10-07 / slot 4 — broken True/False structure (unsalvageable as-is)
**Current:** Q: "The Lady Vols program has produced a significant number of WNBA first-round draft picks, reflecting a sustained elite talent pipeline built largely under Pat Summitt. True or false?" A "Over 200 first-round picks", B "True" (correct), C "Exactly one first-round pick ever", D "Zero first-round picks"
**Suggested fix:** Full replacement recommended — rebuild as a standard 4-option question asking for the actual count, e.g. "How many WNBA first-round draft picks has the Lady Vols program produced (through the 2024 draft)?" A "Over 20" (correct — verified 21), B "Exactly 1", C "Zero", D "Over 100".
**Reason:** §32 — recurring broken-structure pattern: this is a True/False question dressed up with 4 options to satisfy the NOT NULL constraint, and A/C/D are specific-sounding numeric claims rather than real True/False alternatives. Verified via WebSearch the underlying premise is accurate: Tennessee has produced 21 WNBA first-round picks through the 2024 draft (Rickea Jackson, 2024, was the 21st) — a genuinely "significant number," so once rebuilt as a real question, "Over 20" is a defensible correct answer.
**Status:** ⏳ pending review

### trivia_questions.9e75fb1a-e6cb-460d-b36f-385f4e99e40b — 2026-10-07 / slot 5 — factual timing error
**Current:** Q: "Which Tennessee coach's later staff began incorporating spread-offense concepts into the program's traditionally pro-style attack in the mid-2000s?" A "Doug Dickey", B "Phillip Fulmer's later staff" (correct), C "Robert Neyland", D "Johnny Majors"
**Suggested fix:** Change "mid-2000s" to "in 2008" (or "late 2000s"). Keep B "Phillip Fulmer's later staff" as the correct answer.
**Reason:** Verified via WebSearch — Fulmer hired Dave Clawson as offensive coordinator in January 2008 specifically to install spread-offense elements into Tennessee's attack; that's the late 2000s, not the mid-2000s (David Cutcliffe, Fulmer's prior OC, left after the 2007 season). The named coach (Fulmer) is correct; only the decade-portion phrasing is off, similar to the previously-logged Carl Pickens "mid-1990s" timing error. §32 factual accuracy.
**Status:** ⏳ pending review

### daily_polls.870d2693-7b13-4ceb-897c-079ea8a61082 — 2026-10-07 — clean
**Current:** Q: "Who is the best defensive player in Tennessee basketball history?" A "Grant Williams", B "Kyle Alexander", C "Yves Pons", D "Josh Richardson"
**Suggested fix:** None needed.
**Reason:** All four are real Tennessee men's basketball players known for defense (Williams and Pons were both SEC Defensive Player of the Year); clear single-topic, non-overlapping, no leading bias.
**Status:** ✅ no action needed

## 2026-10-05 — run summary
- Checked: trivia 2026-10-05 to 2026-10-08, polls 2026-10-05 to 2026-10-08
- 2026-10-05 through 10-07 (15 trivia rows, 3 polls) were already reviewed in prior runs (logged 2026-10-02 through 2026-10-04, still pending merge to main) — not re-checked here.
- New content this run: trivia 2026-10-08 (5 rows), poll 2026-10-08 (1 row)
- Issues found: 4

### trivia_questions.2d241bbe-4799-4def-8a98-3c619ec7a470 — 2026-10-08 / slot 1 — overlapping/non-distinct distractors
**Current:** Q: "Which award did Zakai Zeigler earn multiple times for his defensive play at Tennessee?" A "John R. Wooden Award for offense", B "Naismith Trophy", C "Wooden Award", D "SEC Defensive Player of the Year" (correct)
**Suggested fix:** Replace A with a genuinely different real award (e.g. "AP National Player of the Year") so it's not just a reworded duplicate of option C.
**Reason:** Verified via WebSearch — Zeigler has won SEC Defensive Player of the Year twice (2023-24, 2024-25), so D is correct. But A ("John R. Wooden Award for offense") and C ("Wooden Award") name the same real award (the John R. Wooden Award) under two different labels — not genuinely distinct options, and A's "for offense" qualifier is an invented sub-category that doesn't exist. §32 — distractors must be distinct and plausible, not a reworded duplicate.
**Status:** ⏳ pending review

### trivia_questions.c14a8eee-0cc9-4a1c-baf5-0eb034d314f1 — 2026-10-08 / slot 3 — self-eliminating distractors
**Current:** Q: "Under Josh Heupel, Tennessee's scoring offense has generally ranked where nationally?" A "Among the national leaders in scoring" (correct), B "Bottom of the SEC", C "Never above 20 points per game", D "Middle of the pack only"
**Suggested fix:** Replace B and C with more plausible wrong answers, e.g. B "Solid but unspectacular, mid-SEC" and C "Strong in the SEC but outside the national top 25" — keep A as correct.
**Reason:** §32 — B and C are self-eliminating: Heupel's Tennessee offenses are widely known for routinely scoring 40+ points per game and ranking among the national scoring leaders, so anyone with even casual awareness of the program can eliminate B and C without needing the specific ranking fact, leaving a near-coin-flip between A and D.
**Status:** ⏳ pending review

### trivia_questions.7835585c-0104-4bd0-9df6-4aecd1b0ede7 — 2026-10-08 / slot 4 — meta-commentary bleeding into option text
**Current:** Q: "Which two Tennessee swimmers are the only ones in program history to win three career Olympic medals each?" A "No Tennessee swimmer has ever won an Olympic medal", B "Gretchen Walsh and Alex Walsh (neither swam for Tennessee)", C "Only one swimmer has ever done this", D "Melvin Stewart and Erika Connolly" (correct)
**Suggested fix:** Replace B's text with a plain name-only option (no parenthetical) — e.g. "Nikki Nazarov and Kristen Rohrer" or another real, non-Tennessee-relevant pair of elite swimmers named without commentary — and drop the "(neither swam for Tennessee)" explanation, which gives away the wrong answer directly in the option text.
**Reason:** Verified via WebSearch the correct answer is factually accurate — Melvin Stewart (2 gold + 1 bronze, 1992) and Erika Connolly (1 bronze + 2 silver, 2020/2024) each have exactly 3 career Olympic medals, and sources confirm Connolly is "the only UT women's swimmer to win three Olympic medals." But option B's parenthetical "(neither swam for Tennessee)" is meta-commentary explaining why the option is wrong rather than a real competing answer — directly against §32's "no meta-commentary... bleeding into question text" rule (here it's bleeding into option text). A and C are also non-answers/self-eliminating, so only one of four options (D) functions as a real answer.
**Status:** ⏳ pending review

### trivia_questions.da8b5a42-b8b2-4e82-8162-a0f783da2bcd — 2026-10-08 / slot 5 — broken True/False structure, non-answer distractors (unsalvageable)
**Current:** Q: "A Lady Vol has scored a program-record number of points in a single NCAA Tournament game at some point across program history. True or false?" A "The record belongs to a football player", B "No such record exists", C "True" (correct), D "Not applicable"
**Suggested fix:** Full replacement recommended — rebuild as a standard 4-option question naming the actual record-holder and point total (if verifiable) as concrete, competing answer options, rather than a True/False dressed up to satisfy the NOT NULL constraint.
**Reason:** §32 — same recurring broken-structure pattern logged repeatedly in this file: A is absurd (a football player cannot hold a women's basketball scoring record), B contradicts the question's own premise, and D is a non-answer — none of A/B/D is a real competing answer. **Flagging as uncertain** — did not independently verify the specific record-holder/point total to propose as a concrete replacement, so recommend verifying before drafting new options.
**Status:** ⏳ pending review — flagged as uncertain (replacement details unverified)

### daily_polls.af994b8a-fa33-4775-91ef-9a54aa73e965 — 2026-10-08 — clean
**Current:** Q: "Who should be Tennessee's all-time starting quarterback?" A "Peyton Manning", B "Heath Shuler", C "Tee Martin", D "Erik Ainge"
**Suggested fix:** None needed.
**Reason:** All four are real Tennessee starting quarterbacks; clear single-topic, non-overlapping, no leading bias.
**Status:** ✅ no action needed

### General note — baseball coach timeline check, trivia_questions.6cc060dd-3962-4012-b469-fe729c761fd8 (2026-10-08 / slot 2) — clean
**Current:** Q: "Which Tennessee baseball coach's animated, fiery in-game demeanor has become a widely discussed part of his public persona?" A "Dave Serrano", B "Rod Delmonico", C "Tony Vitello" (correct), D "Todd Raleigh"
**Suggested fix:** None needed.
**Reason:** Verified via WebSearch — all four are real Tennessee baseball head coaches in correct historical sequence (Delmonico 1989-2007, Raleigh 2008-2011, Serrano 2012-2016, Vitello 2017-present); Vitello's animated sideline demeanor is well documented. No factual issue.
**Status:** ✅ no action needed

## 2026-10-06 — run summary
- Checked: trivia 2026-10-06 to 2026-10-09, polls 2026-10-06 to 2026-10-09
- 2026-10-06 through 10-08 (15 trivia rows, 3 polls) were already reviewed in prior runs (logged 2026-10-03 through 2026-10-05, still pending merge to main) — not re-checked here.
- New content this run: trivia 2026-10-09 (5 rows); no poll scheduled for 2026-10-09
- Issues found: 1 (trivia), plus 1 poll-scheduling gap note

### trivia_questions.fb31c7f6-cfb1-40d8-8083-87bf0339dfc8 — 2026-10-09 / slot 2 — non-Tennessee distractors (easily eliminable without specific knowledge)
**Current:** Q: "Which Tennessee running back rushed for over 1,000 yards during the undefeated 1998 championship season?" A "Jamal Lewis" (correct), B "Emmitt Smith", C "Herschel Walker", D "Bo Jackson"
**Suggested fix:** Replace B, C, and D with other real Tennessee running backs from the same or nearby eras, e.g. B "Travis Henry", C "Shawn Bryson", D "Travis Stephens" — keep A "Jamal Lewis" as correct.
**Reason:** Verified Jamal Lewis is correct (1,364 rushing yards for Tennessee's 1998 national championship team). But B, C, and D (Emmitt Smith, Herschel Walker, Bo Jackson) never played for Tennessee at all and played in entirely different eras (1980s-90s, other schools) — a Vol fan can eliminate all three purely on "these guys never played here," without needing any 1998-season-specific knowledge. §32 — distractors should be plausible within the actual Tennessee roster/context, not trivially non-Vol names.
**Status:** ⏳ pending review

### General note — poll scheduling gap, 2026-10-09 (informational only)
**Current:** No `daily_polls` row exists for `active_date = 2026-10-09`.
**Suggested fix:** None from this QA process — flagging for awareness only, consistent with prior scheduling-gap notes logged in this file (e.g. 2026-09-24).
**Reason:** Scope note, not a content-quality issue.
**Status:** ✅ no action needed (informational only)

## 2026-10-07 — run summary
- Checked: trivia 2026-10-07 to 2026-10-10, polls 2026-10-07 to 2026-10-10
- 2026-10-07 through 10-09 (15 trivia rows, 2 polls) were already reviewed in prior runs (logged 2026-10-04 through 2026-10-06, still pending merge to main) — not re-checked here.
- New content this run: trivia 2026-10-10 (5 rows), poll 2026-10-10 (1 row)
- Issues found: 2

### trivia_questions.eb76099d-89b3-45a0-8fe6-2231ff4621e6 — 2026-10-10 / slot 4 — unverified/possibly fabricated premise + non-answer distractor
**Current:** Q: "What is the SEC's well-known football broadcast promotional slogan, referencing the pace and intensity of its games?" A "\"The Fastest Four Quarters in Sports\"" (correct), B "\"Where Legends Are Made\"", C "\"Any Given Saturday\"", D "Not applicable, no such slogan exists"
**Suggested fix:** Could not confirm "The Fastest Four Quarters in Sports" as an actual, documented SEC slogan via WebSearch — recommend David verify this phrase against an SEC Network/ESPN source before airing; if it can't be confirmed, replace with a verified real SEC promotional tagline (e.g. "It Just Means More," which is well-documented) as the correct answer. Separately, regardless of A's accuracy, replace D with a real alternative slogan/phrase rather than a non-answer that just negates the question's own premise.
**Reason:** §32 — **flagging as uncertain**: did not find a source confirming the correct answer's premise is accurate, so logging instead of guessing. D is also a self-eliminating non-answer distractor independent of that question. (Note: "Where Legends Are Made" is the Big Ten's actual slogan, not the SEC's — a legitimate real-but-wrong distractor, no issue there.)
**Status:** ⏳ pending review — flagged as uncertain (correct-answer premise unverified)

### trivia_questions.6fc50390-398a-46a5-8dec-eb3ad83465cf — 2026-10-10 / slot 5 — factual timing error
**Current:** Q: "Which Tennessee coach led the program through the mid-1970s to early 1980s, including a Sugar Bowl appearance, before a difficult firing?" A "Robert Neyland", B "Doug Dickey", C "Bill Battle" (correct), D "Bowden Wyatt"
**Suggested fix:** Change "the mid-1970s to early 1980s" to "the early-to-mid 1970s" (or "1970 to 1976"). Keep C "Bill Battle" as the correct answer.
**Reason:** Verified via WebSearch — Bill Battle's actual Tennessee tenure was 1970-1976 (not into the early 1980s; Johnny Majors took over starting in 1977), and he did win the 1971 Sugar Bowl (34-13 over Air Force, capping the 1970 season). Battle was indeed forced out under fan pressure after the 1976 season, so "a difficult firing" is accurate — only the decade-range phrasing is off, the same recurring pattern as prior logged timing errors (Pickens "mid-1990s," Fulmer/Clawson "mid-2000s").
**Status:** ⏳ pending review

### daily_polls.3e36ae94-f53f-43eb-90b8-a1a57bf6168a — 2026-10-10 — clean
**Current:** Q: "Who is the most physically dominant Vol football player of all time?" A "Reggie White", B "John Henderson", C "Albert Haynesworth", D "Trey Smith"
**Suggested fix:** None needed.
**Reason:** All four are real Tennessee football linemen known for physical dominance; clear single-topic, non-overlapping, no leading bias.
**Status:** ✅ no action needed

## 2026-10-08 — run summary
- Checked: trivia 2026-10-08 to 2026-10-11, polls 2026-10-08 to 2026-10-11
- 2026-10-08 through 10-10 (15 trivia rows, 3 polls) were already reviewed in prior runs (logged 2026-10-05 through 2026-10-07, still pending merge to main) — not re-checked here.
- New content this run: trivia 2026-10-11 (5 rows), poll 2026-10-11 (1 row)
- Issues found: 3

### trivia_questions.1dea9f5e-6759-452b-8dab-bb4055935a4d — 2026-10-11 / slot 1 — out-of-scope question miscategorized as "Vol Baseball History"
**Current:** Q: "Which team drafted David Price #1 overall in the 2007 MLB Draft?" A "Detroit Tigers", B "Toronto Blue Jays", C "Tampa Bay Rays" (correct), D "Boston Red Sox" — Category: Vol Baseball History
**Suggested fix:** Replace with a question about an actual Tennessee baseball player's draft history (e.g. Christian Moore, Nick Senzel, Todd Helton), or recategorize/replace entirely — David Price has no Tennessee connection.
**Reason:** §32 scope rule — Price played college baseball at Vanderbilt, not Tennessee (previously flagged in this file's 2026-09-29 poll section for the same reason in a different question). The correct answer (Tampa Bay, 2007) is factually accurate, but the question itself has zero Vol relevance despite its "Vol Baseball History" category — fails the "would a knowledgeable Vol fan need this for Vol history" gut check entirely, not just a scope edge case.
**Status:** ⏳ pending review

### trivia_questions.f6556d8b-a3cd-45fc-bbb5-f4b7c83cf01f — 2026-10-11 / slot 2 — broken True/False structure, self-eliminating/contradictory distractors
**Current:** Q: "The SEC eliminated its East/West football divisions starting with the 2024 season, moving to a single-standings format. True or false?" A "Divisions were eliminated in 2010", B "No, divisions remain", C "True" (correct), D "The SEC has never had divisions"
**Suggested fix:** Rebuild as a standard question, e.g. "What year did the SEC eliminate its East/West football divisions?" with real year options (2021, 2023, 2024 [correct], 2025) instead of True/False-style options.
**Reason:** Verified via WebSearch — the SEC did eliminate divisions starting with the 2024 season (divisions had existed since 1992), so C is accurate. But B directly contradicts the question's own stated premise rather than offering a real alternative, and D is self-eliminating (the SEC's decades-long East/West split is widely known) — same recurring broken-structure pattern logged repeatedly in this file.
**Status:** ⏳ pending review

### trivia_questions.905f097a-3a37-4030-8f83-1c1c25b24e40 — 2026-10-11 / slot 5 — self-eliminating/non-answer distractors
**Current:** Q: "Among \"big three\" revenue sports (football, basketball, baseball), which SEC programs are most commonly cited as the individual leaders in combined SEC regular-season titles for each respective sport?" A "Tennessee leads in all three combined, unambiguously", B "Not applicable", C "Alabama in football, Kentucky in basketball, and LSU in baseball are frequently cited as sport-specific leaders" (correct), D "No SEC school has ever won a championship in any of these three sports"
**Suggested fix:** Replace A and D with other real, plausible SEC-leader combinations (e.g. "Georgia in football, Florida in basketball, and Florida in baseball") and drop the "Not applicable" option entirely.
**Reason:** Verified via WebSearch — Kentucky leads SEC basketball regular-season titles and LSU leads SEC baseball titles; Alabama as the football leader is the commonly cited answer, consistent with the question's own "frequently cited" framing, though this exact search didn't produce a clean labeled all-time count for football. A and D are self-eliminating absolutes that a casual SEC fan can rule out without needing the specific stats, and B is a non-answer — only C functions as a real answer.
**Status:** ⏳ pending review

### daily_polls.23754fb0-411f-416f-a30f-03e2185ac76e — 2026-10-11 — clean
**Current:** Q: "What single thing would most improve Lady Vols basketball right now?" A "Elite recruiting class", B "Better home court attendance", C "Stronger conference record", D "A deep tournament run"
**Suggested fix:** None needed.
**Reason:** Clear single-topic, subjective, non-overlapping options; no factual claims to verify, no leading bias.
**Status:** ✅ no action needed

## 2026-10-09 — run summary
- Checked: trivia 2026-10-09 to 2026-10-12, polls 2026-10-09 to 2026-10-12
- 2026-10-09 through 10-11 (15 trivia rows, 2 polls) were already reviewed in prior runs (logged 2026-10-06 through 2026-10-08, still pending merge to main) — not re-checked here.
- New content this run: trivia 2026-10-12 (5 rows); no poll scheduled for 2026-10-12
- Issues found: 4 (3 trivia distractor issues, 1 minor style note), plus 1 poll-scheduling gap note

### trivia_questions.267d6913-bf75-44e4-acb9-c4a11f01d9fe — 2026-10-12 / slot 1 — broken True/False structure, non-answer distractors
**Current:** Q: "Has the Lady Vols' rivalry with UConn included periods where the two programs stopped scheduling each other?" A "True, there have been well-publicized hiatuses in the series" (correct), B "Not applicable", C "False, they have played every single year without interruption", D "They have never played at all"
**Suggested fix:** Rebuild as a standard question, e.g. "How long was the main hiatus in the Tennessee-UConn women's basketball series?" A "13 years" (correct), with real alternative year-count options — drop B and D.
**Reason:** Verified via WebSearch — accurate: Pat Summitt ended the series in 2007, and it didn't resume until 2020 (a 13-year gap), plus a separate shorter 2023-24 hiatus, so A is correct. But B is a non-answer and D is self-eliminating (the rivalry is one of the sport's most famous, so "never played at all" is an absurd option) — same recurring broken-structure pattern logged repeatedly in this file.
**Status:** ⏳ pending review

### trivia_questions.cedebf84-b1da-45a0-ac24-03190c1d7a1a — 2026-10-12 / slot 2 — minor: one distractor from a distant era
**Current:** Q: "Which Tennessee quarterback started for parts of four seasons in the mid-2000s, setting several career passing records?" A "Casey Clausen", B "Erik Ainge" (correct), C "Rick Clausen", D "Tee Martin"
**Suggested fix:** Consider swapping Tee Martin for another mid-2000s-era Tennessee QB option (e.g. a walk-on/backup from that specific window) for tighter era consistency; low priority since the other two distractors (Casey and Rick Clausen) are era-appropriate.
**Reason:** Erik Ainge (2004-2007) is correctly the answer. Tee Martin played for Tennessee 1997-1999 (the 1998 national championship team) — a full coaching-generation earlier than "mid-2000s," making him easily eliminable by era alone, similar to prior logged era-mismatch distractor notes. Minor; the question is still answerable and not broken.
**Status:** ⏳ pending review

### trivia_questions.1a53fba3-8824-4b75-aa1e-e32efe28a1bd — 2026-10-12 / slot 3 — self-eliminating/non-answer distractors
**Current:** Q: "Which SEC school's spring football exhibition, A-Day, is commonly cited as drawing among the largest spring game crowds in the conference?" A "Not applicable", B "Only Tennessee plays a spring game", C "No SEC school plays a spring game", D "Alabama" (correct)
**Suggested fix:** Replace A, B, and C with other real SEC schools known for large spring game attendance (e.g. "Georgia," "LSU," "Tennessee") as plain name-only distractors.
**Reason:** Alabama's "A-Day" spring game is well known for drawing massive crowds, so D is correct. But A is a non-answer, and B/C are absurd/self-eliminating (every SEC program plays a spring game) — only one of four options functions as a real competing answer. §32.
**Status:** ⏳ pending review

### trivia_questions.c42aafe2-8ee7-4d71-b340-d5a28a330779 — 2026-10-12 / slot 5 — self-eliminating/non-answer distractors
**Current:** Q: "Across all sports and all member schools combined, has the SEC historically ranked among the conferences with the highest total number of NCAA national championships?" A "Among the highest total championship counts of any conference" (correct), B "The SEC has never won a national championship in any sport", C "The SEC ranks last among all conferences", D "Not applicable"
**Suggested fix:** Rebuild as a standard question naming specific conferences as real competing options (e.g. "Which conference has the most all-time NCAA team championships: SEC, Big Ten, Pac-12, ACC?") rather than True/False-style absolutes.
**Reason:** §32 — B and C are both absurd/self-eliminating (the SEC's championship history, especially football/baseball, is widely known), and D is a non-answer — same recurring broken-structure pattern. A's correctness itself is plausible and consistent with the SEC's reputation, but the distractor set needs rebuilding.
**Status:** ⏳ pending review

### General note — poll scheduling gap, 2026-10-12 (informational only)
**Current:** No `daily_polls` row exists for `active_date = 2026-10-12`.
**Suggested fix:** None from this QA process — flagging for awareness only, consistent with prior scheduling-gap notes logged in this file (e.g. 2026-09-24, 2026-10-09).
**Reason:** Scope note, not a content-quality issue.
**Status:** ✅ no action needed (informational only)

## 2026-10-10 — run summary
- Checked: trivia 2026-10-10 to 2026-10-13, polls 2026-10-10 to 2026-10-13
- 2026-10-10 through 10-12 (15 trivia rows, 1 poll) were already reviewed in prior runs (logged 2026-10-07 through 2026-10-09, still pending merge to main) — not re-checked here.
- New content this run: trivia 2026-10-13 (5 rows); no poll scheduled for 2026-10-13
- Issues found: 3

### trivia_questions.fbfb8ec5-548a-4568-8ba5-684f16687ac2 — 2026-10-13 / slot 3 — meta-commentary in option text + non-answer distractor
**Current:** Q: "Which SEC baseball program has become one of Tennessee's primary rivals for national title contention in the 2020s, alongside their traditional in-state rivalry?" A "Oklahoma (only recently joined)", B "Not applicable", C "Vanderbilt" (correct), D "Texas (only recently joined)"
**Suggested fix:** Replace A and D with plain school names (no parenthetical) — e.g. "LSU" and "Florida" — and drop "Not applicable" entirely in favor of another real SEC baseball program.
**Reason:** §32 — A and D bake meta-commentary directly into the option text ("only recently joined"), explaining away the wrong answer rather than offering a real competing name; B is a non-answer. Only C functions as a genuine answer. Verified via general knowledge that Vanderbilt and Tennessee have indeed been Tennessee's primary 2020s national-title-contention baseball rival alongside the cross-state series — C is accurate.
**Status:** ⏳ pending review

### trivia_questions.59c3ea14-edef-42f8-8e3f-a40f08b7ec20 — 2026-10-13 / slot 4 — self-eliminating distractors (via the question's own stated premise)
**Current:** Q: "Tennessee's all-time bowl win total is among the best in the nation historically. What is the program's approximate all-time bowl record?" A "Tennessee has never won a bowl game", B "A losing record, around 15-30", C "Around 30-25, a winning record" (correct), D "An exactly even record"
**Suggested fix:** Drop the leading premise sentence ("...is among the best in the nation historically") from the question stem — it effectively tells the test-taker the answer must be a strong winning record, pre-eliminating A, B, and D without requiring the specific figure.
**Reason:** Verified via WebSearch — Tennessee's all-time bowl record is 30-25, matching C. But the question stem itself states the record is "among the best in the nation," which logically rules out A (never won), B (losing record), and D (even record) before the reader needs any specific knowledge — a variant of the recurring self-eliminating-distractor pattern, caused here by the stem rather than the options themselves.
**Status:** ⏳ pending review

### trivia_questions.91c287d0-4f09-4d73-bd7e-ff006ce929e3 — 2026-10-13 / slot 5 — broken yes/no structure, non-answer/absurd distractors (unsalvageable)
**Current:** Q: "Has Tennessee's athletic compliance office grown in staffing and scope in response to the rise of NIL, the transfer portal, and revenue-sharing regulations in the 2020s?" A "Not applicable", B "Compliance offices don't exist in college athletics", C "No regulatory shifts have occurred", D "Yes" (correct)
**Suggested fix:** Full replacement recommended — rebuild as a standard question with concrete, verifiable facts (e.g. asking what specific regulatory changes NCAA athletic compliance offices have had to adapt to in the 2020s) rather than a yes/no question with absurd alternatives.
**Reason:** §32 — A is a non-answer, B is objectively false (compliance offices obviously exist), and C contradicts extremely well-known facts (NIL, the transfer portal, and revenue-sharing are all real 2020s regulatory shifts) — none of A/B/C is a real competing answer, leaving D as a trivial default. Same recurring broken-structure pattern logged repeatedly in this file.
**Status:** ⏳ pending review

### General note — poll scheduling gap, 2026-10-13 (informational only)
**Current:** No `daily_polls` row exists for `active_date = 2026-10-13`.
**Suggested fix:** None from this QA process — flagging for awareness only, consistent with prior scheduling-gap notes logged in this file (e.g. 2026-09-24, 2026-10-09, 2026-10-12).
**Reason:** Scope note, not a content-quality issue.
**Status:** ✅ no action needed (informational only)

## 2026-10-11 — run summary
- Checked: trivia 2026-10-11 to 2026-10-14, polls 2026-10-11 to 2026-10-14
- 2026-10-11 through 10-13 (15 trivia rows, 1 poll) were already reviewed in prior runs (logged 2026-10-08 through 2026-10-10, still pending merge to main) — not re-checked here.
- New content this run: trivia 2026-10-14 (5 rows); no poll scheduled for 2026-10-14
- Issues found: 1

### trivia_questions.b4c5b465-2d5c-47c6-b1db-4bdef1203d60 — 2026-10-14 / slot 4 — broken True/False structure, self-eliminating/non-answer distractors
**Current:** Q: "The SEC's football strength of schedule is generally considered among the toughest of the Power conferences, a frequent talking point in national ranking and CFP seeding debates. True or false?" A "Among the weakest of the Power conferences", B "True" (correct), C "Strength of schedule is not measured", D "Not applicable"
**Suggested fix:** Rebuild as a standard question, e.g. "Which metric has the SEC's football strength of schedule frequently ranked near the top of in recent seasons?" with real comparative options instead of True/False-style options.
**Reason:** §32 — same recurring broken-structure pattern logged repeatedly in this file: A directly contradicts the question's own stated premise, C is objectively false (strength of schedule is a well-established, widely published metric), and D is a non-answer — only B functions as a real answer.
**Status:** ⏳ pending review

### General note — poll scheduling gap, 2026-10-14 (informational only)
**Current:** No `daily_polls` row exists for `active_date = 2026-10-14`.
**Suggested fix:** None from this QA process — flagging for awareness only, consistent with prior scheduling-gap notes logged in this file (e.g. 2026-09-24, 2026-10-09, 2026-10-12, 2026-10-13).
**Reason:** Scope note, not a content-quality issue.
**Status:** ✅ no action needed (informational only)

## 2026-10-11 — fixes APPLIED to the database (David's go-ahead, 2026-10-11)
- David's instruction: make every fix directly, written as a Vol fan taking the quiz would want it.
- Scope: every flagged row dated 2026-10-11 through 10-14 (dates not yet aired, or airing today), plus three more weak spots found on a second pass as a quiz-taker. Before editing 10-11, I checked `user_trivia_responses`: no one had answered yet.
- 14 rows updated in one transaction. Only `question`, `option_a`–`option_d`, `correct_answer` changed; `scheduled_date`, `slot`, `id`, `category`, `difficulty` untouched.
- Every new fact was checked with WebSearch (sources in the PR).

### trivia_questions.1dea9f5e — 2026-10-11 / slot 1 — ✅ applied
**Before:** "Which team drafted David Price #1 overall in the 2007 MLB Draft?" A Detroit Tigers / B Toronto Blue Jays / C Tampa Bay Rays ✔ / D Boston Red Sox
**After:** "Which MLB team drafted Tennessee third baseman Nick Senzel No. 2 overall in the 2016 MLB Draft?" A Cincinnati Reds ✔ / B Philadelphia Phillies / C Atlanta Braves / D Tampa Bay Rays
**Why:** Price played at Vanderbilt. Senzel is a real Vol, and the Phillies (who took Mickey Moniak No. 1 that year) make a believable trap.

### trivia_questions.f6556d8b — 2026-10-11 / slot 2 — ✅ applied
**Before:** True/False on the SEC dropping divisions; options "Divisions were eliminated in 2010" / "No, divisions remain" / "True" ✔ / "The SEC has never had divisions"
**After:** "Starting with which football season did the SEC drop its East and West divisions?" A 2021 / B 2023 / C 2024 ✔ / D 2026
**Why:** The old version had a broken True/False setup. Four real years now compete.

### trivia_questions.fc061442 — 2026-10-11 / slot 3 — ✅ applied (second-pass find)
**Before:** "Derek Dooley ... is the son of which legendary Georgia head coach?" A Joe Paterno / B Bear Bryant / C Bobby Bowden / D Vince Dooley ✔
**After:** "Former Vols head coach Derek Dooley (2010-2012) is the son of Vince Dooley, the longtime head coach at which SEC school?" A Auburn / B Georgia ✔ / C Alabama / D Florida
**Why:** The surname gave the old answer away. Auburn, where Vince Dooley played, is now a real trap.

### trivia_questions.905f097a — 2026-10-11 / slot 5 — ✅ applied
**Before:** "...which SEC programs are most commonly cited as the individual leaders..." A "Tennessee leads in all three combined, unambiguously" / B "Not applicable" / C "Alabama in football, Kentucky in basketball, and LSU in baseball are frequently cited..." ✔ / D "No SEC school has ever won a championship..."
**After:** "Which trio of schools has won the most SEC titles in football, men's basketball, and baseball, respectively?" A Georgia, Kentucky, Florida / B Alabama, Tennessee, Vanderbilt / C Alabama, Kentucky, LSU ✔ / D Tennessee, Kentucky, LSU
**Why:** Three of the old options were non-answers. All four are now real school combinations. Option D tempts Vol fans, since Tennessee is second in SEC football titles.

### trivia_questions.267d6913 — 2026-10-12 / slot 1 — ✅ applied
**Before:** "Has the Lady Vols' rivalry with UConn included periods where the two programs stopped scheduling each other?" True ✔ / Not applicable / False... / They have never played at all
**After:** "Pat Summitt ended the Tennessee-UConn women's basketball series in 2007. In what year did the two programs finally meet again?" A 2010 / B 2015 / C 2020 ✔ / D 2024
**Why:** Broken True/False. The series did resume in January 2020 (verified).

### trivia_questions.cedebf84 — 2026-10-12 / slot 2 — ✅ applied
**Before:** "...started for parts of four seasons in the mid-2000s, setting several career passing records?" Casey Clausen / Erik Ainge ✔ / Rick Clausen / Tee Martin
**After:** "Which quarterback started for Tennessee across parts of four seasons from 2004 to 2007?" Casey Clausen / Erik Ainge ✔ / Rick Clausen / Jonathan Crompton
**Why:** Tee Martin (1998 era) was easy to rule out by era, so Crompton (2006-09) replaces him. I also dropped the unverified "career passing records" claim.

### trivia_questions.1a53fba3 — 2026-10-12 / slot 3 — ✅ applied
**Before:** "Which SEC school's spring football exhibition, A-Day, ..." A Not applicable / B Only Tennessee plays a spring game / C No SEC school plays a spring game / D Alabama ✔
**After:** "Alabama's spring football game, which packed a sellout crowd into Bryant-Denny Stadium for Nick Saban's first spring in 2007, goes by what name?" A G-Day / B Orange & White Game / C A-Day ✔ / D Garnet & Black Game
**Why:** The old version had three non-answers. All four are now real SEC spring-game names.

### trivia_questions.c42aafe2 — 2026-10-12 / slot 5 — ✅ applied (full replacement)
**Before:** "Across all sports... has the SEC historically ranked among the conferences with the highest total number of NCAA national championships?" (one real option, three absurd ones)
**After:** "How many SEC football championships has Tennessee won, most recently in 1998?" A 9 / B 11 / C 13 ✔ / D 16
**Why:** I couldn't verify the original claim, so I replaced it with a hard question every Vol fan should care about. Tennessee won 13 SEC titles: 1938-40, '46, '51, '56, '67, '69, '85, '89, '90, '97, '98. 16 is a trap: it's Tennessee's total conference titles, including the SIAA and SoCon years.

### trivia_questions.fbfb8ec5 — 2026-10-13 / slot 3 — ✅ applied
**Before:** "Which SEC baseball program has become one of Tennessee's primary rivals for national title contention in the 2020s, alongside their traditional in-state rivalry?" A "Oklahoma (only recently joined)" / B Not applicable / C Vanderbilt ✔ / D "Texas (only recently joined)"
**After:** "Before Tennessee won its first College World Series in 2024, which SEC rival won national titles in both 2014 and 2019?" A LSU / B Ole Miss / C Vanderbilt ✔ / D Arkansas
**Why:** Two options carried giveaway notes in parentheses, and the old stem was subjective. Now it's a hard fact with title-winning SEC rivals as the traps.

### trivia_questions.59c3ea14 — 2026-10-13 / slot 4 — ✅ applied
**Before:** "Tennessee's all-time bowl win total is among the best in the nation historically. What is the program's approximate all-time bowl record?" Never won / losing ~15-30 / ~30-25 ✔ / exactly even
**After:** "What is Tennessee football's approximate all-time bowl record?" A About 22-33 / B About 40-15 / C About 30-25 ✔ / D About 25-30
**Why:** The old stem gave the answer away. 30-25 is verified, and D (the reverse record) is a real trap.

### trivia_questions.91c287d0 — 2026-10-13 / slot 5 — ✅ applied (full replacement)
**Before:** "Has Tennessee's athletic compliance office grown in staffing and scope...?" Not applicable / Compliance offices don't exist / No regulatory shifts / Yes ✔
**After:** "Tennessee AD Danny White, who hired Josh Heupel in 2021, came to Knoxville from which school, where he had also hired Heupel?" A Buffalo / B Memphis / C UCF ✔ / D Missouri
**Why:** The old question was a yes/no with absurd options. The new one is verified (White hired Heupel at UCF in 2018, then again at Tennessee in 2021). Buffalo (White's earlier AD job) and Missouri (where Heupel was an assistant) are real traps.

### trivia_questions.3a5ffd60 — 2026-10-14 / slot 1 — ✅ applied (second-pass find)
**Before:** "What military rank did legendary coach Robert Neyland hold, tied to his nickname \"The General\"?" Private / Sergeant / Brigadier General ✔ / Admiral
**After:** "Robert Neyland, known as \"The General,\" retired from the U.S. Army holding what rank?" A Captain / B Colonel / C Brigadier General ✔ / D Major
**Why:** All four are now real Army officer ranks; Admiral is Navy and Private was absurd. It stays easy for slot 1.

### trivia_questions.b4c5b465 — 2026-10-14 / slot 4 — ✅ applied (full replacement)
**Before:** True/False on SEC strength of schedule (one real option, three absurd ones)
**After:** "Which two schools joined the SEC in 2012, growing the league to 14 members?" A Texas and Oklahoma / B Arkansas and South Carolina / C Louisville and West Virginia / D Texas A&M and Missouri ✔
**Why:** The old question was an opinion dressed up as True/False. The new one is a hard fact, and two of the traps are real SEC expansion pairs from other years (1992 and 2024).

### trivia_questions.d5c640c8 — 2026-10-14 / slot 5 — ✅ applied (second-pass find)
**Before:** "Which Tennessee coaching staff first prioritized international recruiting as a significant program strategy, landing players like Vescovi and Plavsic?" Mears / Barnes ✔ / DeVoe / Pearl
**After:** "Santiago Vescovi, Tennessee's sharpshooting guard from 2020 to 2024, is from which country?" A Argentina / B Spain / C Uruguay ✔ / D Brazil
**Why:** "First prioritized" couldn't be verified, and naming Barnes-era players gave the coach away.

### Not changed (still open)
- No `daily_polls` rows exist for 2026-10-12, 10-13, or 10-14. Adding them would be new content, which is outside "fix what's there," so nothing was inserted.
- Earlier flagged rows dated before 2026-10-11 have already aired, so I left them as they are.

## 2026-10-12 — run summary (fixes APPLIED to DB, per David's 2026-10-11 instruction)
- Checked: trivia 2026-10-12 to 2026-10-15, polls 2026-10-12 to 2026-10-15
- 2026-10-12 through 10-14 were already reviewed and fixed on 2026-10-11 (see `trivia-qa/2026-10-11-applied`), so I didn't re-check them. New content this run: trivia 2026-10-15 (5 rows) and poll 2026-10-15 (1 row).
- Issues found and fixed: 5 (4 trivia, 1 poll). Slot 4 (Notre Dame's 2022 Super Regional upset) is clean.

### trivia_questions.54034a05 — 2026-10-15 / slot 1 — ✅ applied (factual error)
**Before:** "Tennessee QB Hendon Hooker was a Heisman finalist in what season?" 2020 / 2019 / 2022 ✔ / 2023
**After:** "Hendon Hooker finished fifth in Heisman Trophy voting, Tennessee's best finish since Peyton Manning, in which season?" A 2021 / B 2023 / C 2022 ✔ / D 2020
**Why:** Hooker was not a finalist. The 2022 finalists were Bennett, Duggan, Stroud, and Williams; Hooker finished fifth (verified on heisman.com). I swapped 2019 (a Virginia Tech year) for 2021, his first season at Tennessee, which makes a better trap.

### trivia_questions.f807eab1 — 2026-10-15 / slot 2 — ✅ applied
**Before:** "Which two Tennessee sports each have their own dedicated standalone stadium...?" one real option + "Only football has a venue" / "Not applicable" / "All sports share one single venue"
**After:** "Tennessee softball plays its home games at which stadium?" A Lindsey Nelson Stadium / B Sherri Parker Lee Stadium ✔ / C Regal Soccer Stadium / D Thompson-Boling Arena
**Why:** Three of the old options were non-answers. Every option is now a real UT venue. I picked softball because a Lindsey Nelson Stadium question already aired on 10-06.

### trivia_questions.80a10911 — 2026-10-15 / slot 3 — ✅ applied (minor wording)
**Before:** "Tyler Bray, a talented but injury-prone Tennessee quarterback, played primarily in which era?"
**After:** "Big-armed quarterback Tyler Bray started for Tennessee during which era?" (options unchanged; Early 2010s ✔)
**Why:** "Injury-prone" was a subjective label. The answer and options were fine.

### trivia_questions.5a8f32fd — 2026-10-15 / slot 5 — ✅ applied (full replacement)
**Before:** SEC first-round NFL Draft picks, True/False (one real option, three absurd ones). Category: SEC Knowledge.
**After:** "Which Tennessee receiver won the 2022 Biletnikoff Award, highlighted by a school-record five touchdown catches in the 52-49 win over Alabama?" A Cedric Tillman / B Bru McCoy / C Jalin Hyatt ✔ / D Squirrel White. Category changed to Vol Football History.
**Why:** The old question had a broken structure. The new one is verified: Hyatt won the 2022 Biletnikoff and caught five TDs against Alabama on Oct. 15, 2022, so it airs on the game's anniversary. All three traps are real 2022 Vol receivers.

### daily_polls.66e258a6 — 2026-10-15 — ✅ applied
**Before:** "Who is the best three-point shooter in Tennessee basketball history?" Chris Lofton / Allan Houston / Dane Bradshaw / Jordan Bone
**After:** option_c "Dane Bradshaw" → "Santiago Vescovi"
**Why:** Bradshaw was a glue guy, not known as a shooter. Vescovi is one of the program's most prolific three-point shooters and a real contender for a fan's vote.

### Still open
- No `daily_polls` rows exist for 2026-10-12, 10-13, or 10-14. Adding them is new content, so I left them for David to decide.

## 2026-10-12 — poll refresh (APPLIED to DB, per David's 2026-10-12 instruction)
**New standing rule from David:** every day gets a poll, and every poll is about Tennessee football right now, tied to the previous game or the upcoming one.

Context, from the site's own `live_games` table: Tennessee won 24-17 at Arkansas on 10-10 as a 13.5-point favorite. Next up is Alabama at Neyland on 10-17, with Tennessee a 7.5-point underdog, and after that a road game at South Carolina.

| Date | Change | Poll |
|---|---|---|
| 10-12 | ➕ inserted | The Vols won 24-17 at Arkansas but didn't cover as 13.5-point favorites. How do you feel about that road win? |
| 10-13 | ➕ inserted | Tennessee is a 7.5-point home underdog to Alabama on Saturday. Who wins the Third Saturday in October? |
| 10-14 | ➕ inserted | What's the biggest key for the Vols to beat Alabama on Saturday? |
| 10-15 | ✏️ replaced "best three-point shooter in Tennessee basketball history" | How many points do the Vols score against Alabama on Saturday? |
| 10-16 | ✏️ replaced "best Vol football defensive coordinator of all time" | Which unit has to play its best game for the Vols to beat Bama? |
| 10-17 | ✏️ replaced "greatest win in Lady Vols basketball history" | It's Alabama at Neyland today. How are you watching? |
| 10-18 | ✏️ replaced "prediction for Tennessee's record this season" | How would you grade the Vols' performance against Alabama? (worded so it works whatever the result) |
| 10-19 | ✏️ replaced "best Vol baseball tradition" | Next up: Tennessee at South Carolina. What's your call? |

- None of the replaced polls had any votes when I changed them.
- The full option text is in the database.
- From now on, the daily QA run will check each new date in its window. It adds a poll if one is missing and rewrites any that isn't about current Vol football. Polls dated after a game are worded so they work whatever the result, or get rewritten once the result is in.

## 2026-10-13 — run summary (fixes APPLIED to DB, per David's 2026-10-11 instruction)
- Checked: trivia and polls for 2026-10-13 through 2026-10-16.
- Trivia for 10-13 to 10-15 and polls through 10-19 had already been fixed or refreshed in earlier runs. The only new content this run was the 10-16 trivia set (5 rows).
- Poll for 10-16: present, about Alabama week, so it follows David's rule.
- Issues found and fixed: 4 trivia rows. Slot 1 ("Third Saturday in October" → Alabama) was already correct and fits Bama week.

### trivia_questions.d6aabd8b — 2026-10-16 / slot 2 — ✅ applied (duplicate + weak distractors)
**Before:** "Which Lady Vol swimmer became the first in program history to win three career Olympic medals...?" Gretchen Walsh / Michelle Snow / Tamika Catchings / Erika Connolly ✔
**After:** "Before home games, Tennessee's players take the field by running through a giant formation made by the Pride of the Southland Band. What is it called?" A The Vol Walk / B Running Through the T ✔ / C The Power T Charge / D The Checkerboard Run
**Why:** Connolly's Olympic medals were already asked on 10-08. Also, two of the wrong answers were basketball players, which anyone could rule out. The replacement is a game-week tradition question, and the Vol Walk is a real tradition, so it works as a trap.

### trivia_questions.55c13ec6 — 2026-10-16 / slot 3 — ✅ applied
**Before:** "...In which conference division did the two schools [Tennessee, Florida] once share membership...?" They have never shared a division / Big 12 / SEC West / SEC East ✔
**After:** "Tennessee won its first College World Series title in 2024 by beating which team in the finals?" A Florida / B Kentucky / C Texas A&M ✔ / D North Carolina
**Why:** The old question had a non-answer and an absurd option (Big 12), and it repeated the "SEC dropped divisions" topic from 10-11. The new answer is verified (Tennessee beat Texas A&M 6-5 in Game 3). All three wrong answers were real 2024 CWS teams.

### trivia_questions.4817885e — 2026-10-16 / slot 4 — ✅ applied
**Before:** "...opened its season with a tough true road environment against which nonconference opponent?" Syracuse ✔ / Kentucky / Memphis / Vanderbilt
**After:** "Tennessee's 1998 national title team opened its season with a 34-33 road win over which nonconference opponent?" A Syracuse ✔ / B Houston / C Memphis / D UAB
**Why:** Kentucky and Vanderbilt are SEC teams, so the word "nonconference" ruled them out. Houston and UAB were real 1998 nonconference opponents, so the wrong answers are now believable. Verified: the opener was a 34-33 win at Syracuse on a field goal as time expired.

### trivia_questions.70acf233 — 2026-10-16 / slot 5 — ✅ applied (full replacement)
**Before:** "The SEC generally has among the highest number of former players on active NFL rosters... True or false?" True ✔ / Not applicable / ranks last / zero players
**After:** "Tennessee's 52-49 win over Alabama in 2022 snapped a losing streak against the Tide of how many games?" A 10 / B 12 / C 15 ✔ / D 17. Category changed to Vol Football History.
**Why:** The old question was a broken True/False. The new one is timely for Bama week and verified: the 2022 win ended a 15-game losing streak that dated back to 2007.

## 2026-10-14 — run summary (fixes APPLIED to DB, per David's 2026-10-11 instruction)
- Checked: trivia and polls for 2026-10-14 through 2026-10-17.
- Everything through 10-16 was handled in earlier runs. The only new content this run was the 10-17 trivia: 5 rows, all airing on Alabama game day.
- Poll for 10-17: one exists ("It's Alabama at Neyland today. How are you watching?"), so it meets David's rule.
- Issues found and fixed: 3. Slot 1 (Todd Helton as a two-sport Vol) and slot 2 (2023 Citrus Bowl) are clean.

### trivia_questions.8cedea43 — 2026-10-17 / slot 3 — ✅ applied (full replacement)
**Before:** "Tennessee's athletic department sponsors roughly how many varsity sports...?" Exactly 2 / Exactly 5 / Around 20 ✔ / Over 100
**After:** "After Tennessee beats Alabama in the Third Saturday in October, players and fans traditionally celebrate by lighting up what?" A Victory cigars ✔ / B Sparklers / C Candles / D Torches
**Why:** Three of the four options were absurd, and the replacement is a game-day question. The victory-cigar tradition dates to the early 1960s (verified).

### trivia_questions.cc373fdf — 2026-10-17 / slot 4 — ✅ applied (factual error + self-answering stem)
**Before:** "Tennessee QB Rick Clausen famously led a fourth-quarter comeback win over Georgia in 2005 after entering the game as a backup. What year was that?" 2007 / 2001 / 2005 ✔ / 2003
**After:** "In 2005, backup QB Rick Clausen came off the bench to rally Tennessee from 21-0 down to a 30-27 overtime win at which school, the one he had transferred from?" A Georgia / B Florida / C LSU ✔ / D Auburn
**Why:** The famous comeback was against LSU in Baton Rouge, not Georgia (verified). The old question also stated the year it was asking for.

### trivia_questions.bf37dc5c — 2026-10-17 / slot 5 — ✅ applied (full replacement)
**Before:** "SEC schools' recent (2020s) facility investments have frequently been compared... True or false?" Not applicable / never spent money / True ✔ / Only Tennessee has invested
**After:** "What is Neyland Stadium's official seating capacity?" A 88,548 / B 95,000 / C 101,915 ✔ / D 107,601. Category changed to General Vol Athletics.
**Why:** The old question was a broken True/False. The replacement fits game day, and 101,915 is verified.

## 2026-10-15 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)
- Checked: trivia 2026-10-15 → 2026-10-18, polls 2026-10-15 → 2026-10-18
- 10-15 → 10-17 trivia and all polls were already reviewed/fixed in earlier runs (PRs #211, #214, #215, #216); re-checked, no new issues
- New in window: 2026-10-18 trivia. Issues found: 2, both applied. Slots 1, 3, 4 clean.
- Polls: present for every date through 2026-10-19 (Alabama week / South Carolina preview)

### trivia_questions.9e14f7c6-d43e-435c-a8c9-94226ebfe332 — 2026-10-18 / slot 2 — ✅ applied
**Before:** option_a = "Pat Summitt (deceased by then)"
**After:** option_a = "Nikki Caldwell"
**Why:** Meta-commentary in a distractor, and it rules itself out. Nikki Caldwell is a former Lady Vol player/assistant, so she's a plausible wrong answer. Correct answer (B, Kellie Harper) unchanged.

### trivia_questions.9f3b7ff1-cfab-4af4-9751-023f8725d093 — 2026-10-18 / slot 5 — ✅ applied
**Before:** a stem that gave away its own answer (11 + 5 = 16) with absurd distractors
**After:** "Tennessee men's basketball reached its first-ever Elite Eight in which season?" — A 2008 / **B 2010 ✔** / C 2019 / D 2024
**Why:** Rewrote as a real Hard basketball-history question. Verified: the 2010 team under Bruce Pearl made the program's first Elite Eight, losing 70-69 to Michigan State. 2024 was a later Elite Eight, so it's a fair distractor because the question asks for the *first*. Category stays Vol Basketball History.

## 2026-10-16 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)
- Checked: trivia 2026-10-16 → 2026-10-19, polls 2026-10-16 → 2026-10-19
- 10-16 → 10-18 already reviewed/fixed in earlier runs (PRs #215, #216, #218); re-checked, no new issues
- New in window: 2026-10-19 trivia. Issues found: 5, all applied. No answers logged for 10-19 yet.
- Polls: present for every date in the window (10-19 = South Carolina preview). Next run must add a 10-20 poll.

### trivia_questions.99f15dcc-b69c-446f-bf50-1d2581442239 — 2026-10-19 / slot 1 — ✅ applied (replaced)
**Before:** "Which Lady Vol coach led the program from 2019 to 2023, a former Vol player herself?" (Kellie Harper ✔)
**After:** "In 2005, Tennessee named the Thompson-Boling Arena basketball court in honor of Pat Summitt. What is the court called?" — A Pat's Place / B Lady Vol Court / **C The Summitt ✔** / D The Big Orange Floor
**Why:** Wrong dates (Harper coached 2019–2024), and it nearly duplicates 10-18 slot 2 (also about Kellie Harper). Verified: the court was named "The Summitt" after her 880th win on March 22, 2005. Checked ±30 days for duplicates.

### trivia_questions.32443c48-8541-48db-ba07-3f0526dac80d — 2026-10-19 / slot 2 — ✅ applied (replaced)
**Before:** "Tennessee's 2022 season included a marquee win over which rival, ending a long losing streak in the series?" (Alabama ✔)
**After:** "Who was Tennessee's head coach for the 1998 national championship season?" — A Johnny Majors / **B Phillip Fulmer ✔** / C Derek Dooley / D Lane Kiffin
**Why:** Near-duplicate of 10-16 slot 5 (52-49 over Alabama, snapping the losing streak). Checked ±21 days for duplicates.

### trivia_questions.4c86b75a-1ae3-4474-ad83-b296a87690a7 — 2026-10-19 / slot 3 — ✅ applied (distractors)
**Before:** A Don DeVoe / B Ray Mears ✔ / C Rick Barnes / D Bruce Pearl
**After:** A Don DeVoe / **B Ray Mears ✔** / C Emmett Lowery / D John Sines
**Why:** Barnes and Pearl are modern coaches, so a "1960s and 70s" stem rules them out on sight. Replaced them with Mears' real predecessors, Lowery (1947–59) and Sines (1959–62). Verified: Mears made 3 NCAA trips, including the program's first-ever in 1967.

### trivia_questions.dc5f0191-3b60-4fe7-9121-1d85f5aa901e — 2026-10-19 / slot 4 — ✅ applied
**Before:** "...Approximately how many points did she score?" — Exactly 1,000 / Over 10,000 / Over 3,000 ✔ / Under 500
**After:** "Chamique Holdsclaw is Tennessee's all-time leading scorer, men or women. How many career points did she score?" — A 2,510 / B 2,785 / **C 3,025 ✔** / D 3,210
**Why:** The old distractors were absurd. Verified: 3,025 points, the only Lady Vol to pass 3,000.

### trivia_questions.0476b157-f0dc-4363-b440-6c94c7013499 — 2026-10-19 / slot 5 — ✅ applied (rewritten)
**Before:** "Tennessee's 1990 Sugar Bowl-winning team, under Johnny Majors, featured which running back's huge performance against Virginia?" (Chuck Webb ✔)
**After:** "Chuck Webb ran for how many yards in Tennessee's 31-27 win over Arkansas in the January 1, 1990 Cotton Bowl?" — A 178 / B 212 / **C 250 ✔** / D 294
**Why:** Factually wrong. Webb's big bowl game was the Jan. 1, 1990 Cotton Bowl vs Arkansas (26 carries, 250 yards, 2 TDs). The stem had attached his performance to the wrong bowl and opponent (Jan. 1, 1991 Sugar Bowl vs Virginia). 294 is a fair hard-level distractor because it's his school-record game vs Ole Miss.

## 2026-10-17 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)
- Checked: trivia 2026-10-17 → 2026-10-20, polls 2026-10-17 → 2026-10-20
- 10-17 → 10-19 already reviewed/fixed in earlier runs (PRs #216, #218, #219); re-checked, no new issues
- New in window: 2026-10-20 trivia. Issues found: 5, all applied. No answers logged for 10-20 yet.
- Polls: 10-20 had no poll. Added one for South Carolina week (below). The Alabama game (kickoff 19:30 UTC today) hadn't been played at run time, so the 10-18 poll stays result-neutral.

### daily_polls.16d4bbed-6f92-4515-896e-6cdd893e3137 — 2026-10-20 — ✅ inserted
**Before:** (no poll for 10-20)
**After:** "What's the biggest key for the Vols at South Carolina this week?" — Handling the road crowd at Williams-Brice / Avoiding a letdown after the Alabama game / Slowing down the Gamecocks' offense / Winning the turnover battle
**Why:** David's 10-12 instruction: every day gets a poll about current TN football, tied to the previous or next game. Works whether Saturday's Alabama result is a win or a loss.

### trivia_questions.54516273-b499-4aef-aacd-49d93471f678 — 2026-10-20 / slot 1 — ✅ applied (replaced)
**Before:** "Which Tennessee forward was a key veteran leader and consensus All-American-caliber wing on the 2018-19 #1-ranked team?" (Admiral Schofield)
**After:** "Who has been Tennessee's head men's basketball coach since 2015?" — **A Rick Barnes ✔** / B Bruce Pearl / C Cuonzo Martin / D Donnie Tyndall
**Why:** "consensus All-American-caliber" is vague and misleading. Grant Williams was the consensus All-American on that team, so a fan could argue for him. A plain Easy question replaces it. The Grant Williams SEC POY question is already scheduled for 11-09, so I avoided that angle.

### trivia_questions.3f269128-82ec-4a4c-87da-3c924986fa4b — 2026-10-20 / slot 2 — ✅ applied (replaced)
**Before:** "Peyton Manning won the SEC's Male Athlete of the Year award ... what other honor is he most associated with?" — Academic All-American ✔ / batting title / Olympic swimming medal / national basketball title
**After:** "As a senior in 1997, Peyton Manning won which award given to the nation's top college quarterback?" — **A Davey O'Brien Award ✔** / B Doak Walker Award / C Biletnikoff Award / D Outland Trophy
**Why:** Absurd distractors and a fuzzy premise. Verified: Manning won the 1997 Davey O'Brien Award (per the award's official winners list). He also won the Maxwell, so I kept it out of the options. The 1997 SEC title game is already scheduled for 10-27, so I avoided that.

### trivia_questions.15ea0218-3bef-4040-89b1-cab240c455b8 — 2026-10-20 / slot 3 — ✅ applied (replaced)
**Before:** "Which do-it-all forward was named to the SEC All-Freshman team before becoming a star upperclassman for Tennessee in the 2020s?" — "Only seniors are eligible" / "No Tennessee player has made this team" / Julian Phillips ✔ / "The award doesn't exist"
**After:** "Before his 2023-24 SEC Player of the Year season, Dalton Knecht transferred to Tennessee from which school?" — **A Northern Colorado ✔** / B Northern Iowa / C North Dakota State / D UNC Wilmington
**Why:** Three non-answer distractors, and the premise is false: Phillips left for the NBA after one season, so he was never an upperclassman. Verified: Knecht went from Northeastern JC to Northern Colorado to Tennessee, and was AP SEC POY in 2024. Different angle from the 09-30 Knecht draft question.

### trivia_questions.45879ea1-91ab-4846-9b73-9ccdc82d1a07 — 2026-10-20 / slot 4 — ✅ applied (replaced)
**Before:** True/false with "has never appeared" / "Not applicable" / "ranks last" / True ✔ as the options
**After:** "Tennessee was a charter member of the SEC, which was founded at a meeting in Knoxville in what year?" — A 1921 / **B 1932 ✔** / C 1946 / D 1958
**Why:** A broken True/False with non-answer options. Rebuilt as 4-option. Verified: the SEC was formed in December 1932 in Knoxville. 1921 is a fair trap because that's when Tennessee joined the Southern Conference. Category SEC Knowledge stays.

### trivia_questions.bb004e98-e91b-4609-b4e4-a8cc18c26619 — 2026-10-20 / slot 5 — ✅ applied
**Before:** "Which Tennessee offensive lineman was a first-round NFL Draft pick ... in 1991?" — Richmond Webb / Antone Davis ✔ / Trey Smith / Charles McRae
**After:** "Tennessee had two offensive tackles taken in the top 8 of the 1991 NFL Draft. Charles McRae was one. Who was the other?" — A Harry Galbreath / **B Antone Davis ✔** / C Tom Myslinski / D Raleigh McKenzie
**Why:** Two correct answers. McRae (#7, Tampa Bay) and Davis (#8, Philadelphia) were both 1991 first-rounders. Richmond Webb played at Texas A&M, not Tennessee. The new stem uses the historic 7-8 fact, and the distractors are real Vol linemen who weren't 1991 first-rounders.

_Note: the Supabase MCP connection timed out on several multi-statement writes this run, so I applied the fixes as single-row UPDATEs and confirmed each with a SELECT afterward. Only one 10-20 poll row exists._

## 2026-10-18 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)
- Checked: trivia 2026-10-18 → 2026-10-21, polls 2026-10-18 → 2026-10-21
- Game context: `live_games` shows Tennessee 26, Alabama 10 (status `calculated`). The 10-18 poll (grade the Alabama game) and the 10-19/10-20 South Carolina polls work as written.
- 10-18 → 10-20 already reviewed/fixed in earlier runs (PRs #218, #219, #221); re-checked, no new issues
- New in window: 2026-10-21 trivia. Issues found: 4, all applied; slot 3 clean. 10-21 had no poll, so I added one. No answers logged for 10-21 yet.
- Heads-up for the next run: the 10-22 poll is "Who is the greatest Tennessee quarterback of all time?" That's evergreen, not about the current season. It's outside today's window; the next run will make it about the South Carolina game.

### daily_polls.a2f2e55f-3702-438e-a54e-fbf09235e280 — 2026-10-21 — ✅ inserted
**Before:** (no poll for 10-21)
**After:** "After the win over Alabama, where should the Vols land in this week's AP poll?" — Top 5 / 6 to 10 / 11 to 15 / Outside the top 15
**Why:** Every day needs a poll about current TN football (David, 10-12). This one ties to the previous game. It doesn't quote the score or any ranking, so it can't go stale.

### trivia_questions.7e8f0776-5304-4e9a-8aa2-e352429c0454 — 2026-10-21 / slot 1 — ✅ applied
**Before:** option_d = "One"
**After:** option_d = "Five"
**Why:** "One" contradicted the stem ("spread across how many separate stints"), so it ruled itself out. Correct answer A "Three" unchanged (1926–34, 1936–40, 1946–52).

### trivia_questions.7370edad-b8db-42ef-9378-3600ac490f3f — 2026-10-21 / slot 2 — ✅ applied (replaced)
**Before:** "Which athletic, highly touted forward joined Tennessee's program as a recruit in the mid-2020s?" — three non-answer distractors / Julian Phillips ✔
**After:** "Who was named MVP of the 2022 SEC Tournament, when Tennessee won its first SEC Tournament title since 1979?" — A Santiago Vescovi / **B Kennedy Chandler ✔** / C Josiah-Jordan James / D Zakai Zeigler
**Why:** Vague stem, three non-answer options, and a repeat of the Julian Phillips question fixed on 10-20. Verified: Chandler was SEC Tournament MVP when Tennessee beat Texas A&M 65-50 in 2022, the first title since 1979 (UTSports, CBS). The distractors are teammates from the all-tournament team or roster. I avoided the Zeigler DPOY (10-08) and SEC-tourney count (10-29) questions.

### trivia_questions.9720a1ce-bf04-40a3-a826-7887cd3f15b7 — 2026-10-21 / slot 4 — ✅ applied (replaced; category → General Vol Athletics)
**Before:** "Tennessee's rivalry with Florida in basketball has become more prominent as both programs improved during which coaching tenure at Tennessee?" (Rick Barnes)
**After:** "Fans in the "Vol Navy" sail to Neyland Stadium on game day along which river?" — A Cumberland River / B Holston River / **C Tennessee River ✔** / D French Broad River
**Why:** The old question was opinion with no defensible single answer. It was also partly about a rival. Different angle from the 10-02 Vol Navy question, which asked the start year. Fair trap: the Holston and French Broad join to form the Tennessee River in Knoxville.

### trivia_questions.211d32ca-0b22-4bbb-8468-7e4038a0f0ff — 2026-10-21 / slot 5 — ✅ applied (replaced)
**Before:** a broken True/False about Vitello's nonconference schedule — "Not applicable" / "Among the weakest" / "only plays exhibition games" / True ✔
**After:** "In what year did Tennessee baseball make its first College World Series appearance, finishing as national runner-up?" — A 1966 / **B 1951 ✔** / C 1995 / D 2001
**Why:** Non-answer options, and the premise was opinion. Verified: the 1951 Vols were runner-up to Oklahoma, and the program didn't return until 1995, which makes 1995 a good trap. Vitello is already covered heavily (09-19, 10-02, 10-03, 10-28).

## 2026-10-19 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)
- Checked: trivia 2026-10-19 → 2026-10-22, polls 2026-10-19 → 2026-10-22
- 10-19 → 10-21 already reviewed/fixed in earlier runs (PRs #219, #221, #222); re-checked, no new issues
- New in window: 2026-10-22 trivia + poll. Issues found: 4, all applied (3 trivia + 1 poll). Slots 2 and 3 clean. No votes or answers yet for 10-22.
- Heads-up for the next run: the 10-23 poll is an evergreen "best point guard in Tennessee basketball history" poll. It's outside today's window, so the next run will make it about the South Carolina game (that's game eve).

### daily_polls.a3c556a3-fae6-4cbf-8699-bba1b1681d89 — 2026-10-22 — ✅ applied (replaced)
**Before:** "Who is the greatest Tennessee quarterback of all time?" — Peyton Manning / Heath Shuler / Tee Martin / Erik Ainge
**After:** "Fresh off the Alabama win, what would a win at South Carolina mean for the Vols?" — Keeps the playoff push rolling / A must-win to stay in the SEC race / Just one more step, nothing bigger / Proof this team is for real
**Why:** David's 10-12 rule: every poll is about TN football right now and tied to the previous or next game. This one ties both together. 0 votes on the old poll.

### trivia_questions.abe5ce81-e478-4735-98e3-f723eb4b1b04 — 2026-10-22 / slot 1 — ✅ applied (distractors)
**Before:** "Only football players receive campus honors" / "No Lady Vol has ever been honored on campus" / "Not applicable" / Pat Summitt ✔
**After:** A Holly Warlick / B Chamique Holdsclaw / C Candace Parker / **D Pat Summitt ✔**
**Why:** Three non-answer options. They're now real Lady Vol legends, so a fan has to actually know about the statue and plaza.

### trivia_questions.6b0809c0-3ff2-496e-950e-7362bb0f1af2 — 2026-10-22 / slot 4 — ✅ applied (replaced; category → SEC Knowledge)
**Before:** "Antone Davis was drafted in which round, and by which team, in 1991?" (First round, Eagles)
**After:** "South Carolina, Tennessee's opponent this week, played its first season of SEC football in what year?" — A 1972 / **B 1992 ✔** / C 2002 / D 2012
**Why:** Near-duplicate of 10-20 slot 5 (Davis going 8th in 1991). The new question ties to this week's game. Verified: South Carolina and Arkansas both started SEC football in 1992, with South Carolina placed in the East. 2012 is a fair trap because that's when Texas A&M and Missouri joined.

### trivia_questions.c38aa2de-942b-4c13-a397-30cfc19dfb62 — 2026-10-22 / slot 5 — ✅ applied (replaced)
**Before:** a broken True/False about Candace Parker's advocacy — True ✔ / "Not applicable" / two non-answer options
**After:** "The Lady Vols won the first of their eight national championships in which year?" — A 1982 / B 1984 / **C 1987 ✔** / D 1991
**Why:** Non-answer options, and the old answer was an opinion, not a fact. Verified: Tennessee beat Louisiana Tech 67-44 on March 29, 1987, for Summitt's first title. A different angle from the 10-14 question about which coach won it.

## 2026-10-20 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)
- Checked: trivia 2026-10-20 → 2026-10-23, polls 2026-10-20 → 2026-10-23
- 10-20 → 10-22 already reviewed/fixed in earlier runs (PRs #221, #222, #223); re-checked. One follow-up fix on 10-22 (below).
- New in window: 2026-10-23 trivia + poll. Issues found: 5 (3 trivia + 1 poll + 1 cross-day giveaway), all applied. Slots 2 and 4 clean. No votes or answers yet for 10-23.
- Heads-up for the next run: the 10-24 poll (game day at South Carolina) is "Should Tennessee build a new baseball stadium?". It's outside today's window; the next run will make it a game-day poll.

### daily_polls.dfd8d128-db22-4e1a-8fcc-6d54b1108244 — 2026-10-23 — ✅ applied (replaced)
**Before:** "Who is the best point guard in Tennessee basketball history?" — Jordan Bone / Zakai Zeigler / Tony Harris / Kennedy Chandler
**After:** "Kickoff at South Carolina is tomorrow. Which side of the ball wins it for the Vols?" — The offense / The defense / Special teams / Coaching and adjustments
**Why:** David's 10-12 rule: polls are about TN football right now and tied to the next game. 10-23 is the day before kickoff. 0 votes on the old poll.

### trivia_questions.c38aa2de-942b-4c13-a397-30cfc19dfb62 — 2026-10-22 / slot 5 — ✅ applied (follow-up)
**Before:** "The Lady Vols won the first of their eight national championships in which year?"
**After:** "The Lady Vols won their first NCAA national championship in which year?"
**Why:** "eight" gave away the answer to 10-23 slot 2 (how many titles Pat Summitt won), one day later. Options and answer (1987) unchanged.

### trivia_questions.f521d5c8-dc57-48b4-adaf-a06df15e773d — 2026-10-23 / slot 1 — ✅ applied (distractors)
**Before:** A Zero / B Six ✔ / C One / D Ten or more
**After:** A Two / **B Six ✔** / C Four / D Eight
**Why:** "Zero" and "Ten or more" were throwaway answers. Swapped them for plausible counts. Tennessee claims 1938, 1940, 1950, 1951, 1967 and 1998.

### trivia_questions.36213646-e28d-47a9-9f19-3310e6035e57 — 2026-10-23 / slot 3 — ✅ applied (replaced)
**Before:** "Jordan McRae holds a notable Tennessee career scoring distinction. What is it?" — "He never scored a point" / "He only played one season" / "defensive specialist with minimal scoring" / "among the program's all-time leading scorers" ✔
**After:** "Before Thompson-Boling Arena opened in December 1987, Tennessee basketball played its home games where?" — A Alumni Memorial Gym / B Knoxville Civic Coliseum / **C Stokely Athletic Center ✔** / D Pratt Pavilion
**Why:** Three non-answer options and a vague answer. Verified: Thompson-Boling opened Dec. 3, 1987 (82-56 over Marquette), and Stokely (opened 1958 as the UT Armory-Fieldhouse) was home until then. Alumni Gym, the earlier home, is a fair trap. I avoided Bruce Pearl/No. 1 (10-09) and the Thompson-Boling capacity question (11-14).

### trivia_questions.3f473985-302c-4cfa-b3e4-65c2705f0eb2 — 2026-10-23 / slot 5 — ✅ applied (rewritten)
**Before:** "Which award did Todd Helton win three times during his MLB career, recognizing defensive excellence at first base?" — Rookie of the Year / Gold Glove ✔ / MVP / Cy Young
**After:** "Former Vols QB and first baseman Todd Helton won which MLB honor exactly three times?" — A All-Star selection / **B Gold Glove Award ✔** / C Silver Slugger Award / D NL batting title
**Why:** The stem gave the answer away ("defensive excellence"), and a Cy Young for a first baseman rules itself out. Verified: 3 Gold Gloves (2001, 2002, 2004), 4 Silver Sluggers, 5 All-Star selections, 1 batting title (2000). Every option is a real Helton honor, so a fan needs the count.

## 2026-10-21 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)
- Checked: trivia 2026-10-21 → 2026-10-24, polls 2026-10-21 → 2026-10-24
- 10-21 → 10-23 already reviewed/fixed in earlier runs (PRs #222, #223, #226); re-checked, no new issues
- Also logging yesterday's preview change: the 10-21 poll was reworded from "...where should the Vols land in this week's AP poll?" to "After the win over Alabama, where should the Vols be ranked?" The AP poll comes out Sunday/Monday, so "this week's poll" read as stale by Wednesday.
- New in window: 2026-10-24 (South Carolina game day) trivia + poll. Issues found: 4, all applied (3 trivia + 1 poll). Slots 3 and 5 clean. No votes or answers yet for 10-24.
- Heads-up for the next run: the 10-25 poll (day after South Carolina) is an evergreen "greatest Lady Vol" poll. It's outside today's window; the next run will make it a post-game poll.

### daily_polls.4baa54e5-4718-4d4e-8f0e-3f7fda4c67ac — 2026-10-24 — ✅ applied (replaced)
**Before:** "Should Tennessee build a new baseball stadium?" — Yes, Lindsey Nelson needs an upgrade / No, keep the current stadium / Eventually yes / Only if it helps recruiting
**After:** "Game day at Williams-Brice! What's the story of today's game?" — The run game carries the Vols / The passing game takes over / The defense dominates / It comes down to the final drive
**Why:** It's game day at South Carolina, and polls must be about the current game (David, 10-12). 0 votes on the old poll.

### trivia_questions.c725eee5-84ad-4b5f-a2e7-ce2bfbc0f8c8 — 2026-10-24 / slot 1 — ✅ applied (replaced; category → Vol Football History)
**Before:** "How many times has Tennessee reached the NCAA Tournament's Sweet 16 or better in program history?" — "Exactly once" / "Zero times" / "Tennessee has never made the tournament" / "A handful of times, including Elite Eights in 2010, 2024, 2025, and 2026" ✔
**After:** "Which Tennessee quarterback was the No. 1 overall pick in the 1998 NFL Draft?" — A Tee Martin / B Heath Shuler / **C Peyton Manning ✔** / D Hendon Hooker
**Why:** The right answer was the only long, specific option, and the other three were non-answers. A football Easy fits game day. Checked ±30 days for duplicates.

### trivia_questions.e4a1ab9d-3031-4177-93aa-5b5d5f5ba02a — 2026-10-24 / slot 2 — ✅ applied (replaced)
**Before:** "...NCAA Regional/Super Regional hosting duties became a near-annual expectation beginning in which coach's tenure?" — four long meta options ("Both Delmonico's and Vitello's tenures included hosting duties..." ✔ / "Tennessee has never hosted" / ...)
**After:** "Which coach led Tennessee baseball to the College World Series in 1995, 2001 and 2005?" — A Dave Serrano / **B Rod Delmonico ✔** / C Todd Raleigh / D Tony Vitello
**Why:** The right answer was a sentence restating the question, and the other options were non-answers. Verified: Delmonico (1990–2007) took the Vols to Omaha in 1995, 2001 and 2005. All four options are real Tennessee head coaches. I avoided Lindsey Nelson Stadium (10-06, 11-07).

### trivia_questions.5ab0cdc9-676d-4cd0-857e-44c5b32a2718 — 2026-10-24 / slot 4 — ✅ applied
**Before:** "...approximately how many wins?" — "Exactly 500" / "Over 1,000" ✔ / "Over 2,000" / "Under 200"
**After:** "How many career wins did Pat Summitt finish with as Lady Vols head coach?" — A 880 / B 1,012 / **C 1,098 ✔** / D 1,202
**Why:** Absurd distractors. Summitt finished with 1,098 wins. 880 is a fair trap because her 880th win broke Dean Smith's D-I record in 2005.

## 2026-10-22 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)
- Checked: trivia 2026-10-22 → 2026-10-25, polls 2026-10-22 → 2026-10-25
- 10-22 → 10-24 already reviewed/fixed in earlier runs (PRs #223, #226, #227); re-checked, no new issues
- Also logging yesterday's preview change. 10-22 slot 3 (Wade Houston): the right answer was the only long, specific option. All four are now parallel "He was the first…" claims; the answer is still D, "He was Tennessee's first Black head basketball coach".
- New in window: 2026-10-25 (day after South Carolina) trivia + poll. Issues found: 4, all applied (3 trivia + 1 poll). Slots 1 and 2 clean. No votes or answers yet for 10-25.
- Heads-up for the next run: the 10-26 poll ("What would a perfect Tennessee football season look like?") is evergreen. It's outside today's window; the next run will tie it to the South Carolina result or the next opponent.

### daily_polls.26aa93d4-26f8-48f5-a4bc-8c6afecc4458 — 2026-10-25 — ✅ applied (replaced)
**Before:** "Who is the greatest Lady Vol basketball player of all time?" — Holdsclaw / Parker / Catchings / Pat Summitt (as coach)
**After:** "How would you grade the Vols' performance at South Carolina?" — A, a statement win / B, solid with a few mistakes / C, up and down / D or F, not good enough
**Why:** The day after the game, the poll should be about that game (David, 10-12). The grades work whether it was a win or a loss, and they match the 10-18 Alabama grade poll. 0 votes on the old poll.

### trivia_questions.24981a18-6db7-44db-87f1-072c09080330 — 2026-10-25 / slot 3 — ✅ applied (replaced)
**Before:** "Pat Summitt coached 62 players who went on to coaching... Which two... later led Tennessee itself?" — "Not applicable" / Holly Warlick and Kellie Harper ✔ / two non-answers
**After:** "The Lady Vols completed a perfect 39-0 season, capped by a national title, in which year?" — A 1996 / **B 1998 ✔** / C 2004 / D 2008
**Why:** Three non-answers, and Warlick/Harper were already covered on 10-18, 10-22 and 10-25 slot 1. Verified: the 1997-98 team went 39-0 and beat Louisiana Tech for the third straight title. 1996 is a fair trap because it was the first title of the three-peat. I avoided Catchings' gold medals (11-20).

### trivia_questions.e2ad18df-2d3b-4f45-b2ee-d44e2840cf06 — 2026-10-25 / slot 4 — ✅ applied (replaced; category → Vol Football History)
**Before:** "Tennessee's athletic department is one of the larger... budgets... What is this generally attributed to?" — "no athletic department budget" / "Not applicable" / SEC membership and revenue ✔ / "smallest budget in Division I"
**After:** "Coach Doug Dickey first put the Power T on Tennessee's football helmets in which year?" — A 1952 / **B 1964 ✔** / C 1977 / D 1989
**Why:** Non-answer options, and not a trivia fact. Verified: Dickey added the Power T and the checkerboard end zones in his first season, 1964. 1989 is a fair trap because that's when the checkerboards came back.

### trivia_questions.265a86e2-1e0f-49de-a374-9215c3f1b385 — 2026-10-25 / slot 5 — ✅ applied
**Before:** "Reggie White's Tennessee career sack total is commonly cited as approximately how many?" — Around 60 / Around 32 ✔ / Around 10 / Around 5
**After:** "Reggie White set Tennessee's career sack record. How many sacks did he finish with?" — A 22 / B 28 / **C 32 ✔** / D 38
**Why:** "Around 5/10" were throwaways, and "approximately" is hedge wording. Verified: UTSports lists a school-record 32 career sacks.

## 2026-10-23 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)
- Checked: trivia 2026-10-23 → 2026-10-26, polls 2026-10-23 → 2026-10-26
- 10-23 → 10-25 already reviewed/fixed in earlier runs (PRs #226, #227, #229); re-checked, no new issues
- New in window: 2026-10-26 trivia + poll. Issues found: 4, all applied (3 trivia + 1 poll). Slots 1 and 2 clean. No votes or answers yet for 10-26.
- Schedule context (`live_games`): at South Carolina 10-24, then Wofford and Kentucky at home in early November. Both kickoff times look like TBD placeholders.
- Heads-up for the next run: the 10-27 poll ("What is the best Vol basketball tradition?") is evergreen, and one option, "The Vol Walk equivalent before tip-off", is vague. It's outside today's window; the next run will rewrite it as a football poll.

### daily_polls.765277cc-c951-4d95-9b49-d3986450d7f8 — 2026-10-26 — ✅ applied (replaced)
**Before:** "What would a perfect Tennessee football season look like?" — Undefeated regular season / SEC Championship / CFP berth / National Championship
**After:** "South Carolina is in the books. What's the Vols' biggest need for the November stretch?" — Staying healthy / Sharpening the passing game / Tightening up the defense / Cleaning up penalties and turnovers
**Why:** It ties the last game to what's next (David, 10-12), and it works for a win or a loss. The old poll was evergreen, and its options overlapped (an undefeated season implies the others). 0 votes.

### trivia_questions.79026417-38be-480b-8ccd-f215092ef579 — 2026-10-26 / slot 3 — ✅ applied (distractor)
**Before:** option_b = "2001"
**After:** option_b = "2011"
**Why:** Parker's WNBA career started in 2008, so 2001 ruled itself out. Answer A 2013 unchanged (MVPs in 2008 and 2013).

### trivia_questions.c46534c8-6567-41fc-9285-e10421d5a4c3 — 2026-10-26 / slot 4 — ✅ applied (distractors)
**Before:** A 6.50 / B 9.99 / C 3.05 ✔ / D 1.10
**After:** A 2.71 / B 3.62 / **C 3.05 ✔** / D 2.26
**Why:** 9.99 and 1.10 were absurd. Verified: UTSports gives a 25-10 career record with a 3.05 ERA. 2.26 is a fair trap because it's his 2005 single-season ERA.

### trivia_questions.54335360-be00-4285-be2c-cf7d5b86bc32 — 2026-10-26 / slot 5 — ✅ applied (replaced)
**Before:** a broken True/False ("...combined record in SEC Tournament championship games has historically been strongly favorable... True or false?") — "Not applicable" / True ✔ / two non-answers
**After:** "How many SEC Tournament championships did the Lady Vols win under Pat Summitt?" — A 8 / B 12 / **C 16 ✔** / D 20
**Why:** Rebuilt as a 4-option question with a checkable fact. Verified: UTSports reports 16 regular-season and 16 tournament crowns under Summitt.

## 2026-10-24 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-10-24 → 2026-10-27 (4 polls, 20 trivia rows checked).
- 10-24, 10-25 and 10-26 were already cleaned in earlier runs. The two 10-24 fixes from yesterday's preview are logged below.
- 10-27 had 5 issues: 3 duplicates of recent questions, a vague/inaccurate stem, and an off-topic basketball poll. All fixed. No user responses existed on any edited row.
- Game context (`live_games`): Tennessee 26, Alabama 10 (10-17); at South Carolina 10-24, 19:30 UTC (pregame at run time). The 10-27 poll stays result-neutral.

### trivia_questions.5570a95c — 2026-10-24 / slot 3 — ✅ applied (preview, 10-23)
**Before:** A. 2012 ✅ · B. 2014 · C. 2013 · D. 2015
**After:** A. 2011 · B. 2012 ✅ · C. 2013 · D. 2014
**Why:** The years were out of order. Butch Jones was hired in December 2012.

### trivia_questions.75cbd427 — 2026-10-24 / slot 5 — ✅ applied (preview, 10-23)
**Before:** "Which Tennessee quarterback led the 1985 SEC Championship team after an injury to the projected starter, Tony Robinson?" Peyton Manning / Andy Kelly / Daryl Dickey ✅ / Heath Shuler
**After:** "After starter Tony Robinson suffered a season-ending knee injury against Alabama, which quarterback led Tennessee to the 1985 SEC title and a Sugar Bowl win over Miami?" Jeff Francis / Andy Kelly / Daryl Dickey ✅ / Randy Sanders
**Why:** Robinson was the starter, not a "projected" one; he was hurt vs. Alabama on Oct. 19, 1985. Manning and Shuler played years later, so fans could rule them out at a glance. Francis and Sanders were on the 1985 roster.

### daily_polls.1e0d8a34 — 2026-10-27 — ✅ applied
**Before:** "What is the best Vol basketball tradition?" Orange out games / Thompson-Boling atmosphere / The Vol Walk equivalent before tip-off / Senior night
**After:** "Alabama and South Carolina are both in the books. Which unit has carried the Vols through this October stretch?" The quarterback and passing game / The running backs and offensive line / The defensive front / The secondary
**Why:** Polls must be about current TN football and tied to the last or next game. The new poll doesn't depend on the SC result.

### trivia_questions.178f2a42 — 2026-10-27 / slot 1 — ✅ applied
**Before:** "Tennessee's song "Rocky Top" was written about which region?" Smokies/East TN ✅ / Rocky Mountains / West Texas / Southern California
**After:** "Which running back is Tennessee's all-time career rushing leader?" Jamal Lewis / Arian Foster / Travis Henry ✅ / Jalen Hurd
**Why:** The distractors were throwaways, and Rocky Top has been used heavily nearby. Henry holds the record with 3,078 yards (1997–2000).

### trivia_questions.6e405130 — 2026-10-27 / slot 2 — ✅ applied
**Before:** "Which SEC school is Tennessee's oldest and most storied gridiron rival, played every "Third Saturday in October"?" Missouri / Kentucky / Alabama ✅ / Vanderbilt
**After:** "The Vols just played at South Carolina. What is the name of the Gamecocks' home football stadium?" Kyle Field / Williams-Brice Stadium ✅ / Davis Wade Stadium / Vaught-Hemingway Stadium
**Why:** Third Saturday in October was already asked on 10-16 and 10-17. "Oldest" was also wrong: Kentucky (first played 1893) predates Alabama (1901). The new question ties to the SC game.

### trivia_questions.88f4226d — 2026-10-27 / slot 3 — ✅ applied
**Before:** "Tennessee finished Josh Heupel's third season, 2023, with approximately how many wins?" 13 wins / 9 wins ✅ / 5 wins / 3 wins
**After:** "How many wins did Tennessee finish with in 2023, Josh Heupel's third season, capped by a Citrus Bowl victory?" 8 / 9 ✅ / 10 / 11
**Why:** "Approximately" doesn't fit an exact fact (9-4). The options were spread too far apart to be a real test.

### trivia_questions.5efb463c — 2026-10-27 / slot 4 — ✅ applied
**Before:** "Which heralded transfer became Tennessee's focal scoring option during the 2023-24 Elite Eight run?" Allan Houston / Dalton Knecht ✅ / Chris Lofton / Grant Williams
**After:** "Tennessee men's basketball earned its first-ever No. 1 ranking in February 2008 after a road win over which then-No. 1, unbeaten team?" Kansas / North Carolina / Memphis ✅ / Duke
**Why:** Knecht was asked on 10-20, and Houston/Lofton/Williams are overused nearby. Tennessee won 66-62 at No. 1 Memphis on Feb. 23, 2008, and rose to No. 1 on Feb. 25.

10-27 slot 5 (1997 SEC Championship Game vs. Auburn, 30-29) was verified and left as is.

## 2026-10-25 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-10-25 → 2026-10-28 (4 polls, 20 trivia rows checked).
- 10-25 through 10-27 were cleaned in earlier runs (10-27 in PR #232). Today I made one small wording fix to the 10-25 poll and rebuilt 10-28: the poll plus 4 of 5 trivia rows (slots 1, 3, 4 and 5 had "Not applicable"/self-eliminating distractors). No user responses existed on any edited row.
- Game context: `live_games` shows South Carolina 27, Tennessee 24 (10-24, status calculated). I couldn't confirm it on the web, so polls stay result-neutral.

### daily_polls.26aa93d4 — 2026-10-25 — ✅ applied
**Before:** option_a "A, a statement win"
**After:** option_a "A, couldn't ask for more"
**Why:** "Statement win" assumes a result the web hasn't confirmed (live_games shows a 27-24 loss). The new wording works either way.

### daily_polls.7f2eb9be — 2026-10-28 — ✅ applied
**Before:** "What single game changed Tennessee football history the most?" 1998 national championship / 2022 Alabama upset / 2001 SEC championship / 1990 Sugar Bowl
**After:** "With South Carolina behind them, how do you see the Vols finishing the November stretch?" Win out / Drop one game / Drop two games / Three or more losses
**Why:** Polls must be about the current season and tied to the last or next game. (The old "2001 SEC championship" option was also wrong: Tennessee lost that game to LSU.)

### trivia_questions.8772c9ec — 2026-10-28 / slot 1 — ✅ applied
**Before:** "Which Tennessee sport is the only one to have retained standalone "Lady Vols" branding after a broader athletic department rebrand in the 2010s?" Women's basketball ✅ / Baseball / Not applicable / Football
**After:** "Tennessee's "Volunteer State" nickname, the source of the Vols name, is most often traced to Tennesseans who volunteered in which war?" The Revolutionary War / The War of 1812 ✅ / The Civil War / The Spanish-American War
**Why:** The question had a "Not applicable" distractor and men's-only sports as the other wrong answers. Lady Vols branding is also covered on 11-21. The Mexican-American War is left out of the options so there's only one defensible answer.

### trivia_questions.2449538c — 2026-10-28 / slot 3 — ✅ applied
**Before:** "Has Tennessee baseball's average home crowd size … ranked among the top programs nationally during the Vitello era?" Among the top ✅ / Not applicable, no fans attend / Among the lowest / Exactly average, never notable
**After:** "Which Vol was named Most Outstanding Player of the 2024 College World Series after homering in all three games of the finals?" Christian Moore / Blake Burke / Dylan Dreiling ✅ / Billy Amick
**Why:** The question was a yes/no with joke distractors. Dreiling was the 2024 CWS MOP and the first player to homer in all three finals games.

### trivia_questions.66d98992 — 2026-10-28 / slot 4 — ✅ applied
**Before:** "By which recruiting cycle did Tennessee's football recruiting rankings under Josh Heupel climb into the nation's top classes?" Recruiting rankings do not apply / Never cracked the top 25 / Only in the 1990s / By the 2023-2024 cycles ✅
**After:** "Eric Berry won which national award as the nation's top defensive back in 2009?" Bronko Nagurski Trophy / Chuck Bednarik Award / Jim Thorpe Award ✅ / Lott IMPACT Trophy
**Why:** Every distractor eliminated itself, and the "answer" was vague. Berry won the 2009 Thorpe Award. (11-14 asks about his draft slot, a different topic.)

### trivia_questions.61f2b79a — 2026-10-28 / slot 5 — ✅ applied
**Before:** "Which veteran Tennessee player's college career overlapped both a coaching change and a Sweet 16/Elite Eight run…?" All rosters turn over completely / Not applicable / Admiral Schofield… ✅ / No such overlap has ever occurred
**After:** "Tobias Harris played one season at Tennessee (2010-11). With which overall pick was he selected in the 2011 NBA Draft?" 9th / 14th / 19th ✅ / 24th
**Why:** The answer text was the only real option, and Schofield's career never spanned a coaching change (he played 2015-19, all under Barnes). Harris went 19th overall to Charlotte in 2011.

10-28 slot 2 (Orange & White Game) was verified and left as is.

## 2026-10-26 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-10-26 → 2026-10-29 (4 polls, 20 trivia rows checked).
- 10-26 through 10-28 were already cleaned in earlier runs (#232, #233). The two 10-26 fixes from yesterday's preview are logged below.
- 10-29 had 5 issues: an off-topic baseball poll, a factually wrong Music City Bowl question, and three rows with giveaway or self-eliminating options. All fixed. No user responses existed on any edited row.
- Schedule check (utsports.com 2026 release): open date Oct. 31, then Kentucky (H) Nov. 7, at Texas A&M Nov. 14, LSU (H) Nov. 21, at Vanderbilt Nov. 28. The South Carolina result is still not confirmed on the web, so polls stay result-neutral.

### trivia_questions.415a910e — 2026-10-26 / slot 1 — ✅ applied (preview, 10-25)
**Before:** A. 38 ✅ · B. 25 · C. 15 · D. 50
**After:** A. 32 · B. 35 · C. 38 ✅ · D. 41
**Why:** 15, 25 and 50 were easy to rule out for a coach known for nearly four decades (1974–2012).

### trivia_questions.79026417 — 2026-10-26 / slot 3 — ✅ applied (preview, 10-25)
**Before:** "Candace Parker won a second WNBA MVP award in which later season?" 2013 ✅ / 2011 / 2009 / 2020
**After:** "Candace Parker won her first WNBA MVP award as a rookie in 2008. In which later season did she win her second?" 2009 / 2011 / 2013 ✅ / 2020
**Why:** "Later season" had no reference point. The years are now in order.

### daily_polls.6d3e8fba — 2026-10-29 — ✅ applied
**Before:** "Who is the best Vol baseball outfielder of all time?" Todd Helton (before moving to 1B) / Drew Gilbert / Jordan Beck / Dylan Dreiling
**After:** "The Vols are off this Saturday, then Kentucky visits Neyland on Nov. 7. Which November game are you circling?" Kentucky at home (Nov. 7) / At Texas A&M (Nov. 14) / LSU at home (Nov. 21) / At Vanderbilt (Nov. 28)
**Why:** Polls must be about current TN football and tied to the last or next game. Dates are from the official 2026 schedule.

### trivia_questions.5788ab85 — 2026-10-29 / slot 1 — ✅ applied
**Before:** "How many SEC Tournament championships has Tennessee basketball won?" Only the regular-season title, never the tournament / None, never / Five: 1936, 1941, 1943, 1979, and 2022 ✅ / The SEC has no basketball tournament
**After:** "Neyland Stadium is named for which longtime Tennessee head coach?" Doug Dickey / Robert Neyland ✅ / Johnny Majors / Phillip Fulmer (category → Vol Football History)
**Why:** Three distractors were non-answers. The 2022 SEC Tournament was also asked on 10-21, and a running title count could be outdated by the 2026 tournament.

### trivia_questions.edf93450 — 2026-10-29 / slot 3 — ✅ applied
**Before:** "Which Tennessee coach led the Vols to multiple Music City Bowl appearances in the 2000s?" Bill Battle / Phillip Fulmer ✅ / Johnny Majors / Doug Dickey
**After:** "Tennessee's most recent Music City Bowl appearance, a 48-45 overtime loss in Josh Heupel's first season (2021), came against which team?" Nebraska / North Carolina / Iowa / Purdue ✅
**Why:** The old question was false. Tennessee never played in the Music City Bowl under Fulmer; its three appearances were 2010 (L, North Carolina), 2016 (W, Nebraska) and 2021 (L, Purdue 48-45 OT).

### trivia_questions.bedc0fe4 — 2026-10-29 / slot 4 — ✅ applied
**Before:** "Tennessee has won 11 SEC regular-season basketball championships, most recently in which season?" 2023-24 ✅ / 2018-19 / 2007-08 / 2010-11
**After:** "Tennessee hired Bruce Pearl in 2005 after he led which program to the Sweet 16 as a No. 12 seed?" Southern Indiana / UW-Milwaukee ✅ / Iowa / Auburn
**Why:** I couldn't verify the "11 titles" count, and "most recently" may be outdated after the 2025-26 season. Pearl's hire from UW-Milwaukee is verified (Southern Indiana and Iowa were earlier stops; Auburn came later).

### trivia_questions.cc5966d4 — 2026-10-29 / slot 5 — ✅ applied
**Before:** 2-9 / 8-4 / 5-6 ✅ / 3-9
**After:** 3-8 / 4-7 / 5-6 ✅ / 5-7
**Why:** 8-4 isn't a losing record, so it ruled itself out, and 3-9 doesn't add up to the 11-game 2005 schedule. The new options are all plausible losing records.

10-29 slot 2 (Gamecock mascot) was verified and left as is.

## 2026-10-27 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-10-27 → 2026-10-30 (4 polls, 20 trivia rows checked).
- 10-27 through 10-29 were already cleaned in earlier runs (#232–#234), and a re-check found nothing new.
- 10-30 had 6 issues: an off-topic poll and all 5 trivia rows. Slots 1, 3 and 5 had non-answer or absolute-word distractors, slot 2 was factually wrong, and slot 4 had weak distractors. All fixed. No user responses existed on any edited row.
- Schedule context: open date Oct. 31, Kentucky at Neyland Nov. 7.

### daily_polls.f72d73d3 — 2026-10-30 — ✅ applied
**Before:** "What is your favorite Tennessee football tradition?" Vol Walk / Checkerboard endzone / Rocky Top / Running through the T
**After:** "Bye week this Saturday, then Kentucky comes to Neyland on Nov. 7. What's the Vols' biggest edge over the Wildcats?" The passing game / The run game / The defensive front / A rested team and the home crowd
**Why:** Polls must be about the current season and tied to the last or next game.

### trivia_questions.8ebdde64 — 2026-10-30 / slot 1 — ✅ applied
**Before:** "Which Lady Vols legend has been especially active in national broadcasting and media since her playing career ended?" Candace Parker ✅ / No Lady Vol has ever worked in broadcasting / Only men work in basketball broadcasting / Not applicable
**After:** "Former Lady Vol Tamika Catchings spent her entire WNBA career with which franchise?" Connecticut Sun / Indiana Fever ✅ / Detroit Shock / Atlanta Dream
**Why:** Three distractors were non-answers (one also implied only men broadcast). Parker was also the subject on 10-26. Catchings played all 15 WNBA seasons with Indiana and was the 2011 MVP.

### trivia_questions.40c49320 — 2026-10-30 / slot 2 — ✅ applied
**Before:** "Which bluegrass duo originally wrote and recorded "Rocky Top" in the 1960s?" Flatt and Scruggs / The Statler Brothers / The Osborne Brothers ✅ / The Stanley Brothers
**After:** ""Rocky Top" was written by Felice and Boudleaux Bryant in 1967. Which bluegrass group made the first recording of it that year?" (same options, Osborne Brothers ✅)
**Why:** The Osborne Brothers didn't write the song; Felice and Boudleaux Bryant did, in 1967. The Osbornes recorded it first (Nov. 1967, Decca).

### trivia_questions.cf2bc36e — 2026-10-30 / slot 3 — ✅ applied
**Before:** "Tennessee's 2021 team became the program's first in 16 years to reach the College World Series. Which round did the Vols win to get there?" Automatic bid with no games / Did not qualify / Won their Knoxville Super Regional ✅ / Lost in the Super Regional
**After:** "Tennessee's 2021 team ended a 16-year College World Series drought by sweeping which SEC rival in the Knoxville Super Regional?" Vanderbilt / Arkansas / LSU ✅ / Ole Miss
**Why:** Three options contradicted the stem. Tennessee beat LSU 4-2 and 15-6 at Lindsey Nelson Stadium in 2021.

### trivia_questions.d7844b04 — 2026-10-30 / slot 4 — ✅ applied
**Before:** Jeremy Pruitt / Derek Dooley / Butch Jones / Robert Neyland ✅
**After:** Phillip Fulmer / Josh Heupel / Doug Dickey / Robert Neyland ✅ (stem lightly reworded)
**Why:** Pruitt, Dooley and Jones all had losing or near-.500 tenures, so the answer was obvious. Fulmer (.745), Heupel and Dickey are real contenders. Neyland (.829) is still the clear leader.

### trivia_questions.dc7aeb47 — 2026-10-30 / slot 5 — ✅ applied
**Before:** "Ray Mears' Tennessee teams of the 1960s-70s combined an eye-catching all-orange uniform with which style of play…?" run-and-gun no-defense / full-court press exclusively / patient possession offense + man-to-man ✅ / pure zone with no man-to-man
**After:** "Tennessee's 1939 team went 10-0 in the regular season. What was its combined regular-season score against opponents?" 212-0 ✅ / 212-7 / 198-13 / 245-21 (category → Vol Football History)
**Why:** Absolute words ("no-defense", "exclusively", "pure") gave away the wrong answers, and I couldn't verify the claim about Mears' style. Ray Mears was also already used on 10-19. The 1939 Vols were the last major team to go unscored-upon in the regular season (212-0).

## 2026-10-28 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-10-28 → 2026-10-31 (4 polls, 20 trivia rows checked).
- 10-28 through 10-30 were already cleaned in earlier runs (#233, #234, #242), and a re-check found nothing new.
- 10-31 had 3 issues: an off-topic poll and two basketball questions that duplicated recent days. All fixed. No user responses existed on any edited row.
- Heads-up for the 11-05 run: the 11-08 poll ("What single thing has Tony Vitello done best for Tennessee baseball?") treats Vitello as current, but he left for the SF Giants in Oct. 2025. It also isn't football. It's outside this window, so it's flagged here for that run.

### daily_polls.41943e5c — 2026-10-31 — ✅ applied
**Before:** "What is the best Lady Vols basketball game you personally witnessed?" A national championship / A rivalry game / A tournament upset / A senior night
**After:** "It's the Vols' open date, with Kentucky up next on Nov. 7. What grade do you give the 2026 season so far?" A, right where we want to be / B, good with room to grow / C, up and down / D or F, below expectations
**Why:** Polls must be about current TN football. Oct. 31 is the open date, and the new poll doesn't depend on any unconfirmed result.

### trivia_questions.ac519ac5 — 2026-10-31 / slot 2 — ✅ applied
**Before:** "Which Tennessee guard, a heralded 2021 recruit, quickly became a starter and key scorer as a freshman?" Jordan Bone / Zakai Zeigler / Santiago Vescovi / Kennedy Chandler ✅
**After:** "In October 2025, Tony Vitello left Tennessee baseball to become manager of which MLB team?" Atlanta Braves / San Francisco Giants ✅ / Kansas City Royals / Colorado Rockies (category → Vol Baseball History)
**Why:** Kennedy Chandler was the answer on 10-21 (2022 SEC Tournament MVP). Vitello's move to the Giants is verified (announced Oct. 2025).

### trivia_questions.929efc80 — 2026-10-31 / slot 4 — ✅ applied
**Before:** "Which Tennessee player's draft stock rose dramatically after a standout 2023-24 NCAA Tournament and season performance, boosting him into lottery consideration?" Dalton Knecht ✅ / Uros Plavsic / John Fulkerson / Jordan Bone
**After:** "Santiago Vescovi, a two-time first-team All-SEC guard for the Vols (2019-24), plays for which national team?" Argentina / Spain / Uruguay ✅ / Brazil
**Why:** Knecht was asked on 10-20, and "lottery consideration" is vague. Vescovi is from Montevideo and has played for Uruguay's national team since 2021.

10-31 slots 1 (1998 title), 3 (Pruitt hired Dec. 2017) and 5 (Dooley dismissed after 2012) were verified and left as is.

## 2026-10-29 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-10-29 → 2026-11-01 (4 polls, 20 trivia rows checked).
- 10-29 through 10-31 were already cleaned in earlier runs (#234, #242, #252), and a re-check found nothing new.
- 11-01 had 5 issues: an off-topic poll, slots 2/3/5 with giveaway or junk options, and slot 4 with an unverifiable claim. All fixed. No user responses existed on any edited row.

### daily_polls.07d192df — 2026-11-01 — ✅ applied
**Before:** "Who is the best Vol basketball coach since 2000?" Bruce Pearl / Rick Barnes / Both equally / Neither
**After:** "Kentucky week is almost here. What's your prediction for the Vols vs. the Wildcats at Neyland on Nov. 7?" Vols by 21 or more / Vols by 8 to 20 / Vols by 7 or fewer / Kentucky pulls the upset
**Why:** Polls must be about current TN football and tied to the next game (Kentucky, Nov. 7). The old poll also had "Both equally"/"Neither" non-answers.

### trivia_questions.12771693 — 2026-11-01 / slot 2 — ✅ applied
**Before:** "Ray Mears remains the program's second-winningest coach, behind only Rick Barnes' more recent total. How many career wins did Mears record at Tennessee?" 105 / 278 ✅ / 400 / 50
**After:** "Ray Mears coached Tennessee basketball from 1962 to 1977. How many games did his teams win?" 218 / 248 / 278 ✅ / 308
**Why:** 50 and 105 are impossible for a 15-year tenure, and 400 matches his overall career total rather than his Tennessee total. The win-ranking claim depends on Barnes' current total, so I dropped it. Mears went 278-112 at Tennessee.

### trivia_questions.afaaf159 — 2026-11-01 / slot 3 — ✅ applied
**Before:** "Which Tennessee coach's staff developed both Heath Shuler and, later, Peyton Manning into elite pro-style quarterbacks?" Doug Dickey's staff / Johnny Majors' staff / Phillip Fulmer's staff, first as offensive coordinator, then head coach ✅ / Bill Battle's staff
**After:** "Which Tennessee assistant coached both Heath Shuler and Peyton Manning as the Vols' quarterbacks coach and offensive coordinator, and later coached Eli Manning at Ole Miss?" Randy Sanders / David Cutcliffe ✅ / Walt Harris / Trooper Taylor
**Why:** The answer was the only long, qualified option, which gave it away, and Dickey and Battle were decades too early. Cutcliffe was QB coach from 1990 and OC from 1993, coaching both Shuler and Manning.

### trivia_questions.86e232c8 — 2026-11-01 / slot 4 — ✅ applied (stem only)
**Before:** "…won gold in the 4x400m relay at the 2024 Paris Olympics, setting an Olympic record and earning the program's first track gold since 2016?"
**After:** "Which former Tennessee sprinter ran the leadoff leg for Team USA's gold-medal, Olympic-record 4x400m relay at the 2024 Paris Olympics?" (options unchanged; Christopher Bailey ✅)
**Why:** I couldn't verify "first track gold since 2016". Bailey's leadoff leg and the 2:54.43 Olympic record are confirmed by UT Athletics.

### trivia_questions.d0c0b5d6 — 2026-11-01 / slot 5 — ✅ applied
**Before:** "…John Chavis, went on to serve as defensive coordinator at which two other SEC programs later in his career?" LSU and Texas A&M ✅ / [meta-commentary about Kevin Steele] / This has never happened in program history / Only offensive assistants from that era went on to notable jobs
**After:** "John Chavis, Tennessee's defensive coordinator on the 1998 title team, ran LSU's defense from 2009 to 2014. Which SEC school hired him as defensive coordinator next, in 2015?" Texas A&M ✅ / Auburn / Ole Miss / Arkansas
**Why:** Three distractors were non-answers or editorial notes. "Two other SEC programs" was also wrong: Chavis later coordinated Arkansas's defense too (2018-19), so Arkansas now works as a trap answer.

11-01 slot 1 (Mississippi State, Davis Wade Stadium) was verified and left as is.

## 2026-10-30 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-10-30 → 2026-11-02 (4 polls, 20 trivia rows checked).
- 10-30 through 11-01 were already cleaned in earlier runs (#242, #252, #253), and a re-check found nothing new.
- 11-02 had 4 issues: a poll with two factual errors, a broken True/False, a Buzz Peterson question with joke distractors, and a Hamilton question that gave away the 11-04 answer. All fixed. No user responses existed on any edited row.
- Flag for the 11-12 run: 11-15 slot 5 says Tee Martin was Tennessee's "interim head coach in 2020". That looks wrong: Kevin Steele was the interim (acting) head coach after Pruitt's Jan. 18, 2021 firing. Fix it on that run.

### daily_polls.7bef774d — 2026-11-02 — ✅ applied
**Before:** "What is the greatest season in Tennessee football history?" 1998 undefeated / 1995 SEC Champions / 2001 SEC Champions / 2022 CFP run
**After:** "Kentucky comes to Neyland this Saturday. What matters most for the Vols in that game?" Winning the turnover battle / Establishing the run early / Pressuring the Kentucky quarterback / A fast start in the first quarter
**Why:** Polls must be about the current season and the next game (Kentucky, Nov. 7). Two options were also factually wrong: Tennessee did not win the SEC in 1995 (Florida did) or 2001 (lost the title game to LSU).

### trivia_questions.d1d98631 — 2026-11-02 / slot 3 — ✅ applied
**Before:** "Buzz Peterson's Tennessee tenure ended in 2005 after which general outcome?" An undefeated season / A national championship / A losing overall record leading to his dismissal ✅ / He retired voluntarily after a title
**After:** "Buzz Peterson left which school for Tennessee in 2001, after one season there capped by an NIT title?" Appalachian State / Tulsa ✅ / Coastal Carolina / UNC Wilmington
**Why:** Three options were jokes, and the "answer" was wrong: Peterson went 61-59 at Tennessee, a winning record, though he was fired. Tulsa won the 2001 NIT in his only season. Appalachian State (his earlier job) works as a trap answer.

### trivia_questions.0172dd6d — 2026-11-02 / slot 4 — ✅ applied
**Before:** "Mike Hamilton's tenure as Athletic Director ran from 2003 until he resigned amid controversy in what year?" 2011 ✅ / 2015 / 2020 / 1995
**After:** "Who was Tennessee's starting quarterback in the 1999 Fiesta Bowl win over Florida State that clinched the 1998 national title?" Peyton Manning / Tee Martin ✅ / Casey Clausen / Erik Ainge (category → Vol Football History)
**Why:** 1995 predates the 2003 start the stem gives. The 11-04 slot 4 answer is Mike Hamilton, so this would have given it away two days early.

### trivia_questions.7a4909a1 — 2026-11-02 / slot 5 — ✅ applied
**Before:** "Christian Moore's 2024 season … ranks among the best single-season batting performances in modern Tennessee program history. True or false?" True ✅ / The record has remained unchanged since the 1960s / No batting averages are tracked in college baseball / Not applicable
**After:** "Tennessee won its first baseball national championship in 2024 by beating which team in the College World Series finals?" Florida State / North Carolina / Kentucky / Texas A&M ✅
**Why:** A broken True/False with three non-answers and a vague claim. Christian Moore is also asked about on 11-08. Tennessee beat Texas A&M in the 2024 CWS finals.

11-02 slots 1 (Dale Ellis, three-point shooting) and 2 (Knoxville) were verified and left as is.

## 2026-10-31 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-10-31 → 2026-11-03 (4 polls, 20 trivia rows checked).
- 10-31 through 11-02 were already cleaned in earlier runs (#252–#254), and a re-check found nothing new.
- 11-03 had 4 issues: an off-topic poll, a factually wrong award claim (slot 3), a junk-option repeat of slot 2's Chris Lofton (slot 4), and non-answer distractors (slot 5). All fixed. No user responses existed on any edited row.

### daily_polls.7b82921e — 2026-11-03 — ✅ applied
**Before:** "What is the most heartbreaking loss in Tennessee baseball history?" 2022 Super Regional upset by Notre Dame / 2021 CWS opening-round exit / 2023 CWS loss to LSU / 2019 Knoxville Super Regional loss to Auburn
**After:** "Kentucky visits Neyland on Saturday. How many points do the Vols put up?" 20 or fewer / 21 to 34 / 35 to 48 / 49 or more
**Why:** Polls must be about current TN football and the next game (Kentucky, Nov. 7).

### trivia_questions.a8e03639 — 2026-11-03 / slot 3 — ✅ applied
**Before:** "Which Tennessee defensive tackle won both the Outland Trophy and the Lombardi Award for the 2000 season?" Trey Smith / Albert Haynesworth / Da'Quan Jones / John Henderson ✅
**After:** "Saturday's opponent Kentucky snapped a long losing streak to Tennessee with a 10-7 win in 2011. How many straight games had the Vols won in the series before that?" 17 / 21 / 26 ✅ / 31
**Why:** Henderson won the 2000 Outland but not the Lombardi (he was only a 2001 Lombardi semifinalist). His Outland was also asked on 10-21, and Haynesworth on 11-10. The new question ties to the Kentucky game; the 26-game streak ended 10-7 on Nov. 26, 2011.

### trivia_questions.a7a22bd7 — 2026-11-03 / slot 4 — ✅ applied
**Before:** "Chris Lofton's 431 career three-pointers made rank him among which group at the time of his 2008 graduation?" A minor role player with few makes / Bottom of the SEC / The SEC's all-time leader in made three-pointers ✅ / He never attempted a three-pointer
**After:** "Former Lady Vol guard Kara Lawson became head coach of which ACC women's basketball program in 2020?" Virginia / Notre Dame / North Carolina / Duke ✅ (category → Lady Vols History)
**Why:** All three distractors were jokes, and slot 2 on the same day already says Lofton is the SEC's all-time three-point leader. Duke hired Lawson on July 11, 2020.

### trivia_questions.f3159a35 — 2026-11-03 / slot 5 — ✅ applied
**Before:** "…led on the mound by which pitcher — who then transferred away and was drafted 2nd overall in 2024…?" No game was played / Not applicable / Chase Burns, who transferred to Wake Forest… ✅ / A position player pitched that game
**After:** "Which pitcher helped Tennessee reach the 2023 College World Series, then transferred to Wake Forest and was drafted No. 2 overall by the Cincinnati Reds in 2024?" Chase Dollander / Drew Beam / Chase Burns ✅ / Ben Joyce
**Why:** The distractors were non-answers, and the answer option repeated the stem. Burns went No. 2 to the Reds out of Wake Forest in 2024. "Led on the mound" was softened to "helped… reach."

11-03 slots 1 ("three-peat") and 2 (Lofton overcame cancer) were verified and left as is.

## 2026-11-01 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-11-01 → 2026-11-04 (4 polls, 20 trivia rows checked).
- 11-01 through 11-03 were already cleaned in earlier runs (#253–#255), and a re-check found nothing new.
- 11-04 had 4 issues: an off-topic poll, a factually wrong bowl-record question (slot 5), non-answer distractors (slot 3), and giveaway options (slot 2). All fixed. No user responses existed on any edited row.

### daily_polls.05144910 — 2026-11-04 — ✅ applied
**Before:** "Who is the most clutch player in Tennessee basketball history?" Chris Lofton / Allan Houston / Grant Williams / Zakai Zeigler
**After:** "Kentucky comes to Neyland on Saturday. Which part of game day are you most looking forward to?" The Vol Walk / Running Through the T / Singing Rocky Top after a score / The Pride of the Southland's pregame show
**Why:** Polls must be about current TN football and the next game. This is a game-week poll that doesn't repeat the prediction polls on 11-01 to 11-03.

### trivia_questions.d0b6d533 — 2026-11-04 / slot 2 — ✅ applied
**Before:** "Kim Caldwell previously coached at which mid-major program before being hired at Tennessee?" UConn / Stanford / Duke / Marshall University ✅
**After:** "Kim Caldwell became Lady Vols head coach in 2024 after one season leading which program to a Sun Belt title and the NCAA Tournament?" Glenville State / Marshall ✅ / Ohio / Toledo
**Why:** "Mid-major" ruled out the three power programs, so the answer was a giveaway. Glenville State (her seven-season D-II stop before Marshall) works as a fair trap answer.

### trivia_questions.56748815 — 2026-11-04 / slot 3 — ✅ applied
**Before:** "Which two SEC programs are most commonly cited as the conference's gymnastics powers?" LSU and Alabama ✅ / Vanderbilt and Missouri / No SEC school sponsors gymnastics / Not applicable
**After:** "Saturday's opponent Kentucky renamed its football stadium in 2017. What is it called now?" Commonwealth Stadium / Kroger Field ✅ / Stoll Field / Rupp Arena
**Why:** Two options were non-answers, and "most commonly cited" is subjective (Florida, Georgia, Auburn and others have strong cases). Commonwealth Stadium became Kroger Field on May 1, 2017.

### trivia_questions.bbbcdbeb — 2026-11-04 / slot 5 — ✅ applied
**Before:** "Which Tennessee running back set a since-broken bowl rushing record in the 1991 Sugar Bowl?" Travis Henry / Chuck Webb ✅ / Jamal Lewis / Arian Foster
**After:** "From 1925 until the schools retired it in 1998, what rivalry trophy did Tennessee and Kentucky football play for?" The Golden Boot / The Old Oaken Bucket / The Beer Barrel ✅ / The Iron Skillet
**Why:** This was wrong. Webb's 250-yard record came in the 1990 Cotton Bowl (fixed on 10-19, so this was also a repeat). The new question ties to Saturday's opponent: the Beer Barrel was retired in 1998.

11-04 slots 1 (Peyton Manning, HOF) and 4 (Hamilton → Dave Hart) were verified and left as is.

## 2026-11-02 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-11-02 → 2026-11-05 (4 polls, 20 trivia rows checked).
- 11-02 through 11-04 were already cleaned in earlier runs (#254–#256), and a re-check found nothing new.
- 11-05 had 4 issues: an off-topic poll and three trivia rows (slots 3, 4 and 5) with junk or vague options. All fixed. No user responses existed on any edited row.
- Still flagged for later runs: the 11-08 poll (Vitello treated as current coach) and 11-15 slot 5 (Tee Martin "interim HC 2020" is wrong).

### daily_polls.239364c3 — 2026-11-05 — ✅ applied
**Before:** "Who is the best recruiter in Tennessee football history?" Phillip Fulmer / David Cutcliffe / Josh Heupel / Jeremy Pruitt
**After:** "Kentucky at Neyland is two days away. How are you catching Saturday's game?" In the stands at Neyland / At a tailgate or watch party / At home on TV / Following along on my phone
**Why:** Polls must be about the current season and tied to the next game. The 11-01 to 11-04 polls already cover the prediction, keys, points and game-day traditions angles.

### trivia_questions.bcd334b2 — 2026-11-05 / slot 3 — ✅ applied
**Before:** "Which Finnish-born big man was a key frontcourt contributor for Tennessee's 2022-23 Sweet 16 team?" John Fulkerson only / Uros Plavsic only / Olivier Nkamhoua ✅ / Julian Phillips only
**After:** "Which Helsinki-born forward started all 36 games for Tennessee's 2022-23 Sweet 16 team?" Uros Plavsic / Olivier Nkamhoua ✅ / Tobe Awaka / Jonas Aidoo
**Why:** The "only" suffix on every wrong answer gave the answer away. Nkamhoua (born in Helsinki) was the only Vol to start all 36 games in 2022-23.

### trivia_questions.45de983d — 2026-11-05 / slot 4 — ✅ applied
**Before:** "Have multiple SEC football programs undertaken major stadium renovations in recent years…?" Only Tennessee has ever renovated a stadium / Not applicable / No SEC school has ever renovated a stadium / Yes, various SEC schools… ✅
**After:** "The Vols visit Texas A&M on Nov. 14. What nickname do Aggie fans go by, standing throughout the game as the team's "extra player"?" The Corps / The 12th Man ✅ / The Swarm / The Wrecking Crew
**Why:** This was a yes/no question with non-answer distractors. The new question ties to the next road trip (at Texas A&M, Nov. 14).

### trivia_questions.3899ab1a — 2026-11-05 / slot 5 — ✅ applied
**Before:** "Which Tennessee quarterback started a lengthy stretch of consecutive games in the mid-to-late 2000s despite pressure from injuries and competition?" Erik Ainge ✅ / Rick Clausen / Jonathan Crompton / Nico Iamaleava
**After:** "With Hendon Hooker out injured, which quarterback earned MVP honors in Tennessee's 31-14 Orange Bowl win over Clemson to close the 2022 season?" Gaston Moore / Nico Iamaleava / Joe Milton III ✅ / Tayven Jackson
**Why:** "Lengthy stretch" was vague and couldn't be verified (Crompton also fit the era), and Iamaleava was decades out of place. Milton (19-of-28, 251 yards, 3 TDs) was Orange Bowl MVP. 11-24 asks the Orange Bowl opponent, a different fact.

11-05 slots 1 (Sugar Bowl among those listed) and 2 (Texas A&M and Missouri, 2012) were verified and left as is.

## 2026-11-03 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window 2026-11-03 → 2026-11-06. 11-03, 11-04 and 11-05 were already fixed by earlier runs and are clean.
- 11-06: 1 poll + 3 trivia rewrites. 0 user responses at the time of the edit. Slot 1 (Allan Houston, Knicks two-time All-Star) and slot 3 (Charlie Ward won the 1993 Heisman with Shuler runner-up) were verified and left as is.
- Flagged for later runs: 11-12 slot 4 and 11-13 slot 3 repeat the Shuler Heisman runner-up fact. The 11-08 Vitello poll and the 11-15 Tee Martin "interim 2020" claim are still pending.

### daily_polls.0cad2bc9 — 2026-11-06 — ✅ applied
**Before:** "Who is the best WNBA player from Tennessee Lady Vols?" (Holdsclaw / Parker / Catchings / DeShields)
**After:** "Kentucky at Neyland is tomorrow. Where will the Vols' player of the game come from?" — The quarterback / The running backs / The receivers and tight ends / The defense or special teams
**Why:** Polls must be about TN football and the upcoming game (Kentucky, Nov 7). It's result-neutral and avoids the prediction, keys, points, traditions and viewing angles used on 11-01 to 11-05.

### trivia_questions.f8c59b9a — 2026-11-06 / slot 2 — ✅ applied
**Before:** "Which Lady Vols standouts have won Olympic gold…" with filler options ("Neither has ever won…") that gave the answer away.
**After:** "Chamique Holdsclaw was the No. 1 overall pick in the 1999 WNBA Draft. Which team took her?" — Detroit Shock / Los Angeles Sparks / **Washington Mystics (C)** / Indiana Fever
**Why:** The old options were giveaways, and the Catchings Olympic-gold count is already on 11-20 and 12-03. Verified the 1999 No. 1 pick went to the Mystics.

### trivia_questions.f716a0cf — 2026-11-06 / slot 4 — ✅ applied
**Before:** "Which Tennessee Olympic sport has historically been one of the program's strongest pipelines…" with options like "Not applicable".
**After:** "Which former Vol sprinter won the 100-meter Olympic gold medal at the 2004 Athens Games?" — Christian Coleman / **Justin Gatlin (B)** / Tyson Gay / Maurice Greene
**Why:** The old question had junk options. Gatlin (Vol 2000–01) won the 2004 100m in 9.85. Coleman is the Vol trap answer.

### trivia_questions.dccd9fdc — 2026-11-06 / slot 5 — ✅ applied
**Before:** Vague "True or false?" about SEC NIL commentary, with options like "This topic doesn't exist".
**After:** (Vol Football History, hard) "Kentucky's 34-7 win at Neyland in 2020 was the Wildcats' first victory in Knoxville since what year?" — 1976 / 1991 / 1999 / **1984 (D)**
**Why:** The old question had no real answer. The new one is relevant on the eve of Kentucky week. Verified via the AP/WKYT 10-17-2020 coverage.

## 2026-11-04 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window 2026-11-04 → 2026-11-07. Earlier runs already fixed 11-04, 11-05 and 11-06. The 11-03 preview reworded 11-04 slot 4, the Dave Hart/Mike Hamilton stem, because Joan Cronan was interim AD in between.
- 11-07 (Kentucky game day): 1 poll and 3 trivia items fixed. There were 0 user responses at the time of the edits. Slot 4 (Lindsey Nelson Stadium) and slot 5 (SEC Championship Game record 2-3: won 1997 and 1998, lost 2001, 2004 and 2007) were verified and left as they were.

### daily_polls.2cf18a26 — 2026-11-07 — ✅ applied
**Before:** "Who is the best Vol football player of the last 10 years?" (Eric Berry / Alvin Kamara / Hendon Hooker / Trey Smith). Berry played 2007–09, so he falls outside "last 10 years", and the poll had no tie to the game.
**After:** "It's game day: Kentucky at Neyland. How confident are you heading into kickoff?" Options: Very confident, the Vols handle business / Fairly confident, but it won't be pretty / Nervous, Kentucky always plays the Vols tough / Expecting a four-quarter dogfight
**Why:** Polls must be about TN football and the game at hand. The new poll is result-neutral and doesn't repeat the 11-01 to 11-06 angles.

### trivia_questions.02fe5d2a — 2026-11-07 / slot 1 — ✅ applied
**Before:** "Tennessee's rivalry game against Georgia is significant largely because of their shared membership in which division?" (A bowl exhibition / A key SEC East rivalry game / A nonconference game / A basketball rivalry only). The SEC dropped divisions in 2024, and the distractors eliminated themselves.
**After:** "Josh Heupel was hired as Tennessee's head coach in January 2021 after three seasons as head coach at which school?" Options: Oklahoma / Missouri / **UCF (C)** / Memphis. Oklahoma (where he played) and Missouri (where he was OC) are the trap answers.

### trivia_questions.5ecc47ab — 2026-11-07 / slot 2 — ✅ applied
**Before:** "Tennessee's combined all-time Olympic medal count … approximately how many?" (Over 1,000 / Fewer than 5 / Around 68 medals / Zero). The figure couldn't be verified and the distractors were joke answers.
**After:** (Vol Football History) "Peyton Manning finished runner-up for the 1997 Heisman Trophy. Which Michigan star won it?" Options: Ryan Leaf / **Charles Woodson (B)** / Randy Moss / Ricky Williams. No duplicate within ±30 days.

### trivia_questions.f83519d9 — 2026-11-07 / slot 3 — ✅ applied (options only)
**Before options:** Purdue / Sweet 16 only / First round / National Championship. Three of the four options weren't teams.
**After options:** **Purdue (A)** / Creighton / UConn / Alabama. The stem was accurate: Purdue beat Tennessee 72-66 in the 2024 Elite Eight and lost the title game to UConn.

## 2026-11-05 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window 2026-11-05 → 2026-11-08. 11-05, 11-06 and 11-07 were already fixed by earlier runs and are clean. The 11-04 preview tightened the 11-05 slot 1 stem to "Of these four bowl games…".
- 11-08 (the day after Kentucky): fixed 1 poll and 2 trivia items. There were 0 responses at the time of the edit. Slot 2 (David Price won the 2018 World Series with Boston), slot 3 (Fulmer coached the 2007 SEC Championship Game) and slot 4 (Dollander went in 2023, Moore in 2024) were verified and left as is.

### daily_polls.9f614c7b — 2026-11-08 — ✅ applied
**Before:** "What single thing has Tony Vitello done best for Tennessee baseball?" (Recruiting / Developing pitchers / Building culture / Winning in the postseason). Vitello left for the SF Giants in Oct 2025, and the poll isn't about football.
**After:** "The Vols hosted Kentucky yesterday, with Texas A&M up next. Which unit stood out most to you against the Wildcats?" Options: The quarterback play / The running game / The pass rush and front seven / The secondary and takeaways.
**Why:** It ties to the previous game, it's football, and it reads fine whatever the result was.

### trivia_questions.ea4db676 — 2026-11-08 / slot 1 — ✅ applied (options only)
**Before options:** A severe hearing impairment / None, she had no challenges / A visual impairment / A wheelchair-bound condition. These were self-eliminating and insensitive distractors.
**After options:** **A severe hearing impairment (A)** / Type 1 diabetes / Asthma / Dyslexia.

### trivia_questions.2d08263b — 2026-11-08 / slot 5 — ✅ applied
**Before:** "Announced in 2025, … renovation reported at approximately how much?" ("Facilities are always paid in cash…" / $1 million / $500,000 / $109 million). I couldn't verify the $109M figure or the 2025 announcement, and the other options were junk.
**After:** (Vol Baseball History) "In October 2024, UT trustees raised the budget for the Lindsey Nelson Stadium renovation to roughly how much?" Options: $56.8 million / $75 million / **$105 million (C)** / $150 million.
**Why:** The figure is verified. The budget went from $56.8M originally to $95.8M in June 2023, then to $105.1M in Oct 2024 (WVLT and the UT News 10-25-2024 coverage).

- Still flagged for a later run: 11-12 slot 4 and 11-13 slot 3 repeat the Shuler Heisman runner-up fact. 11-15 slot 5 wrongly calls Tee Martin the 2020 interim HC.

## 2026-11-06 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window 2026-11-06 → 2026-11-09. 11-06, 11-07 and 11-08 were already fixed by earlier runs and are clean. The 11-05 preview found nothing to change for 11-06.
- 11-09 (Monday of Texas A&M week): fixed 1 poll and 3 trivia items. There were 0 responses at the time of the edit. Slot 2 (Grant Williams, SEC POY in 2018 and 2019) and slot 3 (Fulmer as AD, 2017–21) were verified and left unchanged.

### daily_polls.ebd3445b — 2026-11-09 — ✅ applied
**Before:** "What is the best Vol basketball road win in history?" (At Kentucky / At Auburn / At Florida / At Kansas). It was not about football and not tied to a game.
**After:** "Kentucky is behind us and the Vols head to Texas A&M on Saturday. What worries you most about the trip to Kyle Field?" Options: The 12th Man crowd noise / A&M's defensive front / Slowing down their offense / Avoiding turnovers on the road.
**Why:** The new poll is football, it is about the next game, and it is result-neutral.

### trivia_questions.1f1ca3ec — 2026-11-09 / slot 1 — ✅ applied
**Before:** "Which Tennessee wide receiver was a standout in the mid-1990s and later played in the NFL for Cincinnati?" (Carl Pickens / Jerry Rice / Randy Moss / Terrell Owens). Pickens played at UT from 1989 to 1991, so "mid-1990s" was wrong. The distractors were non-Vols, which gave the answer away.
**After:** "Which former Vol receiver went on to become a star for the Cincinnati Bengals in the 1990s?" Options: **Carl Pickens (A)** / Alvin Harper / Joey Kent / Peerless Price. All four distractors are former Vol receivers who played in the NFL.

### trivia_questions.2389a7b7 — 2026-11-09 / slot 4 — ✅ applied
**Before:** "…Has the rivalry become more competitive during his tenure?" (The series was suspended / Kentucky refuses to schedule Tennessee / Tennessee has never beaten Kentucky under Barnes / Yes). Every distractor was a self-eliminating non-answer.
**After:** "After Kentucky swept the 2024-25 regular-season series, Tennessee beat the Wildcats 78-65 in which round of the 2025 NCAA Tournament?" Options: Round of 32 / **Sweet 16 (B)** / Elite Eight / Final Four. Verified: the game was played March 28, 2025, at Lucas Oil Stadium.

### trivia_questions.5428881f — 2026-11-09 / slot 5 — ✅ applied
**Before:** "David Price's MLB career win total is commonly cited at approximately how many wins?" (Exactly 50 / Over 150 / Under 20 / Over 400). The distractors were junk, and Price already appears in 11-08 slot 2.
**After:** (Vol Football History) "With Texas A&M up next: in 2016, No. 9 Tennessee lost at No. 8 Texas A&M in double overtime at Kyle Field. What was the final score?" Options: 38-35 / **45-38 (B)** / 41-38 / 48-45. Verified against the AP, SI and 12thman.com box score for Oct. 8, 2016.

- Still flagged for later runs: 11-12 slot 4 and 11-13 slot 3 repeat the Shuler Heisman runner-up fact. 11-15 slot 5 wrongly says Tee Martin was interim head coach in 2020.

## 2026-11-07 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window 2026-11-07 → 2026-11-10. 11-07, 11-08 and 11-09 were already fixed by earlier runs and are clean. The 11-06 preview of 11-07 found nothing.
- 11-10 (Tuesday of Texas A&M week): fixed 1 poll and 4 trivia items. There were 0 user responses at the time of the edit. Slot 2 (fans tore down the goalposts after beating Alabama in 2022) was verified and left unchanged.

### daily_polls.0aee1f51 — 2026-11-10 — ✅ applied
**Before:** "Who is the best running back in Tennessee football history?" (Jamal Lewis / Travis Henry / Alvin Kamara / Charlie Garner). It wasn't tied to any game.
**After:** "Texas A&M week: which matchup at Kyle Field are you watching most closely on Saturday?" Options: Vols' passing game vs. the A&M secondary / Vols' run game vs. the A&M front seven / Vols' pass rush vs. the A&M offensive line / Special teams and field position.
**Why:** The new poll is about the next game and doesn't depend on the result. It takes a different angle from 11-09's "what worries you most" poll.

### trivia_questions.966b2d88 — 2026-11-10 / slot 1 — ✅ applied
**Before:** "Which university administers both the 'Vols' and the 'Lady Vols' … branding?" (Vanderbilt / UT Knoxville / Auburn / Georgia). The answer was obvious, and the question overlaps with the 11-21 slot 1 branding item.
**After:** (SEC Knowledge) "The Vols visit Texas A&M on Saturday. What is the name of the Aggies' live collie mascot?" Options: Bevo / Uga / **Reveille (C)** / Smokey.

### trivia_questions.b20d3ce8 — 2026-11-10 / slot 3 — ✅ applied
**Before:** "Rick Barnes' Tennessee teams have been known for which defining program hallmark?" The distractors were joke answers ("defense-optional," "no defensive identity").
**After:** "Which Vol was named SEC Defensive Player of the Year for the 2023-24 season?" Options: Jonas Aidoo / Josiah-Jordan James / Santiago Vescovi / **Zakai Zeigler (D)**. Verified against UTSports for March 2024.

### trivia_questions.7298e631 — 2026-11-10 / slot 4 — ✅ applied
**Before:** "Which controversial Tennessee defensive tackle played alongside John Henderson …?" (Haynesworth / Reggie White / Da'Quan Jones / Trey Smith). Two of the distractors never played DT at Tennessee in that era, and "controversial" was editorializing.
**After:** "Which Tennessee defensive tackle teamed with John Henderson on the Vols' line in the early 2000s before becoming a first-round NFL pick?" Options: **Albert Haynesworth (A)** / Dan Williams / Malik Jackson / Shy Tuttle. All four are Vol DTs from different eras.

### trivia_questions.ca70614e — 2026-11-10 / slot 5 — ✅ applied
**Before:** "Is it common in college basketball generally for a player to leave for the NBA G League and later return…?" ("Not applicable to basketball" / "Every Tennessee player does this" …). The question had no real answer and the options were junk.
**After:** (Vol Football History) "Which quarterback, a third-stringer for much of the season, led Tennessee to a 38-7 rout of Texas A&M in the Jan. 1, 2005 Cotton Bowl?" Options: Erik Ainge / Brent Schaeffer / Casey Clausen / **Rick Clausen (D)**. Verified against the 12thman.com box score and AP recap. It also fits A&M week.

- Still flagged for later runs: 11-12 slot 4 and 11-13 slot 3 repeat the Shuler Heisman runner-up fact. 11-15 slot 5 wrongly says Tee Martin was interim HC in 2020. 11-21 slot 1 overlaps with the Vols/Lady Vols branding question.

## 2026-11-08 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window 2026-11-08 → 2026-11-11. Earlier runs already fixed 11-08, 11-09 and 11-10, and those days are clean. The 11-07 preview of 11-08 found nothing.
- 11-11 (Wednesday of Texas A&M week): 1 poll fixed, 3 trivia items fixed. There were 0 user responses at the time of the edit. Slot 1 (Running Through the T) and slot 3 (2001 SEC Championship Game loss to LSU) were verified and left as is.

### daily_polls.20892c97 — 2026-11-11 — ✅ applied
**Before:** "What Vol football tradition should never change no matter what?" (Running through the T / checkerboard endzone / Rocky Top / Vol Walk). It repeated the 11-04 game-day traditions poll and wasn't tied to a game.
**After:** "The Vols play at Texas A&M on Saturday. What would a win at Kyle Field mean most for this team?" Options: A signature road win for the résumé / Momentum heading into LSU and Vanderbilt / A stronger bowl or playoff position / Bragging rights in a newer SEC matchup.
**Why:** It's about the next game, it doesn't depend on the result, and it doesn't overlap the 11-09 or 11-10 A&M polls.

### trivia_questions.520c9a99 — 2026-11-11 / slot 2 — ✅ applied (options only)
**Before options:** Score 50 points in a game / Coach a men's team / **Dunk in an NCAA Tournament game** / Play in the NBA. Two of the distractors were throwaways.
**After options:** Score 40 points in a Final Four game / Record a triple-double in a title game / **Dunk in an NCAA Tournament game (C)** / Block 10 shots in a tournament game.

### trivia_questions.76d161d3 — 2026-11-11 / slot 4 — ✅ applied (options only)
**Before options:** 50th / 100th / **2nd** / 1st overall. The 50th and 100th options weren't plausible for a top pick.
**After options:** 1st / **2nd (B)** / 5th / 9th overall. Senzel went No. 2 to the Reds in 2016.

### trivia_questions.796dae81 — 2026-11-11 / slot 5 — ✅ applied
**Before:** "…record-setting streak of consecutive NCAA Tournament appearances under Pat Summitt. How many consecutive years…?" (3 / **31** / 50 / 10). The distractors were implausible, and "50" is more than the number of tournaments ever held.
**After:** "The Lady Vols appeared in every NCAA Tournament during Pat Summitt's tenure, from the first one in 1982 through her final season. How many straight tournaments was that?" Options: 24 / 27 / **31 (C)** / 35. The 1982–2012 tournaments make 31.

- Still flagged for later runs: 11-12 slot 4 and 11-13 slot 3 repeat the Shuler Heisman runner-up fact. 11-15 slot 5 wrongly calls Tee Martin the 2020 interim head coach. 11-21 slot 1 is the branding question.

## 2026-11-09 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-11-09 → 2026-11-12. Earlier runs had already fixed 11-09, 11-10 and 11-11, so those days are clean. The 11-08 preview of 11-09 found nothing.
- 11-12 (Thursday of Texas A&M week): fixed 1 poll and 4 trivia items. There were 0 user responses at the time of the edit. Slot 5 (SEC Network launched in 2014) was verified and left unchanged.

### daily_polls.9524af2a — 2026-11-12 — ✅ applied
**Before:** "What is the best Vol basketball road atmosphere?" (Rupp / O'Connell / Auburn Arena / Bridgestone). It isn't about football.
**After:** "Texas A&M week: what's your call for Saturday at Kyle Field?" Options: Vols win comfortably / Vols win a close one / A&M wins a close one / A&M wins comfortably.
**Why:** It's the A&M prediction poll, symmetric and neutral. It doesn't repeat the 11-09 (worries), 11-10 (matchups) or 11-11 (what a win means) angles.

### trivia_questions.53dbd5b0 — 2026-11-12 / slot 1 — ✅ applied
**Before:** "Which team did Tennessee defeat … to win the 2024 College World Series?" (answer: Texas A&M). It duplicates the 11-02 2024 CWS item.
**After:** (Vol Football History) "Who is Tennessee's all-time career leader in passing yards?" Options: **Peyton Manning (A)** / Casey Clausen / Tyler Bray / Hendon Hooker. Manning has 11,201 yards and Clausen is second with 9,707.

### trivia_questions.1c90f0d3 — 2026-11-12 / slot 2 — ✅ applied (options only)
**Before options:** Carl Pickens / Marcus Nash / **Cordarrelle Patterson** / Peerless Price. The three distractors are 1990s players in an "early 2010s" question, which gives the answer away.
**After options:** Justin Hunter / Da'Rick Rogers / **Cordarrelle Patterson (C)** / Marquez North. All four are early-2010s Vol receivers.

### trivia_questions.77058106 — 2026-11-12 / slot 3 — ✅ applied
**Before:** "Pat Summitt Plaza … is located near which facility?" ("Not applicable, no such plaza exists" / "Neyland Stadium exclusively" …). The options were junk, and it duplicates the 10-22 slot 1 Summitt plaza item.
**After:** "Lady Vol Rickea Jackson was the No. 4 overall pick in the 2024 WNBA Draft. Which team selected her?" Options: **Los Angeles Sparks (A)** / Indiana Fever / Seattle Storm / Dallas Wings. Verified against the UTSports announcement of April 15, 2024.

### trivia_questions.b005d8b1 — 2026-11-12 / slot 4 — ✅ applied
**Before:** "Heath Shuler … finished as runner-up for which national award?" It duplicates the 11-06 slot 3 Shuler/Heisman item.
**After:** (SEC Knowledge) "With Tennessee visiting Kyle Field this week: which Texas A&M quarterback won the Heisman Trophy while playing for the Aggies?" Options: Ryan Tannehill / Kyler Murray / **Johnny Manziel (C)** / Kellen Mond. Murray is the trap: he began his career at A&M but won the Heisman at Oklahoma.

- Still flagged for later runs: 11-13 slot 3 also repeats the Shuler Heisman runner-up fact. 11-15 slot 5 wrongly calls Tee Martin the 2020 interim HC. 11-21 slot 1 is a branding question.

## 2026-11-10 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window 2026-11-10 → 2026-11-13. Earlier runs had already fixed 11-10, 11-11 and 11-12, so those days are clean. The 11-09 preview of 11-10 found nothing.
- 11-13 (Friday before Texas A&M): **no poll existed**, so I added one. I also fixed 4 trivia items. There were 0 responses at the time of the edit. Slot 2 (Summitt coached the 1984 Olympic gold team) was verified and left unchanged.

### daily_polls.dd90005a — 2026-11-13 — ✅ inserted (no poll existed)
**New:** "Texas A&M at Kyle Field is tomorrow. What's the single biggest key to a Vols win?" Options: Score on the opening drive / Win the turnover battle / Quiet the 12th Man early / Finish strong in the fourth quarter.
**Why:** Per David's 10-12 instruction ("always add a poll"), every day needs a poll. This one is about tomorrow's game, doesn't assume a result, and doesn't repeat the 11-09 to 11-12 polls.

### trivia_questions.28b9e288 — 2026-11-13 / slot 1 — ✅ applied
**Before:** "Which Tennessee freshman guard in the mid-2020s quickly became a focal point…?" The options were "Kennedy Chandler was a highly touted freshman starter in 2021-22", "Freshmen are ineligible under NCAA rules", and other self-eliminating answers, so the answer was given away.
**After:** "Which highly touted freshman point guard started for Tennessee in 2021-22 before leaving for the NBA Draft?" Options: Lamonte Turner / Jordan Bone / **Kennedy Chandler (C)** / Chris Lofton.

### trivia_questions.dfdc6487 — 2026-11-13 / slot 3 — ✅ applied
**Before:** "What year did Heath Shuler finish as Heisman Trophy runner-up?" This was the third Shuler/Heisman item in a week (11-06, the original 11-12 one, and this one).
**After:** (Vol Baseball History) "After Tony Vitello left for the San Francisco Giants in October 2025, which longtime assistant was named Tennessee's new head baseball coach?" Options: Frank Anderson (the interim coach) / **Josh Elander (B)** / Kevin Schnall (interviewed) / Jim Schlossnagle. Verified: Elander was named on Oct. 25, 2025.

### trivia_questions.33a19931 — 2026-11-13 / slot 4 — ✅ applied
**Before:** "Tennessee baseball's rise … is most commonly attributed … to which single factor?" The distractors were junk ("Not applicable, the program has always been elite"), and the question was an opinion, not a fact.
**After:** (Vol Football History) "Which Tennessee kicker, minutes after missing an extra point, hit a 50-yard field goal with six seconds left to beat Florida 30-28 in 2004?" Options: **James Wilhoit (A)** / Daniel Lincoln / Alex Walls / Michael Palardy. Verified against UTSports and the Florida post-game coverage of 9-18-2004.

### trivia_questions.f8fb07ed — 2026-11-13 / slot 5 — ✅ applied
**Before:** "…largest recorded single-game attendance exceeds approximately how many?" The options were Over 105,000 / Around 40,000 / 60,000 / 80,000, so the answer was obvious.
**After:** "Neyland Stadium's record single-game crowd, set in September 2004, is how many fans?" Options: 102,455 / 104,079 / 107,595 / **109,061 (D)**. The 107,595 option is the 2000 per-game average, which makes a good trap.

- This run cleared the Shuler duplicate. Still flagged for later runs: 11-15 slot 5 wrongly calls Tee Martin the 2020 interim head coach, and 11-21 slot 1 is a branding question. **New check:** future runs should confirm that every date in the window has a poll row.

## 2026-11-11 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window 2026-11-11 → 2026-11-14. 11-11, 11-12 and 11-13 were already fixed by earlier runs and are clean. The 11-10 preview of 11-11 found nothing.
- 11-14 (game day at Texas A&M): fixed 1 poll and all 5 trivia items. There were 0 responses at the time of the edit.

### daily_polls.2301b695 — 2026-11-14 — ✅ applied
**Before:** "Who is the best Lady Vol basketball recruit Tennessee has ever landed?" It wasn't about football and wasn't tied to the game.
**After:** "Game day at Kyle Field! Which quarter do you think decides Vols vs. Texas A&M?" Options: The 1st quarter: fast start sets the tone / The 2nd quarter: the pre-halftime swing / The 3rd quarter: halftime adjustments / The 4th quarter: it comes down to the wire.
**Why:** It's about today's game and is result-neutral. It doesn't repeat the 11-07 Kentucky game-day confidence poll or any of the 11-09 to 11-13 A&M angles.

### trivia_questions.7eea458b — 2026-11-14 / slot 1 — ✅ applied
**Before:** "Pat Summitt's teams reached 18 Final Fours… how many times did they win it all?" The options were Every single Final Four / Zero / **Eight** / Exactly one, which give the answer away, and the question repeats the 10-23 Summitt title-count item.
**After:** (SEC Knowledge) "The Vols play at Texas A&M today. In which Texas city is Kyle Field located?" Options: Austin / **College Station (B)** / Waco / Houston.

### trivia_questions.2e9c8824 — 2026-11-14 / slot 2 — ✅ applied (options only)
**Before options:** **Around 21,700** / Around 40,000 / Around 10,000 / Around 5,000. The wrong answers were implausible.
**After options:** Around 18,000 / **Around 21,700 (B)** / Around 25,000 / Around 30,000. The official capacity is 21,678.

### trivia_questions.650b3f6b — 2026-11-14 / slot 3 — ✅ applied
**Before:** "Rivalry Week, which includes Tennessee's games against Vanderbilt and Kentucky…" It used a non-answer option ("Not applicable, no such branding exists") and the premise is wrong, because Kentucky isn't a Rivalry Week opponent.
**After:** (Vol Football History) "Who was Tennessee's starting quarterback in the 2016 double-overtime game at Kyle Field?" Options: **Joshua Dobbs (A)** / Quinten Dormady / Jarrett Guarantano / Justin Worley. Verified: SI's recap names Dobbs, intercepted on his first throw of the second overtime.

### trivia_questions.8158bf2d — 2026-11-14 / slot 4 — ✅ applied (options only)
**Before options:** 32nd / **5th** / 15th / 1st overall.
**After options:** 3rd / **5th (B)** / 7th / 10th overall. The new picks are all plausible top-10 spots. Berry went 5th to the Chiefs.

### trivia_questions.31dddd9c — 2026-11-14 / slot 5 — ✅ applied
**Before options:** "The SEC Swimming Championships only" / World Swimming Championships / **US Olympic Team Diving Trials** / "It has never hosted a notable event". These were non-answer distractors.
**After:** "In June 2024, Tennessee's Allan Jones Aquatic Center hosted which event ahead of the Paris Olympics?" Options: U.S. Olympic Swimming Trials / NCAA Swimming & Diving Championships / **U.S. Olympic Diving Trials (C)** / World Aquatics Diving World Cup. Verified: the trials ran June 17–23, 2024 (USA Diving, WBIR).

- Still flagged for later runs: 11-15 slot 5 wrongly says Tee Martin was interim HC in 2020, and 11-15 has **no poll**. 11-21 slot 1 is the branding question, and 11-21 (LSU game day) also has no poll. Other days with no poll: 11-18, 11-25, 12-10, 12-11, 12-14.

## 2026-11-12 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-11-12 → 2026-11-15. Checked 4 polls (3 existing + 1 inserted) and 20 trivia rows.
- 11-12, 11-13 and 11-14 were already fixed in #281/#283/#284. On re-check they are clean. The one extra change was the 11-12 slot 5 options, tightened in the 2026-11-11 preview (logged below).
- 11-15 had no poll, two broken items (slots 4 and 5), one duplicate (slot 1) and weak distractors (slot 3). All fixed.
- Heads-up: the polls already scheduled for 11-16, 11-17, 11-19 and 11-20 aren't about current TN football. They will be rewritten as each date enters the window, per the 2026-10-12 instruction. 11-18 still has no poll.

### trivia_questions.4a4379a7 — 2026-11-12 / slot 5 — ✅ applied (11-11 preview)
- **Before:** A 2005, B 2020, C 2014, D 1995
- **After:** A 2012, B 2016, C 2014 ✔, D 2018
- **Why:** The fact checks out (SEC Network launched Aug 2014). But wrong years spread across 25 years made it too easy for a hard slot.

### daily_polls.e89d318f — 2026-11-15 — ✅ inserted
- **Before:** (no poll)
- **After:** "The Kyle Field trip is in the books, and LSU comes to Neyland on Saturday. What should be the Vols' top priority this week?" Options: Sharpen up the run game / Tighten up the pass defense / Clean up penalties and turnovers / Get healthy and rested
- **Why:** Every day needs a poll about current TN football. This one covers the game just played and LSU next. It doesn't assume the A&M result, and it's a different question from the 11-08 "which unit stood out" poll.

### trivia_questions.ab15777d — 2026-11-15 / slot 1 — ✅ applied
- **Before:** "Tennessee's most tenured historical coach, who won multiple SEC titles in the 1960s-70s, was who?" (O'Neill / DeVoe / Ray Mears ✔ / Houston)
- **After:** "In the mid-1970s, Bernard King and Ernie Grunfeld formed one of college basketball's most famous duos at Tennessee. What was the pair's nickname?" A The Fab Five, B The Bernie and Ernie Show ✔, C Phi Slama Jama, D Showtime
- **Why:** Ray Mears is already the answer on 11-01 and 12-09 (duplicate within ±30 days). The stem was also clumsy. Each wrong option is a real nickname of a different famous team.

### trivia_questions.bea5d658 — 2026-11-15 / slot 3 — ✅ applied (options only)
- **Before:** A Jamal Lewis and Travis Henry, B Jabari Small and Jaylen Wright ✔, C Arian Foster and Travis Henry, D Alvin Kamara and Arian Foster
- **After:** A Ty Chandler and Eric Gray, B Jabari Small and Jaylen Wright ✔, C Rajion Neal and Marlin Lane, D Alvin Kamara and Jalen Hurd
- **Why:** Some of the wrong pairs never played together (Foster and Henry; Kamara and Foster), so they were easy to rule out. Every wrong option is now a real RB duo from another Vol season (2019–20, 2013, 2015–16).

### trivia_questions.9abff02a — 2026-11-15 / slot 4 — ✅ applied (full replacement)
- **Before:** "Unlike football's Beer Barrel, does Tennessee's basketball rivalry with Vanderbilt carry a named physical trophy?" (No… ✔ / False, there is… / They don't play each other / Not applicable)
- **After (category → SEC Knowledge):** "LSU visits Neyland this coming Saturday. What is the famous nickname of LSU's home stadium, Tiger Stadium?" A Between the Hedges, B The Swamp, C Death Valley ✔, D The Plains
- **Why:** A broken True/False dressed up as four options, with "Not applicable" and non-answer options. It also mixed up the Beer Barrel, which is the Kentucky trophy, not Vanderbilt. Replaced with an LSU-week question. Basketball replacements were ruled out as duplicates: Elite Eight is used ×3, the 2008 No. 1 ranking on 10-27, Lofton on 11-03, Grant Williams on 11-09.

### trivia_questions.e4abb836 — 2026-11-15 / slot 5 — ✅ applied
- **Before:** "Before becoming interim head coach in 2020, Tee Martin held which role on Tennessee's coaching staff?" (AD / Strength coach / OC/assistant ✔ / DC)
- **After:** "Tee Martin, quarterback of Tennessee's 1998 national title team, returned to Knoxville in 2019 as assistant head coach and wide receivers coach under which head coach?" A Butch Jones, B Derek Dooley, C Josh Heupel, D Jeremy Pruitt ✔
- **Why:** Wrong premise: Tee Martin was never interim HC (Kevin Steele was acting HC in Jan 2021). Verified: Martin was hired Jan 15, 2019 as assistant HC, passing game coordinator and WRs coach under Pruitt, and left for the Ravens in Feb 2021.

## 2026-11-13 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-11-13 → 2026-11-16. Checked 4 polls and 20 trivia rows.
- 11-13, 11-14 and 11-15 were already fixed in #283/#284/#286. They are clean on re-check.
- 11-16 had 6 issues: the poll wasn't about football, two questions had a false premise, two were subjective or had non-answer options, and one had weak distractors. All fixed.
- Note: this run was delayed about 2 hours because the Supabase connector couldn't get a credential at 10:15 UTC.

### daily_polls.31a1d919 — 2026-11-16 — ✅ applied
- **Before:** "Who had the best single season in Tennessee basketball history?" (Lofton 07-08 / Grant Williams 18-19 / Allan Houston 92-93 / Knecht 23-24)
- **After:** "LSU comes to Neyland on Saturday. What's the biggest key to a Vols win over the Tigers?" Options: Establish the run game early / Get pressure on the LSU quarterback / Win the special teams battle / Feed off a loud Neyland crowd
- **Why:** The 2026-10-12 instruction says every poll must be about current TN football and tied to the last or next game. Nov 16 falls between A&M and LSU. The new poll doesn't depend on the A&M result, and it covers a different angle from the 11-15 "top priority this week" poll.

### trivia_questions.71d39362 — 2026-11-16 / slot 1 — ✅ applied (options only)
- **Before:** A Travis Kelce, B Tony Gonzalez, C Jason Witten ✔, D Rob Gronkowski
- **After:** A Luke Stocker, B Mychal Rivera, C Jason Witten ✔, D Jacob Warren
- **Why:** The stem asks for a *Tennessee* tight end, but Kelce, Gonzalez and Gronkowski never played at UT, so they eliminated themselves. All four options are now Vol tight ends. Verified that Stocker went to the Bucs, Rivera to the Raiders, and Witten to the Cowboys.

### trivia_questions.4d95d27c — 2026-11-16 / slot 2 — ✅ applied (full replacement)
- **Before (Vol Basketball History):** "Tennessee basketball's television broadcast rights... fall under which conference media agreement?" (SEC Network/ESPN ✔ / Independent regional deals only / No television coverage exists / Big Ten Network)
- **After (Lady Vols History):** "Tennessee's Lady Vols softball team plays its home games at which Knoxville stadium, opened in 2008?" A Lindsey Nelson Stadium, B Sherri Parker Lee Stadium ✔, C Regal Soccer Stadium, D Tom Black Track
- **Why:** The old question wasn't really trivia, and "No television coverage exists" was a non-answer. The new one is verified: the stadium opened Feb 5, 2008, and every distractor is a real UT venue. I tried basketball replacements first, but each one is already used: Barnes since 2015 (10-20), Houston as scoring leader (11-25), Tobias Harris (10-28).

### trivia_questions.18fc0ff7 — 2026-11-16 / slot 3 — ✅ applied (one option)
- **Before:** C Gerald Gaither
- **After:** C Lane Kiffin
- **Why:** "Gerald Gaither" was never a Tennessee football head coach, so the option made no sense. Every option is now a real Vol head coach. Majors is still correct; Fulmer took over during the 1992 season.

### trivia_questions.7b16abd5 — 2026-11-16 / slot 4 — ✅ applied (stem only)
- **Before:** "Which UAB transfer big man helped anchor Tennessee's frontcourt during multiple Rick Barnes NCAA Tournament runs in the 2020s?"
- **After:** "Which 7-foot Serbian center, a transfer from Arizona State, played four seasons for Rick Barnes and became a fan favorite during Tennessee's early-2020s NCAA Tournament runs?" (Plavsic ✔ unchanged)
- **Why:** The premise was false. Plavsic transferred from Arizona State in May 2019, not UAB. Verified via UT Athletics and AP.

### trivia_questions.64602060 — 2026-11-16 / slot 5 — ✅ applied (full replacement)
- **Before:** "Which two figures are most frequently proposed by fans for a statue outside Neyland Stadium?" (Statues are barred by university policy / Only kickers are ever proposed / General Neyland and Peyton Manning ✔ / No such debate exists among fans)
- **After:** "In what year did coach Doug Dickey debut Neyland Stadium's orange-and-white checkerboard end zones?" A 1957, B 1964 ✔, C 1977, D 1989
- **Why:** The old question was opinion, not fact, and three of its options were non-answers. The new fact is verified: the end zones debuted Oct 10, 1964 vs. Boston College. 1989, the year they returned after the artificial-turf era, is a deliberate trap. The checkerboard *colors* question on 10-18 asks a different fact.

## 2026-11-14 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-11-14 → 2026-11-17. Checked 4 polls and 20 trivia rows.
- 11-14, 11-15 and 11-16 were already fixed in #284/#286/#287. They are clean on re-check.
- 11-17 had 4 issues: the poll wasn't about current football, slot 2 had absurd distractors, slot 3 gave away its own answer, and slot 4 was a broken True/False. All fixed. Slots 1 and 5 are fine.

### daily_polls.0f5d6204 — 2026-11-17 — ✅ applied
- **Before:** "Who is the best tight end in Tennessee football history?" (Witten / Princeton Fant / Luke Stocker / Mychal Rivera)
- **After:** "LSU comes to Neyland on Saturday. What's your early call for Vols vs. Tigers?" Options: Vols win comfortably / Vols win a close one / LSU wins a close one / LSU wins comfortably
- **Why:** This is LSU week, and the 2026-10-12 instruction says polls must be about current TN football. The old poll also repeated the 11-16 slot 1 tight-end theme. The new options are balanced between the two teams, and it covers a different angle from the 11-15 (priority) and 11-16 (key to a win) polls.

### trivia_questions.7adb8fef — 2026-11-17 / slot 2 — ✅ applied (options only)
- **Before:** A Seattle, B Boston, C Chicago, D Hoover, Alabama ✔
- **After:** A Omaha, Nebraska, B Nashville, Tennessee, C Atlanta, Georgia, D Hoover, Alabama ✔
- **Why:** The cities outside SEC country were throwaways. Omaha (home of the College World Series) is a real trap, and Nashville and Atlanta are plausible SEC cities. Verified that the 2026 tournament was held at the Hoover Met.

### trivia_questions.2e7e8ab0 — 2026-11-17 / slot 3 — ✅ applied
- **Before:** "Tennessee's 1985 SEC championship team, nicknamed the 'Sugar Vols,' won which bowl game to cap the season?" (Sugar Bowl, over Miami ✔ / Fiesta / Cotton / Orange)
- **After:** "Tennessee's 1985 'Sugar Vols' capped their SEC title season by routing which No. 2-ranked team 35-7 in the Sugar Bowl?" A Miami ✔, B Oklahoma, C Penn State, D Nebraska
- **Why:** The nickname "Sugar Vols" gave away the answer, and the correct option was the only long one. The question now asks for the opponent. Verified: #8 Tennessee beat #2 Miami 35-7 on Jan 1, 1986.

### trivia_questions.ae508d91 — 2026-11-17 / slot 4 — ✅ applied (full replacement)
- **Before:** "The SEC... currently employs a significant number of head coaches... who have won a national championship... True or false?" (Exactly one / Not applicable / Zero / True ✔)
- **After:** "LSU visits Neyland on Saturday. How many football national championships does LSU officially claim?" A 2, B 3, C 4 ✔, D 5
- **Why:** A broken True/False with a "Not applicable" option and a vague premise. Replaced with an LSU-week question. Verified that LSU claims 1958, 2003, 2007 and 2019.

### Not changed
- Slot 1 (Rocky Top Rowdies) is fine.
- Slot 5 (Reggie White, Hall of Fame 2006) is correct. Reggie White also appears on 10-25, but that question asks about his sack record, a different fact, so I left this one.

## 2026-11-15 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-11-15 → 2026-11-18. Checked 3 existing polls plus 1 inserted, and 20 trivia rows.
- 11-15, 11-16 and 11-17 were already fixed in #286/#287/#293. They are clean on re-check.
- 11-18 had 5 issues: no poll, a vague and unverifiable premise (slot 1), a near-duplicate (slot 2), a broken non-answer format (slot 3) and a false premise (slot 4). All fixed. Slot 5 is verified and kept.
- Heads-up for later runs: 12-17 slot 3 also covers Dwayne Goodrich, so it will need a new angle when that date enters the window. Athletic director questions are saturated in late November (11-19, 11-24, 11-29, 11-30), so expect duplicate fixes there.

### daily_polls.69ebcdb6 — 2026-11-18 — ✅ inserted
- **Before:** (no poll)
- **After:** "LSU comes to Neyland on Saturday. Which part of the Tigers' game worries you most?" Options: Their passing attack / Their run game / Their defensive front / Their special teams
- **Why:** Every day needs a poll about current TN football. This covers a new LSU-week angle (the opponent's threat), distinct from priority (11-15), key to a win (11-16) and prediction (11-17). It doesn't depend on any result.

### trivia_questions.ea079e55 — 2026-11-18 / slot 1 — ✅ applied (full replacement)
- **Before (Vol Baseball History):** "Which Tennessee coach guided the program to its first NCAA Super Regional hosting duties of the modern era?" (Delmonico / Serrano / Vitello ✔ / Raleigh)
- **After (Vol Football History):** "Which Tennessee quarterback, known for his rocket arm, took over as the full-time starter in 2023 after Hendon Hooker left for the NFL?" A Nico Iamaleava, B Joe Milton III ✔, C Jarrett Guarantano, D Joey Aguilar
- **Why:** "First Super Regional hosting duties of the modern era" is vague and likely wrong, since super regionals date from 1999 and Tennessee hosted before Vitello. Vitello is also already the subject on 11-13. The wrong options are all recent Vol QBs: Iamaleava started in 2024 and Aguilar in 2025.

### trivia_questions.c0ec289f — 2026-11-18 / slot 2 — ✅ applied (full replacement)
- **Before:** "Which Tennessee point guard was known for elite on-ball defense and wore the retired #5, with Chris Lofton's blessing...?" (Zeigler ✔ / Vescovi / Bone / Chandler)
- **After:** "Dalton Knecht, the 2024 SEC Player of the Year, was drafted 17th overall in the 2024 NBA Draft by which team?" A Los Angeles Lakers ✔, B Boston Celtics, C Golden State Warriors, D Miami Heat
- **Why:** Zeigler is already the answer on 11-10 (8 days earlier). Verified: the Lakers took Knecht at No. 17 on June 26, 2024. I worded it "drafted by" because his current team has changed. The 10-20 Knecht question asks about his transfer, a different fact.

### trivia_questions.541fa5ee — 2026-11-18 / slot 3 — ✅ applied (full replacement)
- **Before (General Vol Athletics):** "Which Tennessee Athletic Director's hiring of Danny White in January 2021 came just three days after both a coaching firing and an AD retirement?" (It followed a baseball coaching change / ...basketball coaching change / ...Pruitt's firing and Fulmer's retirement ✔ / Not applicable — White succeeded Fulmer directly)
- **After (Vol Football History):** "Tennessee opened its 2025 season with a 45-26 win in the Aflac Kickoff Game in Atlanta. Who did the Vols beat?" A Virginia, B NC State, C Syracuse ✔, D Georgia Tech
- **Why:** The stem didn't make sense, the options were sentence-length, one was "Not applicable", and AD questions are already used heavily this month. Verified the 45-26 win over Syracuse on Aug 30, 2025. The wrong options are real neutral-site opponents: Virginia 2023, NC State 2024, and Georgia Tech 2017 in Atlanta.

### trivia_questions.905641ac — 2026-11-18 / slot 4 — ✅ applied (stem only)
- **Before:** "...dealt with a torn ACL early in his career before becoming a defensive anchor..."
- **After:** "...battled a nagging, surgically repaired knee while becoming a defensive anchor on multiple Rick Barnes NCAA Tournament teams?" (Josiah-Jordan James ✔ unchanged)
- **Why:** False premise. I found no record of an ACL tear. Reports describe a scoped, surgically repaired knee and recurring soreness in 2022-23.

### Not changed
- Slot 5 (Dwayne Goodrich's 54-yard INT return TD in the 1999 Fiesta Bowl, shared MVP with Peerless Price) is verified and kept.

## 2026-11-16 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-11-16 → 2026-11-19. Checked 4 polls and 20 trivia rows.
- 11-16, 11-17 and 11-18 were already fixed in #287/#293/#294. They are clean on re-check.
- 11-19 had 5 issues: the poll wasn't about this week's game, slots 2 and 4 were near-duplicates, slot 3 was an AD question duplicating 11-30, and slot 5 had non-answer options. All fixed. Slot 1 is kept.
- Topic saturation note: David Price (11-08, 11-29, 12-02), Todd Helton (10-23, 10-25, 11-27, 12-01), Candace Parker (10-26, 11-11, 11-28, 12-08), Kim Caldwell (11-04, 11-27), Summitt SEC-title counts (10-26, 12-06) and athletic directors all repeat within 30 days. Later runs will need to replace one of each pair.

### daily_polls.6f015b06 — 2026-11-19 — ✅ applied
- **Before:** "What single thing would most improve Tennessee football right now?" (Better recruiting / Stronger offensive line / Elite quarterback / Improved defense)
- **After:** "LSU at Neyland is two days away. Which Vols position group has to win its matchup on Saturday?" Options: The offensive line / The defensive line / The wide receivers / The secondary
- **Why:** The old poll was generic and wasn't tied to the LSU game, which goes against the 2026-10-12 instruction. The new one covers an angle the other LSU-week polls don't (priority, key to a win, prediction, worries), and it doesn't depend on any result.

### trivia_questions.27ed97d7 — 2026-11-19 / slot 2 — ✅ applied (full replacement)
- **Before (Vol Baseball History):** "David Price later won a World Series championship with which team?" (Rays / Tigers / Red Sox ✔ / Blue Jays)
- **After (SEC Knowledge):** "LSU visits Neyland on Saturday. Which head coach led LSU to its 2019 national championship?" A Les Miles, B Ed Orgeron ✔, C Nick Saban, D Brian Kelly
- **Why:** This was a near-exact duplicate of 11-08 slot 2, which asks about Price's World Series with the Red Sox. All four new options are LSU head coaches; Saban won in 2003 and Miles in 2007, so the year is what separates them.

### trivia_questions.2723f567 — 2026-11-19 / slot 3 — ✅ applied (full replacement)
- **Before (General Vol Athletics):** "Which Tennessee Athletic Director is a Clemson graduate ... promoted to the top job in 2003?" (White / Currie / Hamilton ✔ / Hart)
- **After (Vol Football History):** "In October 2022, Hendon Hooker and the No. 8 Vols routed No. 25 LSU at Tiger Stadium in Baton Rouge. What was the final score?" A 31-28, B 40-13 ✔, C 27-20, D 45-17
- **Why:** Mike Hamilton is the subject of 11-30 slot 4, and AD questions repeat throughout this month. The new fact is verified: Tennessee won 40-13 on Oct 8, 2022.

### trivia_questions.0fde94d7 — 2026-11-19 / slot 4 — ✅ applied (full replacement)
- **Before (Lady Vols History):** "Pat Summitt's teams' combined SEC regular-season and tournament championship total, 32, was accumulated across how many seasons...?" (38 ✔ / 10 / Zero / 5)
- **After (Vol Football History):** "Neyland Stadium's playing surface, Shields-Watkins Field, is named for Knoxville banker William S. Shields and whom?" A His wife, Alice Watkins Shields ✔, B His partner at City National Bank, C UT's first football team captain, D The UT president who approved it
- **Why:** "Zero", 5 and 10 seasons were absurd options. The 32 SEC titles are also covered on 10-26 and 12-06. Verified via UT Libraries' Volopedia: the field was named in 1919 for Shields and his wife, the former Alice Watkins.

### trivia_questions.71a57442 — 2026-11-19 / slot 5 — ✅ applied (full replacement)
- **Before:** "Tennessee's series record against Georgia has trended toward which program across the 2000s-2020s?" (Georgia has held a recent-decades edge ✔ / The teams have not played since 2000 / It has been exactly split every year / Tennessee has dominated every meeting since 2000)
- **After:** "In 2005, Tennessee rallied to beat No. 4 LSU 30-27 in overtime in Baton Rouge. By how many points did the Vols trail at halftime?" A 14, B 17, C 21 ✔, D 24
- **Why:** The old question was vague, its options were sentence-length, and the wrong ones were absurd. The new one is an LSU-week hard question, verified by the UT and LSU recaps: LSU led 21-0 at the half and Tennessee won 30-27 in OT on Sept 26, 2005.

### Not changed
- Slot 1 ("Rocky Top" after touchdowns) is fine. The 10-30 Rocky Top question asks about its songwriters, a different fact.

## 2026-11-17 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-11-17 → 2026-11-20. Checked 4 polls and 20 trivia rows.
- 11-17, 11-18 and 11-19 were already fixed in #293/#294/#295. They are clean on re-check.
- 11-20 (eve of the LSU game) had 5 issues. The poll wasn't about football, slot 2 had a false premise and duplicated 12-10, slot 3 had absurd options and duplicated a saturated topic, and slot 4 duplicated 11-13 (Wilhoit). All fixed. Slots 1 and 5 are kept.

### daily_polls.b6a3616b — 2026-11-20 — ✅ applied
- **Before:** "What does the Lady Vols legacy mean to women's sports nationally?" (Everything — they defined the sport / A lot — Pat Summitt changed the game / Important but UConn gets more credit / The greatest dynasty in women's sports history)
- **After:** "LSU at Neyland is tomorrow. How many points do the Vols put up against the Tigers?" Options: Under 20 / 20 to 29 / 30 to 39 / 40 or more
- **Why:** The 2026-10-12 instruction says polls must be about TN football and the upcoming game. The new one doesn't depend on any result. The same angle was used for Kentucky on 11-03, but this is a different opponent, and it doesn't repeat the other LSU-week angles.

### trivia_questions.99590268 — 2026-11-20 / slot 2 — ✅ applied (full replacement)
- **Before (Vol Basketball History):** "Which Tennessee player set a program record with a 43-point game against Vanderbilt in January 2019?" (Bone / Alexander / Schofield / Grant Williams ✔)
- **After (SEC Knowledge):** "LSU visits Neyland tomorrow. LSU's school colors are purple and what?" A White, B Black, C Gold ✔, D Orange
- **Why:** The premise was false: 43 points was not the program record, which belongs to Tony White with 51 vs. Auburn in 1987. The question also duplicates 12-10 slot 2, and Grant Williams is the answer on 11-09. Most easy basketball topics are already used this month, so I used an LSU-week question instead.

### trivia_questions.95936d65 — 2026-11-20 / slot 3 — ✅ applied (full replacement)
- **Before:** "Tamika Catchings won how many Olympic gold medals...?" (1 / 8 / 0 / 4 ✔)
- **After:** "Lady Vol guard Jordan Horston was selected ninth overall in the 2023 WNBA Draft by which team?" A Las Vegas Aces, B Seattle Storm ✔, C Chicago Sky, D Atlanta Dream
- **Why:** 0 and 8 were throwaway options. Catchings is also used heavily (10-30, 11-08, 12-07, 12-13). Verified that Seattle took Horston at No. 9 on Apr 10, 2023.

### trivia_questions.50971928 — 2026-11-20 / slot 4 — ✅ applied (full replacement)
- **Before:** "Which Tennessee kicker is remembered for a game-winning field goal in a mid-2000s matchup with Florida during the Fulmer era?" (Wilhoit ✔ / Hall / Reveiz / Lincoln)
- **After:** "The first football game on Shields-Watkins Field, on Sept. 24, 1921, was a 27-0 Tennessee win over which opponent?" A Maryville, B Sewanee, C Kentucky, D Emory & Henry ✔
- **Why:** This duplicated 11-13 slot 4, the Wilhoit 50-yard FG vs Florida in 2004, seven days earlier. The new fact is verified via UT Libraries' Volopedia.

### Not changed
- Slot 1 (Lindsey Nelson Stadium) is fine. The 11-08 question about the stadium asks about its renovation cost, a different fact.
- Slot 5 (Don DeVoe coached the 1987 move into Thompson-Boling; he was coach 1978-89) is fine.

## 2026-11-18 — run summary (fixes APPLIED to DB per David's 2026-10-11 standing instruction)

- Window: 2026-11-18 → 2026-11-21. Checked 3 existing polls plus 1 inserted, and 20 trivia rows.
- 11-18, 11-19 and 11-20 were already fixed in #294/#295/#297. They are clean on re-check.
- 11-21 (LSU game day) had 4 issues: no poll, a confusing branding question with non-answer options (slot 1), vague era options with a length tell (slot 3), and an unverifiable question with absurd options and a "per Wikipedia" reference in the stem (slot 5). All fixed. Slots 2 and 4 are kept.

### daily_polls.05b06e28 — 2026-11-21 — ✅ inserted
- **Before:** (no poll)
- **After:** "It's LSU game day at Neyland! Where will the Vols' biggest play of the day come from?" Options: A deep pass / A long run / A defensive takeaway / A special teams return
- **Why:** Every day needs a poll about current TN football. This one is for game day, doesn't depend on the result, and uses a different angle from the rest of LSU week.

### trivia_questions.c94d98f8 — 2026-11-21 / slot 1 — ✅ applied (full replacement)
- **Before (General Vol Athletics):** "What year did Tennessee's athletic department largely unify its branding under the men's 'Vols' name, a change later partially reversed for women's basketball specifically?" (2015 ✔ / 2000 / It has never occurred / 1950)
- **After (Vol Football History):** "What jersey number did Peyton Manning wear as Tennessee's quarterback?" A 18, B 12, C 16 ✔, D 7
- **Why:** The stem was muddled. In 2015 UT dropped "Lady Vols" for every women's team except basketball, then restored it for all of them in 2017. The options also included a non-answer ("It has never occurred") and an absurd year (1950). The new question is a clean easy one. 18, his NFL number, is a fair trap.

### trivia_questions.32f384be — 2026-11-21 / slot 3 — ✅ applied
- **Before:** "Jerry Green coached Tennessee basketball during which general period?" (2000s / Mid-to-late 1990s into 2001 ✔ / 2010s / 1960s)
- **After:** "Jerry Green coached Tennessee men's basketball during which seasons?" A 1993-1997, B 1997-2001 ✔, C 2001-2005, D 2005-2009
- **Why:** The correct option was the only long, specific one, which gave it away, and the others were vague decades. The new options match the actual coaching eras of O'Neill, Green, Peterson and Pearl. Verified that Green was hired in April 1997 and resigned in March 2001.

### trivia_questions.31652a14 — 2026-11-21 / slot 5 — ✅ applied (full replacement)
- **Before (General Vol Athletics):** "Tennessee's men's track and field program ... boasts how many total Olympians through the 2024 Games, per Wikipedia's program history?" (Over 1,000 / Zero / Exactly 1 / 29 Olympians representing 9 different nations ✔)
- **After (Vol Football History):** "In 2010 at Tiger Stadium, Tennessee appeared to beat LSU 14-10 on the final play, but a penalty gave LSU one more snap and a 16-14 win. What was the penalty?" A Pass interference, B Too many men on the field ✔, C Offsides, D Delay of game
- **Why:** The stem cited Wikipedia, the wrong options were absurd, and the correct one was the only specific option. The new question is an LSU game-day hard question. Verified via UT and LSU recaps: Tennessee had 13 men on the field on Oct 2, 2010, and Stevan Ridley scored on the untimed down.

### Not changed
- Slot 2 (Kellie Harper played under Summitt) is fine. The 12-05 Harper question asks about her coaching career before UT, a different fact.
- Slot 4 (Crompton's 2009 senior season under OC Jim Chaney) is fine.
