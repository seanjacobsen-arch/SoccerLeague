import { getUpcomingFixtures, getStandingsForAll, COMPETITIONS, BIG5_CODES } from "./football-data.js";
import { detectBigMatches } from "./big-match-logic.js";

/** Fetches upcoming Big 5 fixtures + standings and returns the flagged big matches for the coming weekend. */
export async function getFlaggedBigMatches({ daysAhead = 4, limit = 3 } = {}) {
  const byCode = Object.fromEntries(COMPETITIONS.map((c) => [c.code, c]));

  const fixturesByLeague = await Promise.all(
    BIG5_CODES.map(async (code) => ({
      code,
      fixtures: await getUpcomingFixtures(code, { daysAhead }).catch(() => []),
    }))
  );
  const fixtures = fixturesByLeague.flatMap(({ code, fixtures }) =>
    fixtures.map((m) => ({
      id: m.id,
      competitionCode: code,
      competitionName: byCode[code].name,
      utcDate: m.utcDate,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
    }))
  );

  const standingsResults = await getStandingsForAll(BIG5_CODES);
  const standingsByCode = Object.fromEntries(standingsResults.map(({ code, table }) => [code, table]));

  return detectBigMatches(fixtures, standingsByCode, { limit });
}
