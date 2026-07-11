import { findDerby } from "./derbies.js";

const TOP_ZONE = 4; // top-of-table / title-race zone
const RELEGATION_ZONE = 3; // bottom-of-table zone (most Big 5 leagues relegate 3)
const POINTS_GAP_THRESHOLD = 4; // "close enough to matter" gap between two teams

function buildPositionIndex(table) {
  const byTeamId = new Map();
  for (const row of table) {
    byTeamId.set(row.team.id, { position: row.position, points: row.points, name: row.team.name });
  }
  return byTeamId;
}

/**
 * Flags fixtures worth surfacing as "big match this week."
 * fixtures: [{ id, competitionCode, competitionName, utcDate, homeTeam, awayTeam }]
 * standingsByCode: { [code]: table[] } (football-data.org standings table rows)
 * Returns up to `limit` matches, each with a one-line reason.
 */
export function detectBigMatches(fixtures, standingsByCode, { limit = 3 } = {}) {
  const flagged = [];

  for (const fixture of fixtures) {
    const table = standingsByCode[fixture.competitionCode];
    const derbyName = findDerby(fixture.homeTeam.name, fixture.awayTeam.name);

    if (derbyName) {
      flagged.push({
        ...fixture,
        reason: `Derby — ${derbyName}`,
        priority: 3,
      });
      continue;
    }

    if (!table || table.length === 0) continue;
    const positions = buildPositionIndex(table);
    const home = positions.get(fixture.homeTeam.id);
    const away = positions.get(fixture.awayTeam.id);
    if (!home || !away) continue;

    const pointsGap = Math.abs(home.points - away.points);
    const bothTop = home.position <= TOP_ZONE && away.position <= TOP_ZONE;
    const bothBottom =
      home.position > table.length - RELEGATION_ZONE && away.position > table.length - RELEGATION_ZONE;

    if (bothTop && pointsGap <= POINTS_GAP_THRESHOLD) {
      flagged.push({
        ...fixture,
        reason: `Top-of-table clash — ${pointsGap === 0 ? "level on points" : `${pointsGap} pts apart`}, both in the top ${TOP_ZONE}`,
        priority: 2,
      });
    } else if (bothBottom && pointsGap <= POINTS_GAP_THRESHOLD) {
      flagged.push({
        ...fixture,
        reason: `Relegation six-pointer — ${pointsGap === 0 ? "level on points" : `${pointsGap} pts apart`} near the bottom`,
        priority: 1,
      });
    }
  }

  return flagged.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
