## Modules

| Module                             | Summary                                                                                                                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **src/index.ts**                   | Runtime composition root that loads environment values, creates the Express server, wires Flickr and photo services, configures CORS, registers `GET /photos/:albumId`, and starts listening.         |
| **src/server.ts**                  | Thin Express wrapper for CORS origin allow-listing, wildcard/no-origin handling, trust-proxy setup, per-route rate limiting, route registration, and startup logging.                                 |
| **src/controllers.ts**             | Photo route controller with pagination defaults, `page >= 1` validation, and translation of photo service outcomes into `200`, `404`, `422`, and `500` responses.                                     |
| **src/photoService.ts**            | Domain mapping layer that converts Flickr photoset payloads into public photo DTOs with formatted dates, numeric views, thumbnail metadata, bucket-backed full-resolution URLs, and Flickr fallbacks. |
| **src/flickrService.ts**           | Flickr REST client for `flickr.photosets.getPhotos`, including API key, photoset id, requested extras, page number, and per-page count.                                                               |
| **environment.d.ts**               | Process environment contract for port, rate limit, Flickr API settings, CORS origins, and the full-resolution image bucket base URL.                                                                  |
| **src/tests**                      | Vitest unit tests for controller status behavior, Flickr URL construction, photo DTO mapping, CORS configuration, rate-limit registration, and server startup.                                        |
| **Dockerfile**                     | Multi-stage Node 22 Alpine image that installs dependencies, builds TypeScript, prunes development packages, exposes port `3000`, and runs `npm run start`.                                           |
| **fly.toml**                       | Fly.io deployment config for the `flickr-service` app in `fra`, including HTTPS service settings, autoscaling-to-zero behavior, and non-secret runtime defaults.                                      |
| **.github/workflows/pipeline.yml** | Main-branch CI/CD workflow that installs dependencies, builds TypeScript, runs coverage, and deploys to Fly.io with `flyctl`.                                                                         |
| **run.sh**                         | Repository command wrapper for Codex hooks and environment setup; `test` runs coverage, `format` runs the maintained-file Prettier check, and `build` runs the TypeScript build.                      |
| **.codex**                         | Local Codex agent, skill, MCP, RTK, safety-hook, and context-mode configuration for repository work.                                                                                                  |

## Architectural conventions

- **HTTP surface**: The public API is `GET /photos/:albumId`. Query defaults are `page=1` and `limit=10`; invalid page numbers return `422`, empty result pages return `404`, and unexpected service failures return `500`.
- **Image URL behavior**: Public photo responses expose `picture.url` as the bucket-backed original image URL and `picture.fallback` as Flickr's large image URL.
- **Build and deployment**: The project is ESM TypeScript. Tests are excluded from production compile, emitted files go to `build`, Docker runs `build/index.js`, and the GitHub Actions pipeline deploys `main` to Fly.io after build and coverage.
