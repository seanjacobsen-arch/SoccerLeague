# Soccer Dashboard — Personal PWA

A personal, installable PWA for checking Big 5 league scores, standings, weekend
recaps, and getting a push notification ahead of the week's biggest matches.
Not a live-scores app — on-demand checking, plus a scheduled Thursday/Friday
alert for match-of-the-week games.

Single user, no login system. Dark theme, orange accent.

---

## Architecture

- **Frontend**: static PWA in `public/` — plain HTML/CSS/JS, no build step,
  no framework. Installable on Android via the manifest + service worker.
- **Backend**: Netlify Functions in `netlify/functions/` (Node, ESM). These
  keep the football-data.org and Anthropic API keys server-side and give the
  push-subscription flow a real endpoint to POST to.
- **Storage**: [Netlify Blobs](https://docs.netlify.com/blobs/overview/) — a
  built-in key-value store, used for the cached weekend recap, the cached
  big-match banner, the stored push subscription, and "what's queued this
  week." No separate database needed for a single user.
- **Scheduled job**: `netlify/functions/scheduled-push.js` is a [Netlify
  Scheduled Function](https://docs.netlify.com/functions/scheduled-functions/)
  that runs Thursday and Friday, detects the week's big match(es), generates
  the notification text via Claude, and sends the push.

## Data sources

- **football-data.org** (free tier, 10 req/min) — Premier League, La Liga,
  Bundesliga, Serie A, Ligue 1, Champions League, plus Eredivisie, Primeira
  Liga, and Championship. Competition codes live in
  `netlify/functions/lib/football-data.js`.
- **Claude API** (Haiku 4.5) — generates the weekend recap and the big-match
  notification text from raw match facts (score, teams, competition). Never
  reproduces published match reports — it's told to use only the facts it's
  given.
- **Broadcast/streaming info**: intentionally not included. No API reliably
  covers this; the spec calls for a hardcoded lookup table if you want it
  later — not built yet.

## Big-match detection

`netlify/functions/lib/derbies.js` has a hardcoded rivalry list (El Clásico,
Der Klassiker, North London Derby, etc.) — edit it directly if a fixture
rivalry is missing. `netlify/functions/lib/big-match-logic.js` also flags
matches where both teams are in the top 4 and within 4 points of each other,
or both in the bottom 3 and within 4 points — computed live from standings.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get your API keys

**football-data.org** — you said you already have a key. You'll add it as
`FOOTBALL_DATA_API_KEY` below.

**Anthropic (Claude) API key** — go to
[console.anthropic.com](https://console.anthropic.com), sign up or log in,
then **Settings → API Keys → Create Key**. You'll also need a payment method
under **Settings → Billing** — usage here is a couple of short text
generations a week, so cost is a few cents a month at most.

### 3. Generate VAPID keys (for push notifications)

```bash
npx web-push generate-vapid-keys
```

This prints a public and private key. **Don't commit these to the repo** —
they go into Netlify's environment variables (next step). Pick any
`mailto:` address for `VAPID_SUBJECT` — it's only used if a push service
needs to contact you about your VAPID usage.

### 4. Create the Netlify site and set environment variables

```bash
npx netlify-cli login      # opens a browser
npx netlify-cli init       # links this folder to a new or existing Netlify site
```

Then in the Netlify dashboard for the site (**Site configuration →
Environment variables**), add:

| Variable | Value |
|---|---|
| `FOOTBALL_DATA_API_KEY` | your football-data.org key |
| `ANTHROPIC_API_KEY` | your Claude API key |
| `VAPID_PUBLIC_KEY` | from step 3 |
| `VAPID_PRIVATE_KEY` | from step 3 |
| `VAPID_SUBJECT` | `mailto:you@example.com` |

### 5. Deploy

```bash
npx netlify-cli deploy --prod
```

Netlify Blobs works automatically on deploy — no extra setup needed.

### 6. Install it on your phone

Open the deployed URL in Chrome on Android → menu → **Add to Home screen**.
Open the app, go to the **Notifications** tab, and toggle notifications on
to grant permission and register a push subscription. Use **Send test push**
to confirm it's wired up end-to-end before waiting for the Thursday/Friday
job.

---

## Local development

```bash
npm install -g netlify-cli   # if you don't have it
netlify dev
```

This runs the functions and static site locally (`http://localhost:8888`)
with the same routing as production. Local Blobs storage is scoped to your
machine, so subscriptions/caches won't carry over to production — that's
expected.

## Project layout

```
public/                        static PWA (served as-is, no build step)
  index.html                   single-page shell, 4 views + bottom nav
  manifest.json                install metadata
  service-worker.js             handles push events + notification clicks
  assets/app.js                 view routing, fetch + localStorage cache, push subscribe flow
  assets/styles.css              dark/orange theme
  assets/icons/                  app icons

netlify/functions/
  scores.js                     GET recent results (?scope=big5|all)
  standings.js                  GET league table(s) (?league=<code> or all Big 5)
  recap.js                      GET cached/generated weekend recap
  big-match.js                  GET cached/generated "big match this week" list
  vapid-public-key.js           GET the public VAPID key for subscribing
  subscribe.js                  POST/DELETE/GET push subscription
  send-test-push.js             POST — manual test push
  queued-notifications.js       GET what the scheduled job queued this week
  scheduled-push.js             cron (Thu/Fri) — detect big match, generate text, send push
  lib/football-data.js          football-data.org client + competition list
  lib/derbies.js                hardcoded rivalry list
  lib/big-match-logic.js        derby + table-proximity detection
  lib/weekend-big-matches.js    shared fixture-fetch + detection used by big-match.js and the cron job
  lib/claude.js                 Claude API wrapper (recap + notification text)
  lib/push.js                   web-push send helper
```

## Known limitations (flagged honestly)

- Broadcast/streaming info is not implemented — out of scope for this pass.
- The derby list is a static, hand-maintained set of Big 5 rivalries — it
  won't catch every possible flagged fixture, just the well-known ones.
- Push notifications require Chrome on Android (or another browser with Web
  Push support) — iOS Safari has its own install-first restrictions not
  accounted for here, since the primary target is Android.
- The scheduled push job (`scheduled-push.js`) defaults to firing at 13:00
  UTC on Thursday and Friday (`0 13 * * 4,5`) — adjust the `config.schedule`
  cron string in that file to match your timezone preference.
