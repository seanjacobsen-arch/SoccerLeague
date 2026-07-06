# Pick Your Club — Group Soccer Recommender

A password-gated, 4-person soccer club recommender (Josh, Matt, Kevin, Sean).
Single static file, no build step — just `index.html`. Picks are stored in
Firebase Firestore so everyone's answers combine into one shared result.

---

## Instructions for Claude Code

If you're Claude Code reading this to set the project up, here's the exact
sequence. Ask the user (Sean) for anything marked **ASK USER** before
proceeding — don't guess at these.

### 1. Initialize the repo

```bash
cd <this project folder>
git init
git add index.html firestore.rules README.md
git commit -m "Initial commit: group soccer club recommender"
```

### 2. Create the GitHub repo and push

If the `gh` CLI is authenticated:

```bash
gh repo create soccer-club-recommender --public --source=. --remote=origin --push
```

If `gh` isn't available or isn't authenticated, ask the user to either:
- run `gh auth login` first, or
- create an empty repo manually at github.com/new named `soccer-club-recommender`,
  then run:
  ```bash
  git remote add origin https://github.com/<ASK USER: their username>/soccer-club-recommender.git
  git branch -M main
  git push -u origin main
  ```

### 3. Deploy

Two options — ask the user which they'd prefer, or default to GitHub Pages
since it requires zero extra accounts:

**Option A — GitHub Pages (simplest):**
```bash
gh api repos/<owner>/soccer-club-recommender/pages -X POST -f "source[branch]=main" -f "source[path]=/"
```
(Or tell the user: repo Settings → Pages → Deploy from branch → `main` → `/ (root)` → Save.)
The site will be live at `https://<owner>.github.io/soccer-club-recommender/`.

**Option B — Netlify:** the user has used this before. If they want Claude
Code to handle it via CLI:
```bash
npx netlify-cli deploy --prod --dir=.
```
This requires the user to be logged in (`npx netlify-cli login`) first —
ask them to do that interactively since it opens a browser.

### 4. Firebase setup (required for shared picks to actually save)

This part needs the user's manual input at console.firebase.google.com —
Claude Code cannot create a Firebase project non-interactively. Ask the user
to:

1. Go to https://console.firebase.google.com → create a new project (free
   tier is plenty for 4 people).
2. Inside the project: **Build a Web app** (the `</>` icon), name it
   anything, skip Firebase Hosting (not needed — GitHub/Netlify is already
   handling hosting).
3. Firebase will show a config object like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "project-id.firebaseapp.com",
     projectId: "project-id",
     storageBucket: "project-id.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef",
   };
   ```
   **ASK USER** to paste just this object to you (Claude Code).
4. In **Build → Firestore Database**, click "Create database," start in
   test mode.
5. In Firestore → Rules, paste the contents of `firestore.rules` (already
   in this repo) and publish.

Once you have the config object from the user, open `index.html`, find the
`const firebaseConfig = { ... }` block near the top of the
`<script type="text/babel">` section (search for `PASTE_YOUR_API_KEY`), and
replace the six placeholder values with the real ones. Commit and push:

```bash
git add index.html
git commit -m "Add Firebase config"
git push
```

### 5. Sanity check

Open the deployed URL. You should see a login screen with four names
(Josh/Matt/Kevin/Sean) and a password field — **not** a blank page. If it's
blank, open the browser console (F12) — the app now shows a visible error
banner or fallback message rather than failing silently, so whatever's
wrong should be readable there directly.

---

## What's in this file

- **Login**: hardcoded passwords per friend (see `CREDENTIALS` near the top
  of the script). Not real security — just a speed bump for a friend group.
  Change them by editing that object directly.
- **Data layer**: `LEAGUE_META` (5 leagues) and `CLUB_DATA` (all 96 clubs
  across the real 2026–27 Premier League / Bundesliga / Serie A / La Liga /
  Ligue 1 rosters) — this is the "source of truth." Edit club playstyle,
  rivalries, or nations here.
- **Recommender engine**: pure functions (`calculateClubFit`, `rankClubs`,
  etc.) — no UI code, just scoring logic. Weighs streaming access, kickoff
  time tolerance, vibe/style fit, loyalty (love/hate a club), and the 8
  "Debate & Alignment" dimensions (goal density, narrative focus, Champions
  League prestige, relegation drama, USMNT exposure, anti-dominance,
  atmosphere, learning curve).
- **Storage**: Firebase Firestore, one document per friend under a `picks`
  collection. `mergeWithDefaults` protects against old saved data missing
  newer fields if the schema changes again later.
- **UI**: plain React (loaded via CDN, JSX compiled in-browser by Babel
  Standalone — no npm install, no build step, no bundler). Tailwind is also
  loaded via CDN for utility classes.

## Known limitations (flagged honestly, not fixed)

- Club playstyle ratings, rivalry intensities, and underdog scores are
  reasonable approximations for flavor, not pulled from a stats provider.
- Smaller/newly-promoted clubs list only their home country under "key
  nations" since detailed current-roster nationality data wasn't available
  when this was built — don't read that as a real squad breakdown.
- The password gate is client-side only; anyone with the URL and a guessed
  password could get in. Fine for a private link among friends, not a
  substitute for real auth.
