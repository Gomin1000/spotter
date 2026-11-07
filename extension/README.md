# Spotter Chrome extension

A thin wrapper around the Spotter web app. It opens Spotter in Chrome's side panel next to the problem and adds a **Read this page** button. The web app is still the real product.

## Load it

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder (the one with `manifest.json`).
4. Pin Spotter from the puzzle-piece menu, then click its icon to open the side panel.

It loads the deployed app (https://fallhacks-2026.vercel.app). To use your local `npm run dev` instead, tick **Dev: use localhost** at the bottom of the panel (saved in `chrome.storage.local`).

After editing files here, click the reload icon on the Spotter card in `chrome://extensions` and reopen the panel.

## Use it

Open a problem (Codeforces, LeetCode, Kattis, or any page), open the side panel, and click **Read this page**. It sends, in this order of preference:

- the text you have selected (not on LeetCode or Codeforces, where a selection is usually code in the editor), else
- the problem statement (Codeforces `.problem-statement`, LeetCode `[data-track-load="description_content"]`, Kattis `.problembody`), else
- the page's whole text (max 20,000 characters),

plus the page URL and title. On LeetCode problem pages it waits up to 3 s for the description to render and also sends the problem title and difficulty (Easy / Medium / Hard). The app receives it as a `{ type: "spotter:problem", text, url, title, difficulty? }` message (see `lib/useExtensionBridge.ts`) and reads the problem.

## Notes

- App URLs are `PROD_URL` and `DEV_URL` at the top of `sidepanel.js`. The postMessage target origin follows whichever one is loaded.
- Nothing depends on the extension ID (unpacked IDs differ per computer); the app accepts any `chrome-extension://` sender.
- The download on /install is `public/spotter-extension.zip`. Rebuild it with `npm run zip-extension` after changing files here.
- Codeforces, LeetCode and open.kattis.com are in `host_permissions`, so they always work. Other sites use `activeTab`, which only grants access after you click the Spotter toolbar icon on that tab; if reading fails there, click the icon on that tab and try again. Chrome never allows `chrome://` pages or the Chrome Web Store.
- Status line: "Reading page…" while working, then green "✓ Read: <title>" when the app confirms, or red "✗ <reason>".
