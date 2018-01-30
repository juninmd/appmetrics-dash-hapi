# appmetrics-dash-hapi
Adaptation of (appmetrics-dash) for Hapi

[https://github.com/RuntimeTools/appmetrics-dash](https://github.com/RuntimeTools/appmetrics-dash)


## Install
```
    yarn add appmetrics-dash-hapi
```
or
```
    npm install appmetrics-dash-hapi --save
```

## Example

```
    const Hapi = require('hapi');
    const server = new Hapi.Server();
    server.connection({ port: 3000 });

    // Add Here
    const appmetrics = require('appmetrics-dash-hapi');
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

## Finish

```
    http://localhost:3000/appmetrics-dash/
```