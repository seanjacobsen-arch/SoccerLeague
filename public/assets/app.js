const LEAGUES = [
  { code: "PL", name: "Premier League" },
  { code: "PD", name: "La Liga" },
  { code: "BL1", name: "Bundesliga" },
  { code: "SA", name: "Serie A" },
  { code: "FL1", name: "Ligue 1" },
  { code: "CL", name: "Champions League" },
  { code: "DED", name: "Eredivisie" },
  { code: "PPL", name: "Primeira Liga" },
  { code: "ELC", name: "Championship" },
];
const BIG5_CODES = ["PL", "PD", "BL1", "SA", "FL1"];

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ---------- Cache-aware fetch ----------

async function cachedFetch(url) {
  const cacheKey = `cache:${url}`;
  const cached = localStorage.getItem(cacheKey);
  let cachedValue = null;
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      cachedValue = parsed.data;
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        return parsed.data;
      }
    } catch {
      // ignore corrupt cache entry
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  } catch (err) {
    if (cachedValue) return cachedValue; // serve stale data rather than failing
    throw err;
  }
}

// ---------- View routing ----------

function showView(name) {
  document.querySelectorAll(".view").forEach((el) => el.classList.remove("active"));
  document.getElementById(`view-${name}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === name);
  });

  if (name === "scores") loadScores();
  if (name === "standings") loadStandings();
  if (name === "notifications") loadNotifications();
}

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

// ---------- Home ----------

function formatMatchDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function renderMatchRow(m) {
  const score = m.score?.fullTime;
  const scoreText = score && score.home !== null ? `${score.home} - ${score.away}` : "vs";
  return `
    <div class="match-row">
      <div class="match-teams">
        <span>${m.homeTeam.name}</span>
        <span>${m.awayTeam.name}</span>
      </div>
      <div class="match-score">${scoreText}</div>
    </div>
  `;
}

async function loadRecap() {
  const el = document.getElementById("recap-content");
  try {
    const data = await cachedFetch("/api/recap");
    if (!data.recap) {
      el.innerHTML = `<div class="empty-state">No results yet this weekend.</div>`;
      return;
    }
    el.innerHTML = `
      <div class="recap-headline">${data.headline.homeTeam} ${data.headline.score.home} - ${data.headline.score.away} ${data.headline.awayTeam}</div>
      <div class="recap-text">${data.recap}</div>
    `;
  } catch {
    el.innerHTML = `<div class="empty-state">Couldn't load the recap.</div>`;
  }
}

async function loadBigMatchBanner() {
  const el = document.getElementById("big-match-card");
  try {
    const data = await cachedFetch("/api/big-match");
    if (!data.matches || data.matches.length === 0) {
      el.innerHTML = "";
      return null;
    }
    const top = data.matches[0];
    el.innerHTML = `
      <div class="big-match-banner">
        <h2>Big Match This Week</h2>
        <div class="big-match-teams">${top.homeTeam} vs ${top.awayTeam}</div>
        <div class="big-match-meta">${formatMatchDate(top.utcDate)} · ${top.reason}</div>
      </div>
    `;
    return top.competition;
  } catch {
    el.innerHTML = "";
    return null;
  }
}

async function loadHomeScores() {
  const el = document.getElementById("home-scores");
  try {
    const data = await cachedFetch("/api/scores?scope=big5&limit=5");
    const allMatches = data.leagues.flatMap((l) => l.matches.map((m) => ({ ...m, league: l.name })));
    allMatches.sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
    const top = allMatches.slice(0, 5);
    if (top.length === 0) {
      el.innerHTML = `<div class="empty-state">No recent results.</div>`;
      return;
    }
    el.innerHTML = top.map(renderMatchRow).join("");
  } catch {
    el.innerHTML = `<div class="empty-state">Couldn't load scores.</div>`;
  }
}

async function loadMiniStandings(relevantLeagueName) {
  const el = document.getElementById("mini-standings");
  const titleEl = document.getElementById("mini-standings-title");
  try {
    const data = await cachedFetch("/api/standings");
    let league = data.leagues.find((l) => l.name === relevantLeagueName);
    if (!league) league = data.leagues.find((l) => l.code === "PL") || data.leagues[0];
    if (!league || !league.table || league.table.length === 0) {
      el.innerHTML = `<div class="empty-state">Standings unavailable.</div>`;
      return;
    }
    titleEl.textContent = `${league.name} — Top ${Math.min(4, league.table.length)}`;
    el.innerHTML = `
      <table class="standings">
        <tbody>
          ${league.table
            .slice(0, 4)
            .map(
              (row) => `
            <tr>
              <td>${row.position}</td>
              <td>${row.team.name}</td>
              <td class="num">${row.points}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  } catch {
    el.innerHTML = `<div class="empty-state">Couldn't load standings.</div>`;
  }
}

async function loadHome() {
  loadRecap();
  const relevantLeague = await loadBigMatchBanner();
  loadHomeScores();
  loadMiniStandings(relevantLeague);
}

// ---------- Scores ----------

async function loadScores() {
  const el = document.getElementById("scores-content");
  el.innerHTML = `<div class="muted">Loading…</div>`;
  try {
    const data = await cachedFetch("/api/scores?scope=all&limit=10");
    const groups = data.leagues.filter((l) => l.matches.length > 0);
    if (groups.length === 0) {
      el.innerHTML = `<div class="empty-state">No results this weekend.</div>`;
      return;
    }
    el.innerHTML = groups
      .map(
        (l) => `
      <div class="league-group">
        <h3>${l.name}</h3>
        <div class="card">${l.matches.map(renderMatchRow).join("")}</div>
      </div>
    `
      )
      .join("");
  } catch {
    el.innerHTML = `<div class="empty-state">Couldn't load scores.</div>`;
  }
}

// ---------- Standings ----------

function populateLeagueSelect() {
  const select = document.getElementById("league-select");
  if (select.options.length > 0) return;
  select.innerHTML = LEAGUES.map((l) => `<option value="${l.code}">${l.name}</option>`).join("");
  select.addEventListener("change", () => loadStandingsForLeague(select.value));
}

async function loadStandingsForLeague(code) {
  const el = document.getElementById("standings-content");
  el.innerHTML = `<div class="muted">Loading…</div>`;
  try {
    const data = await cachedFetch(`/api/standings?league=${code}`);
    if (!data.table || data.table.length === 0) {
      el.innerHTML = `<div class="empty-state">Standings unavailable for this league.</div>`;
      return;
    }
    el.innerHTML = `
      <table class="standings">
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Club</th>
            <th class="num">P</th>
            <th class="num">W</th>
            <th class="num">D</th>
            <th class="num">L</th>
            <th class="num">GD</th>
            <th class="num">Pts</th>
          </tr>
        </thead>
        <tbody>
          ${data.table
            .map(
              (row) => `
            <tr>
              <td class="num">${row.position}</td>
              <td>${row.team.name}</td>
              <td class="num">${row.playedGames}</td>
              <td class="num">${row.won}</td>
              <td class="num">${row.draw}</td>
              <td class="num">${row.lost}</td>
              <td class="num">${row.goalDifference}</td>
              <td class="num">${row.points}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  } catch {
    el.innerHTML = `<div class="empty-state">Couldn't load standings.</div>`;
  }
}

function loadStandings() {
  populateLeagueSelect();
  loadStandingsForLeague(document.getElementById("league-select").value);
}

// ---------- Notifications / Settings ----------

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function getPushSubscriptionState() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function updatePushUI() {
  const toggle = document.getElementById("push-toggle");
  const status = document.getElementById("push-status");
  const testBtn = document.getElementById("test-push-btn");

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    status.textContent = "Push notifications aren't supported in this browser.";
    toggle.disabled = true;
    return;
  }

  const subscription = await getPushSubscriptionState();
  toggle.checked = Boolean(subscription);
  testBtn.disabled = !subscription;
  status.textContent = subscription ? "Notifications are on." : "Notifications are off.";
}

async function subscribeToPush() {
  const status = document.getElementById("push-status");
  try {
    const keyRes = await fetch("/api/vapid-public-key");
    const { publicKey, error } = await keyRes.json();
    if (error) throw new Error(error);

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
  } catch (err) {
    status.textContent = `Couldn't enable notifications: ${err.message}`;
    document.getElementById("push-toggle").checked = false;
  }
}

async function unsubscribeFromPush() {
  const subscription = await getPushSubscriptionState();
  if (subscription) await subscription.unsubscribe();
  await fetch("/api/subscribe", { method: "DELETE" });
}

async function loadQueuedNotifications() {
  const el = document.getElementById("queued-content");
  try {
    const data = await cachedFetch("/api/queued-notifications");
    if (!data.matches || data.matches.length === 0) {
      el.innerHTML = `<div class="empty-state">Nothing queued yet — checks run Thursdays and Fridays.</div>`;
      return;
    }
    el.innerHTML = data.matches
      .map(
        (m) => `
      <div class="match-row">
        <div class="match-teams">
          <span>${m.homeTeam} vs ${m.awayTeam}</span>
          <span class="muted">${m.reason}</span>
        </div>
        <div class="match-score">${formatMatchDate(m.utcDate)}</div>
      </div>
    `
      )
      .join("");
  } catch {
    el.innerHTML = `<div class="empty-state">Couldn't load queued notifications.</div>`;
  }
}

function loadNotifications() {
  updatePushUI();
  loadQueuedNotifications();
}

document.getElementById("push-toggle").addEventListener("change", async (e) => {
  const status = document.getElementById("push-status");
  if (e.target.checked) {
    status.textContent = "Enabling…";
    await subscribeToPush();
  } else {
    status.textContent = "Disabling…";
    await unsubscribeFromPush();
  }
  await updatePushUI();
});

document.getElementById("test-push-btn").addEventListener("click", async (e) => {
  e.target.disabled = true;
  e.target.textContent = "Sending…";
  try {
    const res = await fetch("/api/send-test-push", { method: "POST" });
    const data = await res.json();
    document.getElementById("push-status").textContent = data.sent
      ? "Test push sent — check your notifications."
      : `Push not sent (${data.reason || data.error}).`;
  } finally {
    e.target.disabled = false;
    e.target.textContent = "Send test push";
  }
});

// ---------- Init ----------

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch(() => {});
}

loadHome();
