# appmetrics-dash-hapi

Adaptation of [appmetrics-dash](https://github.com/RuntimeTools/appmetrics-dash) for Hapi.js. It serves a live dashboard of Node.js application metrics.

## Install

```bash
yarn add appmetrics-dash-hapi
# or
npm install appmetrics-dash-hapi --save
```

## Usage

Pass your Hapi server to `monitor`. The dashboard is served at `/appmetrics-dash` by default.

```js
const Hapi = require('hapi');
const appmetrics = require('appmetrics-dash-hapi');

const server = new Hapi.Server({ port: 3000 });

appmetrics.monitor({ server });

server.start();
```

Options: `server` (required), `url` (default `/appmetrics-dash/{param*}`), `title`, `docs`, `socketIo`, `appmetrics`.

## Scripts

```bash
yarn lint             # eslint index.js test/
yarn format:check     # prettier --check
yarn test             # mocha test suite
yarn test:coverage    # tests with nyc coverage (80% gate)
```

## CI

`.github/workflows/validate.yml` runs the shared PR validation from `juninmd/base-actions`. `ci.yml` runs lint, format check, tests on Node 16/18/20, and build. `codeql.yml` runs CodeQL on JavaScript.
