// Spotter side panel: hosts the web app in an iframe and sends it the problem text.
// Works with any extension ID (unpacked IDs differ per computer): the app only checks
// that messages come from a chrome-extension:// origin.
const PROD_URL = "https://fallhacks-2026.vercel.app";
const DEV_URL = "http://localhost:3000";
const STORAGE_KEY = "useLocalhost";
const MAX_CHARS = 20000;

const frame = document.getElementById("app");
const button = document.getElementById("read");
const status = document.getElementById("status");
const devToggle = document.getElementById("dev");

// Origin of whichever app URL is loaded; used as the postMessage targetOrigin.
let appOrigin = new URL(PROD_URL).origin;

function loadApp(useLocalhost) {
  const url = useLocalhost ? DEV_URL : PROD_URL;
  appOrigin = new URL(url).origin;
  devToggle.checked = useLocalhost;
  frame.src = url;
  setStatus("");
}

chrome.storage.local
  .get(STORAGE_KEY)
  .then((data) => loadApp(data[STORAGE_KEY] === true))
  .catch(() => loadApp(false));

devToggle.addEventListener("change", () => {
  const on = devToggle.checked;
  chrome.storage.local.set({ [STORAGE_KEY]: on }).catch(() => {});
  finish("", "working");
  loadApp(on);
});

const REPLY_TIMEOUT_MS = 60000;
let replyTimer = null;

// kind: "working" | "ok" | "error"
function setStatus(text, kind = "working") {
  status.textContent = text;
  status.title = text;
  status.className = kind;
}

function finish(text, kind) {
  clearTimeout(replyTimer);
  replyTimer = null;
  setStatus(text, kind);
  button.disabled = false;
}

// The web app replies { type: "spotter:read-result", ok, title, message } after readProblem().
window.addEventListener("message", (e) => {
  if (e.origin !== appOrigin || e.source !== frame.contentWindow) return;
  const d = e.data;
  if (!d || d.type !== "spotter:read-result") return;
  if (d.ok) finish(`✓ Read: ${d.title || "problem"}`, "ok");
  else finish(`✗ ${d.message || "No problem found on that page."}`, "error");
});

// Runs inside the active tab. Must be self-contained (no outer variables).
async function extractProblem(maxChars) {
  const LC_DESCRIPTION = '[data-track-load="description_content"]';
  const isLeetCode =
    /(^|\.)leetcode\.(com|cn)$/.test(location.hostname) && /^\/problems\/[^/]+/.test(location.pathname);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const visibleText = (el) => (el && el.innerText ? el.innerText.trim() : "");

  // LeetCode renders the description late: wait up to 3 s for it.
  if (isLeetCode) {
    for (let waited = 0; waited < 3000 && !visibleText(document.querySelector(LC_DESCRIPTION)); waited += 200) {
      await sleep(200);
    }
  }

  let title = document.title;
  let difficulty;
  if (isLeetCode) {
    const slug = location.pathname.split("/")[2];
    const titleEl =
      document.querySelector(`a[href="/problems/${slug}/"]`) ||
      document.querySelector(`a[href^="/problems/${slug}"]`);
    title = visibleText(titleEl) || document.title.replace(/\s*-\s*LeetCode\s*$/i, "");

    // Difficulty: LeetCode uses classes like text-difficulty-medium.
    const byClass = document.querySelector('[class*="text-difficulty-"]');
    const m = byClass && String(byClass.className).match(/text-difficulty-(easy|medium|hard)/i);
    if (m) difficulty = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();

    // Otherwise: an element whose text is exactly Easy / Medium / Hard, near the title.
    if (!difficulty && titleEl) {
      let scope = titleEl;
      for (let i = 0; i < 4 && scope.parentElement; i++) scope = scope.parentElement;
      for (const el of scope.querySelectorAll("div, span, p")) {
        const t = el.children.length === 0 ? (el.textContent || "").trim() : "";
        if (t === "Easy" || t === "Medium" || t === "Hard") {
          difficulty = t;
          break;
        }
      }
    }
  }

  const selected = String(window.getSelection() || "").trim();
  let text = selected;
  if (!text) {
    const selectors = [
      ".problem-statement", // Codeforces
      LC_DESCRIPTION, // LeetCode
      ".problembody", // Kattis
    ];
    for (const sel of selectors) {
      const t = visibleText(document.querySelector(sel));
      if (t) {
        text = t;
        break;
      }
    }
    // LeetCode's description has no title; put it on top so the reader names the problem right.
    if (text && isLeetCode && title) text = `${title}${difficulty ? ` (${difficulty})` : ""}\n\n${text}`;
  }
  if (!text) text = (document.body?.innerText || "").trim();
  return { text: text.slice(0, maxChars), url: location.href, title, difficulty };
}

button.addEventListener("click", async () => {
  button.disabled = true;
  setStatus("Reading page…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab found.");
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractProblem,
      args: [MAX_CHARS],
    });
    const data = result?.result;
    if (!data?.text) throw new Error("That page has no readable text.");
    frame.contentWindow.postMessage(
      { type: "spotter:problem", text: data.text, url: data.url, title: data.title, difficulty: data.difficulty },
      appOrigin,
    );
    // Stay on "Reading page…" until the app replies.
    replyTimer = setTimeout(
      () => finish("✗ No reply from Spotter at " + appOrigin + ". Is it reachable?", "error"),
      REPLY_TIMEOUT_MS,
    );
  } catch (error) {
    console.error("Spotter: read failed", error);
    finish(`✗ ${error?.message || String(error)}`, "error");
  }
});
