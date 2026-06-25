'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const { expect } = require('chai');

describe('appmetrics-dash-hapi', function () {
    let mockSocketIo;
    let mockInert;
    let mockAppmetrics;
    let mockMonitoring;
    let mockServer;
    let mockListener;
    let socketEmitSpy;
    let ioEmitSpy;
    let ioOnSpy;
    let setIntervalStub;
    let connectionCb;
    let mod;

    function buildMod() {
        return proxyquire('../../index', {
            'socket.io': mockSocketIo,
            inert: mockInert,
            appmetrics: mockAppmetrics,
            'appmetrics-dash': {}
        });
    }

    beforeEach(function () {
        connectionCb = null;
        socketEmitSpy = sinon.spy();
        ioEmitSpy = sinon.spy();
        ioOnSpy = sinon.stub();
        setIntervalStub = sinon.stub(global, 'setInterval').returns({ unref: sinon.stub() });

        mockSocketIo = sinon.stub();
        mockSocketIo.returns({
            emit: ioEmitSpy,
            on: sinon.stub().callsFake(function (event, cb) {
                if (event === 'connection') {
                    connectionCb = cb;
                }
            })
        });

        mockListener = { on: sinon.stub() };

        mockServer = {
            route: sinon.stub(),
            register: sinon.stub().callsFake(function (plugins, cb) { cb(); }),
            listener: mockListener
        };

        mockInert = {};

        mockMonitoring = {
            getEnvironment: sinon.stub().returns({}),
            on: sinon.stub(),
            enable: sinon.stub(),
            disable: sinon.stub(),
            getNodeReport: undefined
        };

        mockAppmetrics = {
            monitor: sinon.stub().returns(mockMonitoring),
            writeSnapshot: sinon.stub()
        };

        mod = buildMod();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('module setup', function () {
        it('should export monitor function', function () {
            expect(mod).to.have.property('monitor');
            expect(mod.monitor).to.be.a('function');
        });

        it('should register Inert plugin via server.register', function () {
            mod.monitor({ server: mockServer });
            expect(mockServer.register.calledOnce).to.be.true;
            expect(mockServer.register.firstCall.args[0]).to.deep.equal(mockInert);
        });

        it('should set up default route for appmetrics-dash', function () {
            mod.monitor({ server: mockServer });
            expect(mockServer.route.calledOnce).to.be.true;
            const route = mockServer.route.firstCall.args[0];
            expect(route.method).to.equal('GET');
            expect(route.path).to.equal('/appmetrics-dash/{param*}');
        });

        it('should use custom URL when provided', function () {
            mod.monitor({ server: mockServer, url: '/custom/{param*}' });
            expect(mockServer.route.firstCall.args[0].path).to.equal('/custom/{param*}');
        });

        it('should create socket.io connection with server listener', function () {
            mod.monitor({ server: mockServer });
            expect(mockSocketIo.calledOnce).to.be.true;
            expect(mockSocketIo.firstCall.args[0]).to.equal(mockListener);
        });

        it('should start appmetrics monitoring', function () {
            mod.monitor({ server: mockServer });
            expect(mockAppmetrics.monitor.calledOnce).to.be.true;
        });

        it('should listen for newListener events on the server listener', function () {
            mod.monitor({ server: mockServer });
            expect(mockListener.on.calledWith('newListener')).to.be.true;
        });
    });

    describe('socket.io connection handling', function () {
        beforeEach(function () {
            mod.monitor({ server: mockServer });
        });

        it('should respond with environment data on socket connection', function () {
            const envData = {
                'command.line': 'node index.js',
                'environment.HOSTNAME': 'test-host',
                'os.arch': 'x64',
                'number.of.processors': '4',
                'custom.unknown': 'ignored'
            };
            mockMonitoring.getEnvironment.returns(envData);
            mod = buildMod();
            mod.monitor({ server: mockServer });

            const mockSocket = { emit: socketEmitSpy, on: sinon.stub() };
            connectionCb(mockSocket);

            expect(socketEmitSpy.calledWith('environment')).to.be.true;
            const envJson = JSON.parse(socketEmitSpy.firstCall.args[1]);
            expect(envJson).to.be.an('array');
            expect(envJson.length).to.equal(4);
        });

        it('should emit title with defaults when not specified', function () {
            const mockSocket = { emit: socketEmitSpy, on: sinon.stub() };
            connectionCb(mockSocket);

            const titleCall = socketEmitSpy.args.find(a => a[0] === 'title');
            expect(titleCall).to.exist;
            const titleJson = JSON.parse(titleCall[1]);
            expect(titleJson.title).to.equal('Application Metrics for Node.js');
            expect(titleJson.docs).to.include('developer.ibm.com');
        });

        it('should use custom title and docs when provided', function () {
            mod = buildMod();
            mod.monitor({ server: mockServer, title: 'My Metrics', docs: 'https://docs.com' });

            const mockSocket = { emit: socketEmitSpy, on: sinon.stub() };
            connectionCb(mockSocket);

            const titleCall = socketEmitSpy.args.find(a => a[0] === 'title');
            expect(JSON.parse(titleCall[1]).title).to.equal('My Metrics');
            expect(JSON.parse(titleCall[1]).docs).to.equal('https://docs.com');
        });

        it('should re-emit static data on connected event', function () {
            const mockSocket = { emit: socketEmitSpy, on: sinon.stub() };
            connectionCb(mockSocket);

            const connectedCb = mockSocket.on.args.find(a => a[0] === 'connected');
            expect(connectedCb).to.exist;
            connectedCb[1]();

            const envCalls = socketEmitSpy.args.filter(a => a[0] === 'environment');
            expect(envCalls.length).to.equal(2);
        });

        it('should emit profiling_enabled false initially', function () {
            const mockSocket = { emit: socketEmitSpy, on: sinon.stub() };
            connectionCb(mockSocket);

            const statusCall = socketEmitSpy.args.find(a => a[0] === 'status');
            expect(JSON.parse(statusCall[1]).profiling_enabled).to.be.false;
        });

        it('should handle enableprofiling event', function () {
            const mockSocket = { emit: socketEmitSpy, on: sinon.stub() };
            connectionCb(mockSocket);

            const enableCb = mockSocket.on.args.find(a => a[0] === 'enableprofiling');
            enableCb[1]();

            expect(mockMonitoring.enable.calledWith('profiling')).to.be.true;
        });

        it('should broadcast status change on enableprofiling', function () {
            const mockSocket = { emit: socketEmitSpy, on: sinon.stub() };
            connectionCb(mockSocket);

            const enableCb = mockSocket.on.args.find(a => a[0] === 'enableprofiling');
            enableCb[1]();

            expect(ioEmitSpy.calledWith('status')).to.be.true;
            expect(JSON.parse(ioEmitSpy.args.find(a => a[0] === 'status')[1]).profiling_enabled).to.be.true;
        });

        it('should handle disableprofiling event', function () {
            const mockSocket = { emit: socketEmitSpy, on: sinon.stub() };
            connectionCb(mockSocket);

            const disableCb = mockSocket.on.args.find(a => a[0] === 'disableprofiling');
            disableCb[1]();

            expect(mockMonitoring.disable.calledWith('profiling')).to.be.true;
        });

        it('should handle heapdump event', function () {
            mockAppmetrics.writeSnapshot.callsFake(function (cb) {
                cb(null, 'heap-12345.heapsnapshot');
            });
            mod = buildMod();
            mod.monitor({ server: mockServer });

            const mockSocket = { emit: socketEmitSpy, on: sinon.stub() };
            connectionCb(mockSocket);

            const heapdumpCb = mockSocket.on.args.find(a => a[0] === 'heapdump');
            heapdumpCb[1]();

            const heapEmit = socketEmitSpy.args.find(a => a[0] === 'heapdump');
            expect(heapEmit[1].location).to.include('heap-12345.heapsnapshot');
        });

        it('should handle nodereport when module unavailable', function () {
            const mockSocket = { emit: socketEmitSpy, on: sinon.stub() };
            connectionCb(mockSocket);

            const reportCb = mockSocket.on.args.find(a => a[0] === 'nodereport');
            reportCb[1]();

            const reportEmit = socketEmitSpy.args.find(a => a[0] === 'nodereport');
            expect(reportEmit[1].error).to.equal('node reporting not available');
        });

        it('should handle nodereport when module available', function () {
            mockMonitoring.getNodeReport = sinon.stub().returns({ getReport: sinon.stub().returns({ hello: 'world' }) });
            mod = buildMod();
            mod.monitor({ server: mockServer });

            const mockSocket = { emit: socketEmitSpy, on: sinon.stub() };
            connectionCb(mockSocket);
            const reportCb = mockSocket.on.args.find(a => a[0] === 'nodereport');
            reportCb[1]();

            const reportEmit = socketEmitSpy.args.find(a => a[0] === 'nodereport');
            expect(reportEmit[1]).to.have.property('report');
            expect(reportEmit[1].report.hello).to.equal('world');
        });
    });

    describe('monitoring event handlers', function () {
        beforeEach(function () {
            mod.monitor({ server: mockServer });
        });

        it('should register all monitoring event types', function () {
            const events = [
                'cpu', 'memory', 'gc', 'profiling', 'loop',
                'http', 'https', 'http-outbound', 'https-outbound',
                'mongo', 'express', 'socketio', 'redis', 'mysql',
                'postgres', 'riak', 'leveldown'
            ];
            events.forEach(function (e) {
                expect(mockMonitoring.on.calledWith(e)).to.be.true;
            });
        });

        it('should aggregate HTTP events and emit on interval', function () {
            const httpHandler = mockMonitoring.on.args.find(a => a[0] === 'http')[1];
            httpHandler({ duration: 100, url: '/test', time: Date.now() });
            httpHandler({ duration: 200, url: '/test', time: Date.now() + 100 });
            setIntervalStub.firstCall.args[0]();

            const httpData = JSON.parse(ioEmitSpy.args.find(a => a[0] === 'http')[1]);
            expect(httpData.total).to.equal(2);
            expect(httpData.average).to.equal(150);
            expect(httpData.longest).to.equal(200);
        });

        it('should aggregate HTTPS events', function () {
            const handler = mockMonitoring.on.args.find(a => a[0] === 'https')[1];
            handler({ duration: 50, url: '/secure', time: Date.now() });
            setIntervalStub.firstCall.args[0]();
            expect(ioEmitSpy.calledWith('https')).to.be.true;
        });

        it('should aggregate multiple HTTPS events', function () {
            const handler = mockMonitoring.on.args.find(a => a[0] === 'https')[1];
            handler({ duration: 50, url: '/secure', time: 1 });
            handler({ duration: 150, url: '/secure2', time: 2 });
            setIntervalStub.firstCall.args[0]();
            const data = JSON.parse(ioEmitSpy.args.find(a => a[0] === 'https')[1]);
            expect(data.total).to.equal(2);
            expect(data.longest).to.equal(150);
        });

        it('should track https-urls with duplicate URLs', function () {
            const handler = mockMonitoring.on.args.find(a => a[0] === 'https')[1];
            handler({ duration: 50, url: '/secure', time: Date.now() });
            handler({ duration: 100, url: '/secure', time: Date.now() + 100 });
            setIntervalStub.firstCall.args[0]();
            const urlsData = JSON.parse(ioEmitSpy.args.find(a => a[0] === 'http-urls')[1]);
            const secureUrl = urlsData.find(function (u) { return u.url === '/secure'; });
            expect(secureUrl.hits).to.equal(2);
            expect(secureUrl.longestResponseTime).to.equal(100);
        });

        it('should aggregate http-outbound events', function () {
            const handler = mockMonitoring.on.args.find(a => a[0] === 'http-outbound')[1];
            handler({ duration: 30, url: 'http://ex.com', time: Date.now() });
            setIntervalStub.firstCall.args[0]();
            expect(ioEmitSpy.calledWith('http-outbound')).to.be.true;
        });

        it('should aggregate multiple http-outbound events', function () {
            const handler = mockMonitoring.on.args.find(a => a[0] === 'http-outbound')[1];
            handler({ duration: 30, url: 'http://ex.com', time: 1 });
            handler({ duration: 50, url: 'http://ex2.com', time: 2 });
            setIntervalStub.firstCall.args[0]();
            const data = JSON.parse(ioEmitSpy.args.find(a => a[0] === 'http-outbound')[1]);
            expect(data.total).to.equal(2);
            expect(data.longest).to.equal(50);
        });

        it('should aggregate https-outbound events', function () {
            const handler = mockMonitoring.on.args.find(a => a[0] === 'https-outbound')[1];
            handler({ duration: 40, url: 'https://ex.com', time: Date.now() });
            setIntervalStub.firstCall.args[0]();
            expect(ioEmitSpy.calledWith('https-outbound')).to.be.true;
        });

        it('should aggregate multiple https-outbound events', function () {
            const handler = mockMonitoring.on.args.find(a => a[0] === 'https-outbound')[1];
            handler({ duration: 40, url: 'https://ex.com', time: 1 });
            handler({ duration: 60, url: 'https://ex2.com', time: 2 });
            setIntervalStub.firstCall.args[0]();
            const data = JSON.parse(ioEmitSpy.args.find(a => a[0] === 'https-outbound')[1]);
            expect(data.total).to.equal(2);
            expect(data.longest).to.equal(60);
        });

        it('should track CPU data with mean calculations', function () {
            const handler = mockMonitoring.on.args.find(a => a[0] === 'cpu')[1];
            handler({ process: 0.5, system: 0.3 });
            handler({ process: 0.7, system: 0.4 });
            setIntervalStub.firstCall.args[0]();

            const cpuData = JSON.parse(ioEmitSpy.args.find(a => a[0] === 'cpu')[1]);
            expect(cpuData.processMean).to.equal(0.6);
            expect(cpuData.systemMean).to.equal(0.35);
        });

        it('should track memory data', function () {
            const handler = mockMonitoring.on.args.find(a => a[0] === 'memory')[1];
            handler({ used: 500, total: 1000 });
            setIntervalStub.firstCall.args[0]();
            const data = JSON.parse(ioEmitSpy.args.find(a => a[0] === 'memory')[1]);
            expect(data.used).to.equal(500);
        });

        it('should track GC data with time summary', function () {
            sinon.stub(process, 'uptime').returns(10);
            mod = buildMod();
            mod.monitor({ server: mockServer });

            const handler = mockMonitoring.on.args.find(a => a[0] === 'gc')[1];
            handler({ duration: 50, used: 800 });
            setIntervalStub.firstCall.args[0]();

            const gcData = JSON.parse(ioEmitSpy.args.find(a => a[0] === 'gc')[1]);
            expect(gcData.duration).to.equal(50);
            expect(gcData.usedHeapAfterGCMax).to.equal(800);
        });

        it('should emit profiling data immediately on event', function () {
            const handler = mockMonitoring.on.args.find(a => a[0] === 'profiling')[1];
            handler({ data: 'profile' });
            expect(ioEmitSpy.calledWith('profiling')).to.be.true;
        });

        it('should emit loop data', function () {
            const handler = mockMonitoring.on.args.find(a => a[0] === 'loop')[1];
            handler({ latency: 5 });
            setIntervalStub.firstCall.args[0]();
            expect(ioEmitSpy.calledWith('loop')).to.be.true;
        });

        it('should aggregate and emit probe events', function () {
            const mongoHandler = mockMonitoring.on.args.find(a => a[0] === 'mongo')[1];
            mongoHandler({ duration: 10, time: Date.now() });
            const expressHandler = mockMonitoring.on.args.find(a => a[0] === 'express')[1];
            expressHandler({ duration: 20, time: Date.now() });
            setIntervalStub.firstCall.args[0]();

            const probes = JSON.parse(ioEmitSpy.args.find(a => a[0] === 'probe-events')[1]);
            expect(probes).to.have.length(2);
            expect(probes[0].name).to.equal('MongoDB');
            expect(probes[1].name).to.equal('Express');
        });

        it('should aggregate all probe event types', function () {
            const events = {
                socketio: 'Socket.IO',
                redis: 'Redis',
                mysql: 'MySQL',
                postgres: 'Postgres',
                riak: 'Riak',
                leveldown: 'Leveldown'
            };
            Object.keys(events).forEach(function (key) {
                const handler = mockMonitoring.on.args.find(a => a[0] === key)[1];
                handler({ duration: 5, time: Date.now() });
            });
            setIntervalStub.firstCall.args[0]();

            const probes = JSON.parse(ioEmitSpy.args.find(a => a[0] === 'probe-events')[1]);
            expect(probes).to.have.length(Object.keys(events).length);
        });

        it('should aggregate duplicate probe events', function () {
            const mongoHandler = mockMonitoring.on.args.find(a => a[0] === 'mongo')[1];
            mongoHandler({ duration: 10, time: Date.now() });
            mongoHandler({ duration: 30, time: Date.now() });
            setIntervalStub.firstCall.args[0]();

            const probes = JSON.parse(ioEmitSpy.args.find(a => a[0] === 'probe-events')[1]);
            expect(probes).to.have.length(1);
            expect(probes[0].total).to.equal(2);
        });

        it('should emit http-urls data for HTTP events', function () {
            const httpHandler = mockMonitoring.on.args.find(a => a[0] === 'http')[1];
            httpHandler({ duration: 100, url: '/a', time: Date.now() });
            httpHandler({ duration: 200, url: '/b', time: Date.now() });
            setIntervalStub.firstCall.args[0]();
            expect(ioEmitSpy.calledWith('http-urls')).to.be.true;
        });

        it('should track http-urls with duplicate URLs', function () {
            const httpHandler = mockMonitoring.on.args.find(a => a[0] === 'http')[1];
            httpHandler({ duration: 100, url: '/popular', time: Date.now() });
            httpHandler({ duration: 200, url: '/popular', time: Date.now() + 100 });
            setIntervalStub.firstCall.args[0]();
            const urlsData = JSON.parse(ioEmitSpy.args.find(a => a[0] === 'http-urls')[1]);
            const popular = urlsData.find(function (u) { return u.url === '/popular'; });
            expect(popular.hits).to.equal(2);
            expect(popular.longestResponseTime).to.equal(200);
        });
    });

    describe('Inert registration errors', function () {
        it('should log error and stop when Inert registration fails', function () {
            var loggedMsg;
            var origLog = console.log;
            console.log = function (msg) { loggedMsg = msg; };

            mockServer.register = sinon.stub().callsFake(function (p, cb) {
                cb(new Error('Plugin not found'));
            });
            mod.monitor({ server: mockServer });

            expect(loggedMsg.message).to.equal('Plugin not found');
            expect(mockSocketIo.called).to.be.false;
            expect(mockServer.route.called).to.be.false;

            console.log = origLog;
        });
    });

    describe('newListener patching', function () {
        var handlers;

        beforeEach(function () {
            mod.monitor({ server: mockServer });
            handlers = mockListener.on.args.filter(function (a) { return a[0] === 'newListener'; }).map(function (a) { return a[1]; });
        });

        it('should patch request listeners on the server', function (done) {
            var remaining = handlers.length;
            handlers.forEach(function (handler) {
                var listener = function () {};
                listener.__dashboard_patched = false;
                handler('request', listener);
                process.nextTick(function () {
                    expect(listener.__dashboard_patched).to.be.true;
                    remaining -= 1;
                    if (remaining === 0) done();
                });
            });
        });

        it('should skip non-request events', function () {
            handlers.forEach(function (handler) {
                var listener = function () {};
                listener.__dashboard_patched = false;
                handler('other', listener);
                expect(listener.__dashboard_patched).to.be.false;
            });
        });

        it('should skip already patched listeners', function () {
            handlers.forEach(function (handler) {
                var listener = function () {};
                listener.__dashboard_patched = true;
                handler('request', listener);
                expect(listener.__dashboard_patched).to.be.true;
            });
        });
    });
});
