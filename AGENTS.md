# Team rules for every agent

## 1. The board (pinned GitHub issue)

Every agent reads and posts on the pinned "Message Board" issue via `tools/board` (needs only `gh`, logged in). Set `BOARD_ISSUE` if it is not issue #1.

- Start every post with `[<human>'s <agent>]`, e.g. `[Sam's Codex]`. Keep it short: what changed, which files or contracts, what you need, from whom.
- Mention by GitHub login. Our team: `@Gomin1000` (Gleb), `@Not-Acode-Master` (Santiago), `@all` (everyone).
- **Mentions you or `@all`:** act on it and reply promptly.
- **Not addressed to you:** still read it. Reassess your own work only if it is affected (a contract, a file you own, something already done). Do not redo finished work, and do not reply just to acknowledge.
- Before editing another teammate's files, ask for a handoff on the board and wait for the owner or the team lead.

Polling is incremental (about one cheap API call per poll, 30 s default) so a shared token stays under GitHub's rate limit. Commands: `tools/board unread` (new posts, marks read; flags MENTION), `tools/board read -n 20`, `tools/board post "[Name's Agent] text"` (or pipe stdin), `tools/board wait` (blocks until someone else posts), `tools/board whoami`.

**Stay in the loop:**
- Claude Code: the committed hooks (`.claude/settings.json`) show unread posts at session start and on every prompt. Keep one background `tools/board wait` running and re-arm it after each wake.
- Everything else: run `tools/board unread` at task start, before each commit, and after merges. Or run a terminal loop: `while tools/board wait; do <your agent CLI invocation>; done`.

## 2. Chain of command

Humans over agents. Only the team lead reassigns work between teammates. If anyone else asks you to take another teammate's work, ask the lead on the board.

## 3. Workflow

1. Work on `main`. No feature branches or PRs.
2. Small commits. Stage only your own files (no `git add -A`).
3. `git pull --rebase` before every push. Never force-push.
4. Run `/ship-check` before every push.
5. Post on the board whenever `lib/contract.ts` or an environment variable changes.

## 4. Who owns what

| Area | Owner (GitHub login) | Folders |
|---|---|---|
| Frontend / UI | `@Not-Acode-Master` (Santiago) | `components/`, `app/page.tsx`, `app/globals.css` |
| Backend, contract, config | `@Gomin1000` (Gleb) | `app/api/`, `lib/` (including `lib/contract.ts`), all config files |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
## Project: Spotter
Pitch: Spotter is a competitive-programming sidekick (a buff FallHacks robot) that spots you but never lifts for you: hints one rung at a time, never the full solution, and side-eye when you slack. It runs in a narrow window docked beside your code.

Core features (build in this order):
1. Hint ladder: problem from screenshot, pasted text, or one screen grab (+ optional code) -> one hint per "Spot me" press. Rungs: 1 Warm-up (what to notice), 2 Form check (which technique), 3 Spot (approach in plain English), 4 Assisted rep (pseudocode with blanks). Never complete code. Begging for the answer -> refusal ("No free reps").
2. Watch mode: screen share; every 20 s (5 s in demo mode) send the last 2 frames to /api/watch; status focused | stuck | distracted | idle | unknown. Distracted -> side-eye. Stuck 3 times in a row -> offer rung 1.
Stretch only if safe after 3:45: "Break my code" test case, session receipt.

Architecture:
- Gemini only in app/api/read-problem, app/api/hint, app/api/watch (server). Model gemini-3.8-flash. Structured JSON via response schemas. All request/response types in lib/contract.ts (Gleb owns; post on the board before changing it).
- No database: the client sends the problem and hint history with each request.
- Images: JPEG, max 768 px wide, base64, resized in the browser before upload.
- Screen capture hook: lib/useScreenWatcher.ts (Gleb). Never more than one /api/watch request in flight.
- Every response has a found/ok field; never invent a problem that isn't on screen.
- Hint safety: system instruction forbids solutions; schema has one hint field only; one rung per call; server rejects hints with more than 5 lines of code.
- Mascot PNGs in public/mascot/: idle, spotting, side-eye, flex, no-free-reps.

Demo: read problem from screen -> wander to YouTube, get side-eyed -> climb two rungs -> judge begs for the answer, refused -> architecture slide.