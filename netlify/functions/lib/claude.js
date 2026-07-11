import Anthropic from "@anthropic-ai/sdk";

// Haiku 4.5: recaps and notification text are short, fact-constrained generations
// with no reasoning depth required — cheapest model that's a comfortable fit.
const MODEL = "claude-haiku-4-5";

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic();
  }
  return client;
}

async function callClaude(prompt, { maxTokens = 300 } = {}) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text.trim() : "";
}

/** Generates a 2-3 sentence natural sports-journalism recap from raw match facts. */
export async function generateMatchRecap(match) {
  const facts = [
    `${match.homeTeam.name} ${match.score.fullTime.home} - ${match.score.fullTime.away} ${match.awayTeam.name}`,
    `Competition: ${match.competitionName}`,
    match.utcDate ? `Date: ${new Date(match.utcDate).toDateString()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Write a 2-3 sentence recap of this soccer match in a natural sports-journalism tone. Use only the facts provided below — do not invent scorers, stats, or events that aren't given. If scorer/card details aren't provided, just describe the result and scoreline naturally.

${facts}`;

  return callClaude(prompt, { maxTokens: 200 });
}

/** Generates a one-paragraph weekend recap headline summary from a set of top results. */
export async function generateWeekendRecap(matches) {
  const facts = matches
    .map((m) => `${m.homeTeam.name} ${m.score.fullTime.home} - ${m.score.fullTime.away} ${m.awayTeam.name} (${m.competitionName})`)
    .join("\n");

  const prompt = `Write a 2-3 sentence weekend recap in a natural sports-journalism tone, highlighting the headline result across these matches. Use only the facts provided — do not invent details.

${facts}`;

  return callClaude(prompt, { maxTokens: 200 });
}

/** Generates a short push-notification body for a flagged big match. */
export async function generateBigMatchNotification(bigMatch) {
  const prompt = `Write a single short, punchy sentence (under 140 characters) for a push notification announcing an upcoming soccer match. Use only these facts:

${bigMatch.homeTeam.name} vs ${bigMatch.awayTeam.name}
Reason it's a big match: ${bigMatch.reason}
Date: ${bigMatch.utcDate ? new Date(bigMatch.utcDate).toDateString() : "this weekend"}`;

  return callClaude(prompt, { maxTokens: 100 });
}
