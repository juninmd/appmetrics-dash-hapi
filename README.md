# appmetrics-dash-hapi

Adaptation of [appmetrics-dash](https://github.com/RuntimeTools/appmetrics-dash) for Hapi.js.

Provides a real-time monitoring dashboard for Node.js applications using Hapi.js, displaying CPU, memory, garbage collection, HTTP request latency, and other application metrics.

## Install

```sh
npm install appmetrics-dash-hapi --save
```

or with yarn:

```sh
yarn add appmetrics-dash-hapi
```

## Prerequisites

- Node.js >= 8.0.0
- Hapi.js v16.x

## Quick Start

```js
const Hapi = require('hapi');
const server = new Hapi.Server();

server.connection({
    port: 3000,
    host: 'localhost'
});

const appmetrics = require('appmetrics-dash-hapi');

appmetrics.monitor({ server: server });

server.register([], (err) => {
    if (err) {
        console.error('Failed to load plugin:', err);
        throw err;
    }

    server.route({
        method: 'GET',
        path: '/hello',
        handler: function (request, reply) {
            reply('Hello, world!');
        }
    });

    server.start((err) => {
        if (err) {
            console.error('Server failed to start:', err);
            throw err;
        }
        console.log('Server running at:', server.info.uri);
    });
});
```

Open http://localhost:3000/appmetrics-dash/ in your browser to see the dashboard.

## API

### `monitor(options)`

Initializes the appmetrics dashboard on a Hapi.js server.

**Parameters:**

| Option   | Type   | Default                                                    | Description                        |
|----------|--------|------------------------------------------------------------|------------------------------------|
| `server` | Object | *required*                                                 | Your Hapi.js server instance       |
| `url`    | String | `/appmetrics-dash/{param*}`                                | URL path for the dashboard         |
| `title`  | String | `Application Metrics for Node.js`                          | Dashboard page title               |
| `docs`   | String | `https://developer.ibm.com/node/application-metrics-node-js/` | Link to documentation          |

**Returns:** The Hapi.js server instance.

## Security Considerations

- The dashboard exposes sensitive application metrics. **Do not expose it publicly** in production. Use firewall rules, reverse proxy access controls, or bind the server to `localhost` only.
- When binding to `localhost`, external clients cannot reach the dashboard. For production, consider running the metrics server on a separate internal port with restricted access.
- Always validate and sanitize any user-supplied options passed to `monitor()`.
- The dashboard should be disabled or restricted in production environments that handle sensitive data, unless proper authentication and authorization are implemented.
- Keep all dependencies up to date to avoid known vulnerabilities.

## Example

A complete working example is available in the [`example/`](./example) directory.

```sh
cd example
npm install
node app.js
```

## License

Apache-2.0
