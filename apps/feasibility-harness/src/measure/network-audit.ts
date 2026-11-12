/**
 * Network egress audit for the harness.
 *
 * Three layers, recorded separately because each has blind spots:
 *  1. A Content-Security-Policy (index.html) restricts every fetch, including
 *     from workers, to this origin and the declared model-asset hosts.
 *  2. A main-thread guard rejects any fetch/XHR that carries a request body
 *     or uses a method other than GET/HEAD. The harness never needs to send
 *     content, so any such call is a defect.
 *  3. Resource Timing entries list every main-thread request with its
 *     transfer size, distinguishing cold downloads from cache hits.
 *     Worker-initiated requests do not appear here; the CSP covers them.
 */

export const ALLOWED_ASSET_HOSTS = [
  "cdn.jsdelivr.net",
  "huggingface.co",
  "storage.googleapis.com",
] as const;

const ALLOWED_SUFFIXES = [".hf.co", ".huggingface.co", ".xethub.hf.co"];

export function isAllowedOrigin(url: URL): boolean {
  if (url.origin === location.origin) return true;
  if (url.protocol === "blob:" || url.protocol === "data:") return true;
  return (
    (ALLOWED_ASSET_HOSTS as readonly string[]).includes(url.hostname) ||
    ALLOWED_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))
  );
}

export type BlockedRequest = { readonly host: string; readonly method: string; readonly reason: "BODY" | "METHOD" | "HOST" };

const blocked: BlockedRequest[] = [];

export function blockedRequests(): readonly BlockedRequest[] {
  return blocked;
}

/** Install the main-thread egress guard once, before any adapter loads. */
export function installEgressGuard(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : null;
    const url = new URL(request ? request.url : String(input), location.href);
    const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
    const hasBody = init?.body != null || (request !== null && request.body !== null);
    const reason = hasBody ? "BODY" : !["GET", "HEAD"].includes(method) ? "METHOD" : !isAllowedOrigin(url) ? "HOST" : null;
    if (reason) {
      blocked.push({ host: url.hostname, method, reason });
      return Promise.reject(new TypeError(`egress blocked: ${reason}`));
    }
    return originalFetch(input, init);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const pending = new WeakMap<XMLHttpRequest, { url: URL; method: string }>();
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    pending.set(this, { url: new URL(String(url), location.href), method: method.toUpperCase() });
    return (originalOpen as (...args: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    const info = pending.get(this);
    const reason =
      body != null ? "BODY" : info && !["GET", "HEAD"].includes(info.method) ? "METHOD" : info && !isAllowedOrigin(info.url) ? "HOST" : null;
    if (reason) {
      blocked.push({ host: info?.url.hostname ?? "unknown", method: info?.method ?? "unknown", reason });
      throw new TypeError(`egress blocked: ${reason}`);
    }
    return originalSend.call(this, body);
  };
}

export type ResourceSummary = {
  readonly host: string;
  readonly requests: number;
  /** Bytes transferred over the network; 0 for cache hits or when cross-origin timing is hidden. */
  readonly transferBytes: number;
  readonly decodedBytes: number;
  readonly allowed: boolean;
};

/** Aggregate main-thread Resource Timing by host. Paths are omitted. */
export function summarizeResources(): ResourceSummary[] {
  const byHost = new Map<string, { requests: number; transferBytes: number; decodedBytes: number; allowed: boolean }>();
  for (const entry of performance.getEntriesByType("resource") as PerformanceResourceTiming[]) {
    const url = new URL(entry.name);
    const host = url.origin === location.origin ? "self" : url.hostname;
    const current = byHost.get(host) ?? { requests: 0, transferBytes: 0, decodedBytes: 0, allowed: isAllowedOrigin(url) };
    current.requests += 1;
    current.transferBytes += entry.transferSize;
    current.decodedBytes += entry.decodedBodySize;
    byHost.set(host, current);
  }
  return [...byHost.entries()].map(([host, value]) => ({ host, ...value })).sort((a, b) => b.decodedBytes - a.decodedBytes);
}

export type CspViolation = { readonly directive: string; readonly blockedHost: string };

const violations: CspViolation[] = [];

export function watchCspViolations(): void {
  document.addEventListener("securitypolicyviolation", (event) => {
    let blockedHost = event.blockedURI;
    try {
      blockedHost = new URL(event.blockedURI).hostname;
    } catch {
      // Non-URL values such as "inline" or "eval" are kept as-is.
    }
    violations.push({ directive: event.effectiveDirective, blockedHost });
  });
}

export function cspViolations(): readonly CspViolation[] {
  return violations;
}
