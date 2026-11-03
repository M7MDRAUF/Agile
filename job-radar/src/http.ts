const USER_AGENT = "job-radar/1.0 (personal job alert; +https://github.com)";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

/** GET/POST JSON with a timeout and retries on network errors, 429 and 5xx. */
export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  { timeoutMs = 45_000, retries = 2, retryDelayMs = 1_500 }: FetchOptions = {},
): Promise<T> {
  let lastError: Error = new Error("unknown error");
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { "user-agent": USER_AGENT, accept: "application/json", ...init.headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) return (await response.json()) as T;
      lastError = new Error(`HTTP ${response.status} for ${new URL(url).hostname}`);
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable) throw Object.assign(lastError, { fatal: true });
    } catch (error) {
      lastError = error as Error;
      if ((error as { fatal?: boolean }).fatal) throw lastError;
    }
    if (attempt < retries) await sleep(retryDelayMs * 2 ** attempt);
  }
  throw lastError;
}

/** Maps with bounded concurrency; never rejects (each result carries its own error). */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<Array<{ ok: true; value: R } | { ok: false; error: Error }>> {
  const results: Array<{ ok: true; value: R } | { ok: false; error: Error }> = new Array(
    items.length,
  );
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { ok: true, value: await fn(items[index] as T) };
      } catch (error) {
        results[index] = { ok: false, error: error as Error };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
