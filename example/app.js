const Hapi = require('hapi');
const server = new Hapi.Server();
server.connection({ port: 3000 });

const appmetrics = require('../index');
appmetrics.monitor({ server: server })

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