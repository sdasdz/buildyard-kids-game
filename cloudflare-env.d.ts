declare interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

declare interface D1Database {}

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
  };
}
