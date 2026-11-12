# appmetrics-dash-hapi

**Hapi.js adapter for [`appmetrics-dash`](https://github.com/RuntimeTools/appmetrics-dash), built to serve the live Node.js metrics dashboard from inside an existing Hapi server.**

The adapter is meant to register the dashboard's static assets, open a Socket.IO channel on the server's listener, and stream CPU, memory, GC, event-loop, HTTP and probe metrics to the browser.

[![npm version](https://img.shields.io/npm/v/appmetrics-dash-hapi.svg)](https://www.npmjs.com/package/appmetrics-dash-hapi)

> [!WARNING]
> **The code at HEAD does not run on the Hapi version it declares.** `package.json` pins `hapi@18.1.0`, but `monitor()` still calls the Hapi 16 callback API (`server.register(plugin, callback)`) and uses the pre-17 `reply.continue()` response API. On Hapi 18 the first call throws before any route is registered; the response hook would fail with a 500 even if registration succeeded. Details and evidence are in [Compatibility](#compatibility).

## Install

```sh
npm install appmetrics-dash-hapi
```

The npm registry serves version `1.0.5`, which is an older implementation pinned to `hapi@16.0.0` and `inert@4.2.1`. It is not the same code as this branch — see [Compatibility](#compatibility).

## Usage

The call site is the same for both Hapi generations; only the adapter internals differ.

```js
const Hapi = require('hapi');
const { monitor } = require('appmetrics-dash-hapi');

const server = new Hapi.Server({ port: 3000 });

monitor({ server });

server.route({
  method: 'GET',
  path: '/',
  handler: () => 'ok'
});

server.start()
  .then(() => console.log(`Dashboard: ${server.info.uri}/appmetrics-dash/`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
```

On the declared Hapi 18 this snippet stops at `monitor({ server })`. Fixing it requires porting the adapter, not changing the call.

The bundled `example/app.js` uses the pre-Hapi-17 constructors (`server.connection({ port: 3000 })` and a `server.start(callback)`), so it is not a working example for Hapi 17+ either.

## Compatibility

| Declared | Value |
|---|---|
| Hapi | `hapi@18.1.0` (exact pin) |
| Static file plugin | `inert@5.1.3` (exact pin) |
| Node.js | `engines: { "node": ">=8.0.0" }` |
| Node.js used in CI | 16, 18 and 20 (test matrix); `NODE_VERSION` and `.node-version` are 18 |

What actually happens on Hapi 18.1.0, verified against the code in this repository:

1. **Registration throws.** `module.exports.monitor` calls `options.server.register(Inert, callback)`. Hapi 18's `register(plugins, options)` validates the second argument as an options object and throws `Invalid register options  "value" must be an object`. The dashboard route is never added, and the `try/catch` that would log a registration failure lives inside the callback that never runs.
2. **The response hook throws.** `addSecurityHeaders()` registers `server.ext('onPreResponse', (request, reply) => reply.continue())`. Since Hapi 17, the handler receives `(request, h)`; `reply` is undefined, so every response becomes `500 Internal Server Error`.

The test suite does not catch either problem: the unit and integration tests pass mock servers whose `register` accepts `(plugin, callback)` and whose `ext` is a stub. The security tests call `monitor()` only to assert that it throws when `server` is missing.

The published `1.0.5` tarball is a different file: it pins `hapi@16.0.0`, `inert@4.2.1` and `appmetrics-dash@^3.4.0`, and its callback-style calls match Hapi 16. Treat the repository and the npm package as separate artifacts until the adapter is ported.

## Options

| Option | Required | Default | Meaning |
|---|---|---|---|
| `server` | yes | — | Hapi server instance. Needs `register`, `route`, `ext` and `listener`. |
| `url` | no | `/appmetrics-dash/{param*}` | Route path for the dashboard. Sanitized: `..` or characters outside `A-Z a-z 0-9 - _ . / { } * @ : ~` fall back to the default. |
| `title` | no | `Application Metrics for Node.js` | Title sent to the dashboard over the socket. |
| `docs` | no | `https://developer.ibm.com/node/application-metrics-node-js/` | Documentation link sent to the dashboard. |
| `socketIo` | no | `require('socket.io')` | Factory called as `socketIo(server.listener)`; inject a compatible implementation in tests or when you already own the Socket.IO server. |
| `appmetrics` | no | `require('appmetrics')` | Module with `monitor()` and `writeSnapshot()`; useful for stubbing the native addon. |

`monitor()` returns nothing. It throws when the options object or `server` is missing:

```text
A valid options object with a server property is required
```

If registering `inert` fails in the callback-style API (for example, because the plugin is already registered), the error is printed with `console.log` and `monitor()` returns without a dashboard.

## What it serves

- **Dashboard route.** A single `GET` route (default `/appmetrics-dash/{param*}`) using inert's directory handler pointed at `public/` inside the installed `appmetrics-dash` package. Directory listing is disabled, so only real asset paths are served. The dashboard is `index.html` plus its JS/CSS assets.
- **Socket.IO.** Attached to `server.listener`, with the same origin as your application.
- **Static data on connect.** The socket receives the title/docs pair, the current profiling status, and a filtered environment summary (command line, hostname, OS architecture, number of processors).
- **Live metrics every 2000 ms.** CPU (with running means), memory, event loop, GC duration and max heap, aggregate HTTP/HTTPS inbound and outbound timings, per-URL average/longest response times, and probe events for MongoDB, Express, Socket.IO, Redis, MySQL, Postgres, Riak and Leveldown.
- **Controls.** The dashboard can toggle profiling, request a Node report (when `appmetrics` exposes `getNodeReport()`) and write a heap snapshot through `appmetrics.writeSnapshot()`; the reported location is built from `process.cwd()` and the filename returned by appmetrics.

## Security behavior

The adapter adds its own guards on top of whatever your Hapi server already does:

- **Response headers.** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and `X-XSS-Protection: 1; mode=block` are added on both normal responses and Boom errors — via the Hapi 16 hook described in [Compatibility](#compatibility).
- **Socket connection limit.** 20 connections per client IP per 60-second window; above that the socket receives an error and is disconnected. The map is cleaned up on the same interval with `unref()`.
- **Event allowlist.** Incoming socket events are limited to `connected`, `enableprofiling`, `disableprofiling`, `nodereport` and `heapdump`; anything else is dropped before reaching a handler.
- **Route path sanitization.** `sanitizeUrlPath()` rejects traversal sequences and unsafe characters by falling back to the default path.

There is **no authentication and no authorization** on the dashboard or the socket. Anyone who can reach the route can read process metrics, toggle profiling and request heap dumps. Put it behind your auth proxy or bind it to an internal interface; do not expose it on a public listener.

The module also exports helpers: `sanitizeUrlPath`, `sanitizeError`, `isRateLimited`, `ALLOWED_SOCKET_EVENTS`, `CONNECTION_RATE_LIMIT`, `CONNECTION_WINDOW_MS`, `buildCorsOptions` and `getSecurityHeaders`. `buildCorsOptions()` is exported and tested but is **not** wired into `monitor()`; the adapter does not configure CORS for you.

## Development

```sh
yarn install
yarn lint             # eslint index.js test/
yarn format:check     # prettier --check '**/*.js' '**/*.json' '**/*.md'
yarn test             # pretest = lint, then mocha 'test/**/*.test.js' --timeout 10000
yarn test:coverage    # nyc with 80% branch/line/function/statement gate on index.js
yarn build            # no-op: echo 'No build step required'
```

CI installs with `yarn`, while the repository also commits a `pnpm-lock.yaml` and declares `packageManager: pnpm@10.34.5`. The coverage gate applies to `index.js` only (`test/`, `example/` and `coverage/` are excluded).

`test/test.js` contains the security-helper tests, but the Mocha glob is `test/**/*.test.js`; a file named `test/test.js` does not match that pattern and is not executed by `yarn test`.

## Tests and CI

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | push on `main`/`develop`, PR on `main` | Lint, Prettier check, non-blocking `yarn audit`; tests on Node 16/18/20 with Codecov; Snyk scan (non-blocking); `yarn build` plus artifact upload; `npm publish` on a push to `main` using `NPM_TOKEN` |
| `validate.yml` | PR, push on `master` | Shared validation from `juninmd/base-actions` with `node-version: '18'` |
| `codeql.yml` | push on `main`/`develop`, PR on `main` | CodeQL for JavaScript |
| `sast.yml` | push on `main`/`master`, manual | Shared SAST with `fail-semgrep: false` |
| `security.yml` | push on `master`, weekly cron | Shared security scan |
| `dependabot-auto-merge.yml` | `pull_request_target` | Auto-merge for Dependabot PRs when all checks pass |

`ci.yml` does not trigger on `master`, which is the repository's default branch; neither the CI jobs nor the `npm publish` step run there. Only `validate.yml` covers pushes to `master`.

## Limitations

- **Version mismatch, not a runtime option.** HEAD cannot serve the dashboard on Hapi 18. The callbacks, `reply.continue()`, and the dependence on `server.listener` all come from the Hapi 16 era.
- **No auth layer.** Metrics, profiling and heap dumps are available to anyone who reaches the route.
- **Live only.** No history, retention or persistence; buffers live in process memory and are reset on restart.
- **Module-level state.** `io`, the latest events, aggregation buffers and the profiling flag are module variables, so two `monitor()` calls in one process share aggregation state.
- **Memory growth without a consumer.** Per-URL timing data (`httpURLData`) accumulates for every distinct URL and is never pruned. Probe aggregates are reset after each 2-second emit.
- **Native dependency.** `appmetrics` is a native addon and must build for your Node version; that is also why the tests inject a stub.
- **Unverified modern Node.** The declared engine is `>=8.0.0` and CI stops at Node 20; Node 22/24 are not covered by the repository's matrix.

## Links

- [Repository](https://github.com/juninmd/appmetrics-dash-hapi)
- [Issues](https://github.com/juninmd/appmetrics-dash-hapi/issues)
- [appmetrics-dash upstream](https://github.com/RuntimeTools/appmetrics-dash)

## License

`package.json` declares Apache-2.0, but the repository has **no `LICENSE` file**. The npm registry metadata for the published `1.0.5` reports ISC, so the two artifacts also disagree on licensing.
