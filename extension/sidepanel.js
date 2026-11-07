// Spotter side panel: hosts the web app in an iframe and sends it the problem text.
const APP_URL = "http://localhost:3000/dev";
const APP_ORIGIN = new URL(APP_URL).origin;
const MAX_CHARS = 20000;

const frame = document.getElementById("app");
const button = document.getElementById("read");
const status = document.getElementById("status");

frame.src = APP_URL;

function setStatus(text) {
  status.textContent = text;
  status.title = text;
}

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
  setStatus("Reading the page…");
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
    setStatus(`Sent: ${data.title || data.url}`);
  } catch (error) {
    console.error("Spotter: read failed", error);
    const msg = String(error?.message || error);
    setStatus(
      /cannot access|permission|chrome:\/\//i.test(msg)
        ? "Can't read this page. Click the Spotter toolbar icon on the problem tab, then try again."
        : msg,
    );
  } finally {
    button.disabled = false;
  }
});
