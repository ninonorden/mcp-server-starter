import { createApp } from "./app.js";

/** Cloudflare Workers entry point. Set ALLOWED_ORIGINS in wrangler.toml [vars] if browsers call you. */
let app: ReturnType<typeof createApp> | undefined;

export default {
  fetch(request: Request, env: { ALLOWED_ORIGINS?: string }): Response | Promise<Response> {
    app ??= createApp({ allowedOrigins: env.ALLOWED_ORIGINS?.split(",").filter(Boolean) });
    return app.fetch(request);
  },
};
