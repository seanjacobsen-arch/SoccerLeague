import { getStore } from "@netlify/blobs";
import { getFlaggedBigMatches } from "./lib/weekend-big-matches.js";
import { generateBigMatchNotification } from "./lib/claude.js";
import { sendPushToSubscriber } from "./lib/push.js";

export default async () => {
  const flagged = await getFlaggedBigMatches({ daysAhead: 4, limit: 3 });
  const queuedStore = getStore("push");

  if (flagged.length === 0) {
    await queuedStore.setJSON("queued-this-week", { matches: [], updatedAt: new Date().toISOString() });
    return new Response("No big matches flagged this week.");
  }

  const topMatch = flagged[0];
  const notificationText = await generateBigMatchNotification({
    homeTeam: topMatch.homeTeam,
    awayTeam: topMatch.awayTeam,
    reason: topMatch.reason,
    utcDate: topMatch.utcDate,
  });

  const result = await sendPushToSubscriber({
    title: "Big match this week",
    body: notificationText,
  });

  await queuedStore.setJSON("queued-this-week", {
    matches: flagged.map((m) => ({
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
      competition: m.competitionName,
      utcDate: m.utcDate,
      reason: m.reason,
    })),
    notificationSent: notificationText,
    pushResult: result,
    updatedAt: new Date().toISOString(),
  });

  return new Response(`Push ${result.sent ? "sent" : "not sent (" + result.reason + ")"}.`);
};

// Fires Thursday and Friday at 13:00 UTC — adjust to your timezone preference.
export const config = { schedule: "0 13 * * 4,5" };
