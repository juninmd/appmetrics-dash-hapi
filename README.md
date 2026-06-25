# appmetrics-dash-hapi

[![CI/CD Pipeline](https://github.com/juninmd/appmetrics-dash-hapi/actions/workflows/ci.yml/badge.svg)](https://github.com/juninmd/appmetrics-dash-hapi/actions/workflows/ci.yml)
[![CodeQL](https://github.com/juninmd/appmetrics-dash-hapi/actions/workflows/codeql.yml/badge.svg)](https://github.com/juninmd/appmetrics-dash-hapi/actions/workflows/codeql.yml)
[![codecov](https://codecov.io/gh/juninmd/appmetrics-dash-hapi/branch/main/graph/badge.svg)](https://codecov.io/gh/juninmd/appmetrics-dash-hapi)
[![npm version](https://img.shields.io/npm/v/appmetrics-dash-hapi.svg)](https://www.npmjs.com/package/appmetrics-dash-hapi)
[![License](https://img.shields.io/npm/l/appmetrics-dash-hapi.svg)](https://opensource.org/licenses/ISC)

Adaptation of [appmetrics-dash](https://github.com/RuntimeTools/appmetrics-dash) for Hapi.

## Install

```bash
yarn add appmetrics-dash-hapi
# or
npm install appmetrics-dash-hapi --save
```

## Example

```javascript
const Hapi = require('hapi');
const server = new Hapi.Server();
server.connection({ port: 3000 });

const appmetrics = require('appmetrics-dash-hapi');
appmetrics.monitor({ server: server });

server.register([], (err) => {
    server.route({
        method: 'GET',
        path: '/batata',
        handler: function (request, reply) {
            reply('Hello!');
        }
    });

    server.start((err) => {
        console.log(`Server running at: ${server.info.uri}`);
    });
});
```

Open in browser: `http://localhost:3000/appmetrics-dash/`

## API

### `monitor(options)`

| Option   | Type   | Default                        | Description                    |
|----------|--------|--------------------------------|--------------------------------|
| `server` | Object | _required_                     | Hapi server instance           |
| `url`    | String | `/appmetrics-dash/{param*}`    | Dashboard URL path             |
| `title`  | String | `Application Metrics for Node.js` | Dashboard page title        |
| `docs`   | String | IBM App Metrics URL            | Documentation link             |

## Development

```bash
git clone <repo-url>
cd appmetrics-dash-hapi
yarn install
yarn test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## CI/CD

This project uses GitHub Actions for automated CI/CD:

- **Lint** - ESLint + Prettier checks
- **Test** - Cross-version testing on Node 16/18/20 with coverage
- **Security** - CodeQL and Snyk vulnerability scanning
- **Deploy** - Automated npm publish on main branch commits

## License

ISC