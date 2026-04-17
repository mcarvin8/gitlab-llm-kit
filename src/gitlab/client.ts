import { GitlabHttpError } from "./errors.js";
import { encodeQuery } from "./query.js";

export type GitlabClientOptions = {
  /** Base URL including `/api/v4`, e.g. `https://gitlab.com/api/v4`. */
  baseUrl?: string;
  /** Private token (`PRIVATE-TOKEN` header) or OAuth bearer (`Authorization: Bearer`). */
  token: string;
  /** When true, use `Authorization: Bearer` instead of `PRIVATE-TOKEN`. */
  oauth?: boolean;
  /** Custom fetch (tests, proxies). Defaults to global fetch. */
  fetchFn?: typeof fetch;
};

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/api/v4") ? trimmed : `${trimmed}/api/v4`;
}

export class GitlabClient {
  readonly baseUrl: string;
  readonly token: string;
  readonly oauth: boolean;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GitlabClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? "https://gitlab.com/api/v4");
    this.token = options.token;
    this.oauth = options.oauth ?? false;
    this.fetchImpl = options.fetchFn ?? fetch;
  }

  private headers(): HeadersInit {
    return this.oauth
      ? { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" }
      : { "PRIVATE-TOKEN": this.token, "Content-Type": "application/json" };
  }

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    init?: { query?: Record<string, string | number | boolean | undefined>; body?: unknown },
  ): Promise<T> {
    const q = init?.query ? encodeQuery(init.query) : "";
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}${q}`;

    const res = await this.fetchImpl(url, {
      method,
      headers: this.headers(),
      body:
        init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new GitlabHttpError(`GitLab ${method} ${path} failed: ${res.status}`, {
        status: res.status,
        body: text,
      });
    }

    if (!text || text.trim().length === 0) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new GitlabHttpError(`GitLab ${method} ${path}: response was not JSON`, {
        status: res.status,
        body: text.slice(0, 2000),
      });
    }
  }

  /**
   * Like {@link request} but returns the response body as plain text (no JSON parse).
   * Used for endpoints such as `GET /projects/:id/jobs/:job_id/trace`.
   */
  async requestText(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    init?: { query?: Record<string, string | number | boolean | undefined>; body?: unknown },
  ): Promise<string> {
    const q = init?.query ? encodeQuery(init.query) : "";
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}${q}`;

    const res = await this.fetchImpl(url, {
      method,
      headers: this.headers(),
      body:
        init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new GitlabHttpError(`GitLab ${method} ${path} failed: ${res.status}`, {
        status: res.status,
        body: text,
      });
    }

    return text;
  }

  /** Page through GitLab list endpoints until a short page or empty result. */
  async requestAllPages<T>(
    path: string,
    query: Record<string, string | number | boolean | undefined> = {},
    maxPages = 100,
  ): Promise<T[]> {
    const perPage = Number(query.per_page ?? 100);
    const out: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const chunk = await this.request<T[]>("GET", path, {
        query: { ...query, page, per_page: perPage },
      });
      if (!Array.isArray(chunk) || chunk.length === 0) {
        break;
      }
      out.push(...chunk);
      if (chunk.length < perPage) {
        break;
      }
    }
    return out;
  }
}
