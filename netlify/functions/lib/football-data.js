// Thin client for football-data.org (v4). Free tier: 10 req/min, no cost.
const BASE_URL = "https://api.football-data.org/v4";

// Competitions covered by the football-data.org free tier that matter for this app.
export const COMPETITIONS = [
  { code: "PL", name: "Premier League", country: "England", tier: "big5" },
  { code: "PD", name: "La Liga", country: "Spain", tier: "big5" },
  { code: "BL1", name: "Bundesliga", country: "Germany", tier: "big5" },
  { code: "SA", name: "Serie A", country: "Italy", tier: "big5" },
  { code: "FL1", name: "Ligue 1", country: "France", tier: "big5" },
  { code: "CL", name: "Champions League", country: "Europe", tier: "extra" },
  { code: "DED", name: "Eredivisie", country: "Netherlands", tier: "extra" },
  { code: "PPL", name: "Primeira Liga", country: "Portugal", tier: "extra" },
  { code: "ELC", name: "Championship", country: "England", tier: "extra" },
];

export const BIG5_CODES = COMPETITIONS.filter((c) => c.tier === "big5").map((c) => c.code);

function authHeaders() {
  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) {
    throw new Error("FOOTBALL_DATA_API_KEY is not set");
  }
  return { "X-Auth-Token": token };
}

async function fdFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data.org ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/** Most recent finished matches for one competition, newest first. */
export async function getRecentResults(code, { limit = 10, daysBack = 10 } = {}) {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const data = await fdFetch(
    `/competitions/${code}/matches?status=FINISHED&dateFrom=${isoDate(dateFrom)}&dateTo=${isoDate(dateTo)}`
  );
  const matches = (data.matches || []).sort(
    (a, b) => new Date(b.utcDate) - new Date(a.utcDate)
  );
  return matches.slice(0, limit);
}

/** Upcoming scheduled matches for one competition within the given window. */
export async function getUpcomingFixtures(code, { daysAhead = 4 } = {}) {
  const dateFrom = new Date();
  const dateTo = new Date(dateFrom.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const data = await fdFetch(
    `/competitions/${code}/matches?status=SCHEDULED&dateFrom=${isoDate(dateFrom)}&dateTo=${isoDate(dateTo)}`
  );
  return data.matches || [];
}

/** Current league table for one competition (TOTAL standings type). */
export async function getStandings(code) {
  const data = await fdFetch(`/competitions/${code}/standings`);
  const table = (data.standings || []).find((s) => s.type === "TOTAL");
  return table ? table.table : [];
}

export async function getRecentResultsForAll(codes = BIG5_CODES, opts) {
  const results = await Promise.all(
    codes.map(async (code) => ({
      code,
      matches: await getRecentResults(code, opts).catch(() => []),
    }))
  );
  return results;
}

export async function getStandingsForAll(codes = BIG5_CODES) {
  const results = await Promise.all(
    codes.map(async (code) => ({
      code,
      table: await getStandings(code).catch(() => []),
    }))
  );
  return results;
}
