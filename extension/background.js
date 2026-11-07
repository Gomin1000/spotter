// Clicking the toolbar icon opens the Spotter side panel.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Spotter: setPanelBehavior failed", error));
