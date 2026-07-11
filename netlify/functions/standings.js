import { getStandings, COMPETITIONS, BIG5_CODES } from "./lib/football-data.js";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("league");
    const byCode = Object.fromEntries(COMPETITIONS.map((c) => [c.code, c]));

    if (code) {
      if (!byCode[code]) {
        return Response.json({ error: `Unknown league code: ${code}` }, { status: 400 });
      }
      const table = await getStandings(code);
      return Response.json({
        code,
        name: byCode[code].name,
        table,
        updatedAt: new Date().toISOString(),
      });
    }

    // No league specified: return all Big 5 tables (used for the Home mini-standings snippet)
    const all = await Promise.all(
      BIG5_CODES.map(async (c) => ({ code: c, name: byCode[c].name, table: await getStandings(c) }))
    );
    return Response.json({ leagues: all, updatedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = { path: "/api/standings" };
