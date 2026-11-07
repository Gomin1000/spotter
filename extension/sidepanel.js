// Spotter side panel: hosts the web app in an iframe and sends it the problem text.
const APP_URL = "http://localhost:3000/dev";
const APP_ORIGIN = new URL(APP_URL).origin;
const MAX_CHARS = 20000;

const frame = document.getElementById("app");
const button = document.getElementById("read");
const status = document.getElementById("status");

frame.src = APP_URL;

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
  if (e.origin !== APP_ORIGIN || e.source !== frame.contentWindow) return;
  const d = e.data;
  if (!d || d.type !== "spotter:read-result") return;
  if (d.ok) finish(`✓ Read: ${d.title || "problem"}`, "ok");
  else finish(`✗ ${d.message || "No problem found on that page."}`, "error");
});

// Runs inside the active tab. Must be self-contained (no outer variables).
function extractProblem(maxChars) {
  const selected = String(window.getSelection() || "").trim();
  let text = selected;
  if (!text) {
    const selectors = [
      ".problem-statement", // Codeforces
      '[data-track-load="description_content"]', // LeetCode
      ".problembody", // Kattis
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim()) {
        text = el.innerText.trim();
        break;
      }
    }
  }
  if (!text) text = (document.body?.innerText || "").trim();
  return { text: text.slice(0, maxChars), url: location.href, title: document.title };
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
      { type: "spotter:problem", text: data.text, url: data.url, title: data.title },
      APP_ORIGIN,
    );
    // Stay on "Reading page…" until the app replies.
    replyTimer = setTimeout(
      () => finish("✗ No reply from Spotter. Is the app running at " + APP_ORIGIN + "?", "error"),
      REPLY_TIMEOUT_MS,
    );
  } catch (error) {
    console.error("Spotter: read failed", error);
    finish(`✗ ${error?.message || String(error)}`, "error");
  }
});
