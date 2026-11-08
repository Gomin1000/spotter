# Spotter

> **It spots you. It never lifts for you.**

A competitive-programming sidekick for Chrome, built in one day at FallHacks 2026 by two first-time hackers (Gleb and Santiago), powered by the Gemini API.

<img src="public/mascot/flex.png" alt="BUFF-JEPI, the Spotter robot, flexing" width="200" />

- **Devpost:** https://devpost.com/software/spotter-ys6gwd
- **Live site and install page:** https://fallhacks-2026.vercel.app/install

## What it does

- **Lives in Chrome's side panel**, docked beside the problem you're solving.
- **One-click read** on LeetCode and Codeforces: "Read this page" grabs the statement, title and (on LeetCode) the official difficulty. On other pages it reads your selected text (or the whole page). Without the extension, paste a screenshot (Ctrl+V), paste the text, or use "Read my screen".
- **4-step hint ladder:** Warm-up (what to notice), Form check (which technique), Spot (the approach in plain English), Assisted rep (pseudocode with `___` blanks). One step per "Spot me", and BUFF-JEPI holds up a finger for each rep.
- **No free reps:** begging for the answer gets refused, and a refusal doesn't use up a step.
- **Talk to Spotter:** ask a question at any time. With code pasted it checks your code; without code it answers about the problem. Neither one uses a step.
- **Honest code checks:** Spotter only calls something a bug if it can show a small input where your code gives the wrong answer, with one sentence tracing why. Otherwise it says your logic looks right and suggests edge cases to test. It never writes the fix.
- **Reveal weight:** a spoiler button that shows the official Codeforces rating, the official LeetCode difficulty, or Spotter's Codeforces-style estimate with its confidence.
- **Watch mode (opt-in screen share):**
  - **Stuck** after 15 minutes with no visible progress on your code; Spotter then offers a spot.
  - **Suspicious** (side-eye) after 15 s on something unrelated.
  - **Angry** ("No free reps") at 45 s; three seconds later it drags you back to the problem tab. That last part needs the Chrome extension.
  - A demo mode speeds all of this up for presentations.
- **I solved it:** BUFF-JEPI flexes and tells you how many spots you used.

## How it works

```
 Chrome extension (side panel, MV3)
   │  "Read this page" sends the statement text to the app iframe (postMessage)
   ▼
 Next.js app on Vercel  (UI + API routes, no database)
   │  each request carries the problem and hint history
   ▼
 Gemini API (gemini-3.8-flash, structured JSON output)
```

| Route | What it does |
|---|---|
| `POST /api/read-problem` | Reads a problem from a screenshot (JPEG, max 768 px wide) or pasted text. Returns `found_problem: false` instead of inventing a problem that isn't there. |
| `POST /api/hint` | Gives exactly one hint step, refuses requests for the answer, or (in check mode) answers a question about your code or the problem without a new step. |
| `POST /api/watch` | Classifies the last two screen frames as focused, distracted, idle or unknown, and whether anything changed. The browser decides "stuck" and the distraction stages from the timing. |
| `POST /api/rating` | Official Codeforces rating from the Codeforces API, official LeetCode difficulty, or a Gemini estimate with a confidence level. |

Every Gemini call uses a JSON response schema, so the app always gets typed fields back (all shared types are in `lib/contract.ts`), and every response has an ok/found flag for failures.

**Four hint-safety layers:**
1. The system instruction forbids full solutions and full code, and tells Spotter to refuse begging.
2. The response schema has a single `hint` field, so there is no place to put a full solution.
3. Each call asks for exactly one step, building on the hints already given.
4. The server checks every hint before sending it:
   - **Code:** more than 5 lines of real code is rejected.
   - **Step 1:** may not name a technique.
   - **Step 4:** pseudocode must have `___` blanks.

   A rejected hint is retried once with stricter instructions, then replaced by a safe fallback or a refusal.

**Privacy:**
- Watch mode is opt-in. It only runs after you click to share your screen, and you can stop it any time.
- Frames are resized in the browser, sent to `/api/watch` for classification, and never stored. There is no database.
- Spotter is instructed to keep what it says about your screen generic: no names, usernames, message contents or video titles.

## Install the extension

1. Download [spotter-extension.zip](https://fallhacks-2026.vercel.app/spotter-extension.zip) and unzip it into a folder you'll keep.
2. Open `chrome://extensions` (paste it in the address bar) and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the unzipped folder (the one with `manifest.json` inside).
4. Pin Spotter from the puzzle-piece menu, open a Codeforces or LeetCode problem, and click the Spotter icon. Then click **Read this page**.

The website also works without the extension: open https://fallhacks-2026.vercel.app and paste a screenshot (Ctrl+V) or the problem text.

## Run locally

1. `npm install`
2. Create `.env.local` in the repo root containing `GEMINI_API_KEY=<your key>`
3. `npm run dev`
4. Open http://localhost:3000. In the extension, tick **Dev: use localhost** at the bottom of the side panel to use your local app.

After changing anything in `extension/`, rebuild the download with `npm run zip-extension` and commit `public/spotter-extension.zip`.

## Built with

Next.js · TypeScript · Tailwind CSS · Gemini API · Chrome Extensions (Manifest V3) · Vercel · Codeforces API · Claude Code · Figma
