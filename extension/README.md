# Spotter Chrome extension

A thin wrapper around the Spotter web app. It opens Spotter in Chrome's side panel next to the problem and adds a **Read this page** button. The web app is still the real product.

## Load it

1. Start the web app: `npm run dev` in the repo root (it must be on http://localhost:3000).
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick this `extension/` folder.
5. Pin Spotter from the puzzle-piece menu, then click its icon to open the side panel.

After editing files here, click the reload icon on the Spotter card in `chrome://extensions` and reopen the panel.

## Use it

Open a problem (Codeforces, LeetCode, Kattis, or any page), open the side panel, and click **Read this page**. It sends, in this order of preference:

- the text you have selected, else
- the problem statement (Codeforces `.problem-statement`, LeetCode `[data-track-load="description_content"]`, Kattis `.problembody`), else
- the page's whole text (max 20,000 characters),

plus the page URL and title. The app receives it as a `{ type: "spotter:problem", text, url, title }` message (see `lib/useExtensionBridge.ts`) and reads the problem.

## Notes

- The app URL is `APP_URL` at the top of `sidepanel.js` (default `http://localhost:3000/dev`). Change it to the deployed URL or `/` for the main page.
- `activeTab` only gives access to a tab after you click the Spotter toolbar icon on it. If **Read this page** says it can't read the page, click the icon on that tab again. It can't read `chrome://` pages or the Chrome Web Store.
