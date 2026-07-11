import { getStore } from "@netlify/blobs";
import { getRecentResultsForAll, COMPETITIONS, BIG5_CODES } from "./lib/football-data.js";
import { generateWeekendRecap } from "./lib/claude.js";

function currentWeekendKey(date = new Date()) {
  // Anchor the cache key to the Monday that starts the current week, so the
  // same recap is reused all week regardless of which day the page loads on.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diffToMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d.toISOString().slice(0, 10);
}

export default async (req) => {
  try {
    const store = getStore("recaps");
    const key = currentWeekendKey();

    const cached = await store.get(key, { type: "json" });
    if (cached) {
      return Response.json(cached);
    }

    const byCode = Object.fromEntries(COMPETITIONS.map((c) => [c.code, c]));
    const results = await getRecentResultsForAll(BIG5_CODES, { limit: 5, daysBack: 4 });
    const allMatches = results
      .flatMap(({ code, matches }) => matches.map((m) => ({ ...m, competitionName: byCode[code].name })))
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));

    if (allMatches.length === 0) {
      const empty = { headline: null, recap: null, updatedAt: new Date().toISOString() };
      return Response.json(empty);
    }

    const topMatches = allMatches.slice(0, 5);
    const recapText = await generateWeekendRecap(topMatches);
    const headlineMatch = topMatches[0];

    const payload = {
      headline: {
        homeTeam: headlineMatch.homeTeam.name,
        awayTeam: headlineMatch.awayTeam.name,
        score: headlineMatch.score.fullTime,
        competition: headlineMatch.competitionName,
      },
      recap: recapText,
      updatedAt: new Date().toISOString(),
    };

    await store.setJSON(key, payload);
    return Response.json(payload);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = { path: "/api/recap" };
