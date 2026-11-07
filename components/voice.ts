// Spotter's voice for loading states and errors.
export const LOADING_LINES = [
  "Chalking up…",
  "Loading the bar…",
  "Adjusting the bench…",
  "Racking the plates…",
  "Checking your form…",
  "Tightening the belt…",
];

export const ERROR_LINES = {
  read: "Pulled a hamstring reading that. Try again, or paste the text.",
  notFound: "I don't see a problem there. Open the statement and try again.",
  hint: "Dropped the bar on that one. Hit Spot me again.",
  rating: "Couldn't find the scale. Try Reveal weight again.",
  network: "Lost my grip on the server. Give it another rep.",
} as const;
