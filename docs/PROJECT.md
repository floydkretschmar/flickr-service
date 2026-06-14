## Modules

| Module                                         | Summary                                                                                                                                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **src/index.ts**                               | Runtime composition root that loads environment values, creates the Express server, wires Flickr and photo services, configures CORS, registers `GET /photos/:albumId`, and starts listening.         |
| **src/server.ts**                              | Thin Express wrapper for CORS origin allow-listing, wildcard/no-origin handling, trust-proxy setup, per-route rate limiting, route registration, and startup logging.                                 |
| **src/controllers.ts**                         | Photo route controller with pagination defaults, `page >= 1` validation, and translation of photo service outcomes into `200`, `404`, `422`, and `500` responses.                                     |
| **src/photoService.ts**                        | Domain mapping layer that converts Flickr photoset payloads into public photo DTOs with formatted dates, numeric views, thumbnail metadata, bucket-backed full-resolution URLs, and Flickr fallbacks. |
| **src/flickrService.ts**                       | Flickr REST client for `flickr.photosets.getPhotos`, including API key, photoset id, requested extras, page number, and per-page count.                                                               |
| **environment.d.ts**                           | Process environment contract for port, rate limit, Flickr API settings, CORS origins, and the full-resolution image bucket base URL.                                                                  |
| **src/tests**                                  | Vitest unit tests for controller status behavior, Flickr URL construction, photo DTO mapping, CORS configuration, rate-limit registration, and server startup.                                        |
| **Dockerfile**                                 | Multi-stage Node image pinned to the reviewed Node 24 Alpine digest that installs dependencies, builds TypeScript, prunes development packages, exposes port `3000`, and runs `node build/index.js`.  |
| **fly.toml**                                   | Fly.io deployment config for the `flickr-service` app in `fra`, including HTTPS service settings, autoscaling-to-zero behavior, and non-secret runtime defaults.                                      |
| **.github/dependabot.yml**                     | Dependabot update intake for npm, Docker, and GitHub Actions with cooldown scheduling.                                                                                                                |
| **.github/workflows/pipeline.yml**             | CI/CD workflow for install, audit, format, build, coverage, and guarded Fly.io deployment.                                                                                                            |
| **.github/workflows/dependabot-automerge.yml** | No-checkout Dependabot automerge workflow that enables auto-merge only after approved update metadata and current-head CI checks pass.                                                                |
| **run.sh**                                     | Repository command wrapper for Codex hooks and environment setup; `test` runs coverage, `format` runs the maintained-file Prettier check, and `build` runs the TypeScript build.                      |
| **.codex**                                     | Local Codex agent, skill, MCP, RTK, safety-hook, and context-mode configuration for repository work.                                                                                                  |

## Runtime And Dependency Baseline

This section records the current runtime, package, Docker, and maintenance baseline for maintainers. The project does not use a custom repository policy verifier to enforce these specific versions; dependency updates are handled through Dependabot and the normal install, audit, format, build, and test gates.

| Item                     | Target                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Node                     | `24.16.0`                                                                                     |
| npm                      | `11.13.0`                                                                                     |
| `packageManager`         | `npm@11.13.0`                                                                                 |
| `engines.node`           | `24.16.0`                                                                                     |
| `.nvmrc`                 | `24.16.0`                                                                                     |
| Docker base              | `node:24.16.0-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0` |
| RTK bootstrap            | `v0.42.4`                                                                                     |
| `context-mode` bootstrap | `1.0.162`                                                                                     |
| `actions/checkout`       | `actions/checkout@v6`                                                                         |
| `actions/setup-node`     | `actions/setup-node@v6`                                                                       |
| Fly setup action         | `superfly/flyctl-actions/setup-flyctl@v1`                                                     |
| Dependabot metadata      | `dependabot/fetch-metadata@v3`                                                                |

Current direct production dependencies are `cors@2.8.6`, `dotenv@17.4.2`, `express@5.2.1`, `express-rate-limit@8.5.2`, and `moment@2.30.1`. Current direct development dependencies are `@types/cors@2.8.19`, `@types/express@5.0.6`, `@types/node@24.13.2`, `@vitest/coverage-v8@4.1.8`, `prettier@3.8.4`, `typescript@6.0.3`, `vitest@4.1.8`, and `vitest-mock-express@2.2.0`.

## Architectural conventions

- **HTTP surface**: The public API is `GET /photos/:albumId`. Query defaults are `page=1` and `limit=10`; invalid page numbers return `422`, empty result pages return `404`, and unexpected service failures return `500`.
- **Image URL behavior**: Public photo responses expose `picture.url` as the bucket-backed original image URL and `picture.fallback` as Flickr's large image URL.
- **Build and deployment**: The project is ESM TypeScript. Tests are excluded from production compile, emitted files go to `build`, Docker runs `build/index.js`, and the GitHub Actions pipeline deploys `main` to Fly.io after build and coverage.
