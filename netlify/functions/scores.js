import { getRecentResultsForAll, COMPETITIONS, BIG5_CODES } from "./lib/football-data.js";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope"); // "big5" (default) or "all"
    const codes = scope === "all" ? COMPETITIONS.map((c) => c.code) : BIG5_CODES;
    const limit = Number(url.searchParams.get("limit")) || 5;

    const results = await getRecentResultsForAll(codes, { limit });
    const byCode = Object.fromEntries(COMPETITIONS.map((c) => [c.code, c]));

    const leagues = results.map(({ code, matches }) => ({
      code,
      name: byCode[code].name,
      matches: matches.map((m) => ({
        id: m.id,
        utcDate: m.utcDate,
        homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name, crest: m.homeTeam.crest },
        awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name, crest: m.awayTeam.crest },
        score: m.score,
      })),
    }));

    return Response.json({ leagues, updatedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = { path: "/api/scores" };
