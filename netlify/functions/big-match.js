import { getStore } from "@netlify/blobs";
import { getFlaggedBigMatches } from "./lib/weekend-big-matches.js";

function currentWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d.toISOString().slice(0, 10);
}

export default async (req) => {
  try {
    const store = getStore("big-matches");
    const key = currentWeekKey();

    const cached = await store.get(key, { type: "json" });
    if (cached) {
      return Response.json(cached);
    }

    const flagged = await getFlaggedBigMatches({ daysAhead: 4, limit: 3 });

    const payload = {
      matches: flagged.map((m) => ({
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        competition: m.competitionName,
        utcDate: m.utcDate,
        reason: m.reason,
      })),
      updatedAt: new Date().toISOString(),
    };

    await store.setJSON(key, payload);
    return Response.json(payload);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = { path: "/api/big-match" };
