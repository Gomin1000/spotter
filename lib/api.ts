// Client-side API for Spotter. UI imports only from here.
import {
  MOCK_HINT_RESPONSE,
  MOCK_READ_PROBLEM_RESPONSE,
  MOCK_WATCH_RESPONSE,
  type HintRequest,
  type HintResponse,
  type ReadProblemRequest,
  type ReadProblemResponse,
  type WatchRequest,
  type WatchResponse,
} from "./contract";

export * from "./contract";

// Flip each to false once its route is live.
export const MOCK_READ = false;
export const MOCK_HINT = false;
export const MOCK_WATCH = true;

const MOCK_DELAY_MS = 800;

function mock<T>(value: T): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(structuredClone(value)), MOCK_DELAY_MS),
  );
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${url} failed: ${res.status} ${text}`.trim());
  }
  return (await res.json()) as T;
}

export function readProblem(req: ReadProblemRequest): Promise<ReadProblemResponse> {
  if (MOCK_READ) return mock(MOCK_READ_PROBLEM_RESPONSE);
  return post<ReadProblemResponse>("/api/read-problem", req);
}

export function getHint(req: HintRequest): Promise<HintResponse> {
  if (MOCK_HINT) return mock({ ...MOCK_HINT_RESPONSE, rung: req.rung });
  return post<HintResponse>("/api/hint", req);
}

export function watch(req: WatchRequest): Promise<WatchResponse> {
  if (MOCK_WATCH) return mock(MOCK_WATCH_RESPONSE);
  return post<WatchResponse>("/api/watch", req);
}
