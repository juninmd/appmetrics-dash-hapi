# appmetrics-dash-hapi
Adaptation of (appmetrics-dash) for Hapi

[https://github.com/RuntimeTools/appmetrics-dash](https://github.com/RuntimeTools/appmetrics-dash)


## Install
```
    yarn add appmetrics-dash-hapi
```

## Example

```
    const Hapi = require('hapi');
    const server = new Hapi.Server();
    server.connection({ port: 3000 });

    // Add Here
    const appmetrics = require('../index');
    appmetrics.monitor({ server: server })
    // End

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