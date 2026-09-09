// First-word-of-name (e.g. "Alabama" from "Alabama Crimson Tide") is the
// default short label for a team, but it reads badly for teams whose
// common short form isn't their first word — "Georgia Tech" as just
// "Georgia" gets clipped to "Geor" in a narrow column and misreads as
// the University of Georgia. Known exceptions override the default.
const SHORT_TEAM_NAME: Record<string, string> = {
  'Georgia Tech': 'GT',
};

export function shortTeamName(team: string): string {
  return SHORT_TEAM_NAME[team] ?? team.split(' ')[0];
}
