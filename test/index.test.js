'use strict';

const sinon = require('sinon');
const { expect } = require('chai');

describe('appmetrics-dash-hapi', () => {
    let moduleExports;
    let serverStub;
    let registerStub;
    let routeStub;
    let listenerStub;
    let ioStub;
    let socketIoFunc;
    let consoleLogStub;

    function createMockAppmetrics() {
        const monitoring = {
            on: sinon.stub(),
            getEnvironment: sinon.stub().returns({}),
            enable: sinon.stub(),
            disable: sinon.stub()
        };
        return {
            appmetrics: {
                monitor: sinon.stub().returns(monitoring),
                writeSnapshot: sinon.stub()
            },
            monitoring
        };
    }

    function createSocketIoStub() {
        const io = {
            emit: sinon.stub(),
            on: sinon.stub()
        };
        return {
            io,
            func: sinon.stub().returns(io)
        };
    }

    beforeEach(() => {
        routeStub = sinon.stub();
        listenerStub = {
            on: sinon.stub()
        };
        registerStub = sinon.stub().callsArgWith(1, null);

        serverStub = {
            register: registerStub,
            route: routeStub,
            listener: listenerStub
        };

        const ioResult = createSocketIoStub();
        ioStub = ioResult.io;
        socketIoFunc = ioResult.func;

        moduleExports = require('../index');
        consoleLogStub = sinon.stub(console, 'log');
    });

    afterEach(() => {
        sinon.restore();
        delete require.cache[require.resolve('../index')];
    });

    it('should export a monitor function', () => {
        expect(moduleExports).to.have.property('monitor');
        expect(moduleExports.monitor).to.be.a('function');
    });

    it('should call server.register when monitor is called', () => {
        registerStub.callsArgWith(1, null);
        const { appmetrics } = createMockAppmetrics();

        moduleExports.monitor({
            server: serverStub,
            appmetrics: appmetrics,
            socketIo: socketIoFunc
        });

        expect(registerStub.calledOnce).to.be.true;
    });

    it('should log error and return early when server.register fails', () => {
        const testError = new Error('Registration failed');
        registerStub.callsArgWith(1, testError);
        const { appmetrics } = createMockAppmetrics();

        moduleExports.monitor({
            server: serverStub,
            appmetrics: appmetrics,
            socketIo: socketIoFunc
        });

        expect(consoleLogStub.calledOnce).to.be.true;
        expect(consoleLogStub.firstCall.args[0]).to.equal(testError);
    });

    it('should configure route with default path', () => {
        registerStub.callsArgWith(1, null);
        const { appmetrics } = createMockAppmetrics();

        moduleExports.monitor({
            server: serverStub,
            appmetrics: appmetrics,
            socketIo: socketIoFunc
        });

        expect(routeStub.calledOnce).to.be.true;
        expect(routeStub.firstCall.args[0]).to.have.property('method', 'GET');
        expect(routeStub.firstCall.args[0].path).to.equal('/appmetrics-dash/{param*}');
    });

    it('should use custom url option for route', () => {
        registerStub.callsArgWith(1, null);
        const { appmetrics } = createMockAppmetrics();

        const customUrl = '/custom-dash/{param*}';
        moduleExports.monitor({
            server: serverStub,
            url: customUrl,
            appmetrics: appmetrics,
            socketIo: socketIoFunc
        });

        expect(routeStub.firstCall.args[0].path).to.equal(customUrl);
    });

    describe('Socket.IO events', () => {
        let socketStub;
        let appmetrics;
        let monitoring;

        beforeEach(() => {
            socketStub = {
                emit: sinon.stub(),
                on: sinon.stub()
            };
            ioStub.on.withArgs('connection').callsArgWith(1, socketStub);
            registerStub.callsArgWith(1, null);

            const mocks = createMockAppmetrics();
            appmetrics = mocks.appmetrics;
            monitoring = mocks.monitoring;
        });

        it('should emit environment and title on socket connection', () => {
            const envData = {
                'command.line': 'node app.js',
                'environment.HOSTNAME': 'test-host',
                'os.arch': 'x64',
                'number.of.processors': '4'
            };
            monitoring.getEnvironment.returns(envData);

            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            expect(socketStub.emit.calledWith('environment')).to.be.true;
            expect(socketStub.emit.calledWith('title')).to.be.true;
            expect(socketStub.emit.calledWith('status')).to.be.true;
        });

        it('should re-emit static data on connected event', () => {
            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            socketStub.emit.resetHistory();

            const connectedHandler = socketStub.on.withArgs('connected').firstCall.args[1];
            connectedHandler();

            expect(socketStub.emit.calledWith('environment')).to.be.true;
            expect(socketStub.emit.calledWith('title')).to.be.true;
            expect(socketStub.emit.calledWith('status')).to.be.true;
        });

        it('should enable profiling on enableprofiling event', () => {
            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            const enableHandler = socketStub.on.withArgs('enableprofiling').firstCall.args[1];
            enableHandler();

            expect(monitoring.enable.calledWith('profiling')).to.be.true;
            expect(ioStub.emit.calledWith('status')).to.be.true;
        });

        it('should disable profiling on disableprofiling event', () => {
            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            const disableHandler = socketStub.on.withArgs('disableprofiling').firstCall.args[1];
            disableHandler();

            expect(monitoring.disable.calledWith('profiling')).to.be.true;
            expect(ioStub.emit.calledWith('status')).to.be.true;
        });

        it('should handle nodereport when node-report is not available', () => {
            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            const nodereportHandler = socketStub.on.withArgs('nodereport').firstCall.args[1];
            nodereportHandler();

            expect(socketStub.emit.calledWith('nodereport')).to.be.true;
            const args = socketStub.emit.withArgs('nodereport').firstCall.args[1];
            expect(args).to.have.property('error');
            expect(args.error).to.equal('node reporting not available');
        });

        it('should handle heapdump event', () => {
            appmetrics.writeSnapshot.callsArgWith(0, null, 'heap.heapdump');

            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            const heapdumpHandler = socketStub.on.withArgs('heapdump').firstCall.args[1];
            heapdumpHandler();

            expect(appmetrics.writeSnapshot.calledOnce).to.be.true;
        });
    });

    describe('Monitoring events', () => {
        let clock;
        let appmetrics;
        let monitoring;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            registerStub.callsArgWith(1, null);
            const mocks = createMockAppmetrics();
            appmetrics = mocks.appmetrics;
            monitoring = mocks.monitoring;
        });

        afterEach(() => {
            clock.restore();
        });

        it('should emit data on each monitoring event via setInterval', () => {
            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            const cpuHandler = monitoring.on.withArgs('cpu').firstCall.args[1];
            cpuHandler({ process: 0.5, system: 0.3, time: Date.now() });

            const memHandler = monitoring.on.withArgs('memory').firstCall.args[1];
            memHandler({ physical_total: 8192, physical_used: 4096, time: Date.now() });

            clock.tick(2000);

            expect(ioStub.emit.calledWith('cpu')).to.be.true;
            expect(ioStub.emit.calledWith('memory')).to.be.true;
        });

        it('should properly aggregate HTTP events', () => {
            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            const httpHandler = monitoring.on.withArgs('http').firstCall.args[1];
            httpHandler({ duration: 100, url: '/test', time: Date.now() });
            httpHandler({ duration: 200, url: '/test', time: Date.now() });

            clock.tick(2000);

            const httpEmit = ioStub.emit.withArgs('http').firstCall;
            expect(httpEmit).to.not.be.undefined;
            const data = JSON.parse(httpEmit.args[1]);
            expect(data.total).to.equal(2);
            expect(data.average).to.equal(150);
            expect(data.longest).to.equal(200);
        });

        it('should aggregate probe events (MongoDB, Express, etc.)', () => {
            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            const mongoHandler = monitoring.on.withArgs('mongo').firstCall.args[1];
            mongoHandler({ duration: 50, time: Date.now() });

            const expressHandler = monitoring.on.withArgs('express').firstCall.args[1];
            expressHandler({ duration: 30, time: Date.now() });

            clock.tick(2000);

            expect(ioStub.emit.calledWith('probe-events')).to.be.true;
            const data = JSON.parse(ioStub.emit.withArgs('probe-events').firstCall.args[1]);
            expect(data).to.have.lengthOf(2);
        });

        it('should register all probe monitoring event handlers', () => {
            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            const probeEvents = ['mongo', 'express', 'socketio', 'redis', 'mysql', 'postgres', 'riak', 'leveldown'];
            probeEvents.forEach(event => {
                expect(monitoring.on.calledWith(event), `Expected handler for ${event}`).to.be.true;
            });
        });

        it('should compute CPU mean values', () => {
            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            const cpuHandler = monitoring.on.withArgs('cpu').firstCall.args[1];
            cpuHandler({ process: 0.4, system: 0.2, time: Date.now() });
            cpuHandler({ process: 0.6, system: 0.4, time: Date.now() });

            clock.tick(2000);

            const cpuEmit = ioStub.emit.withArgs('cpu').firstCall;
            const data = JSON.parse(cpuEmit.args[1]);
            expect(data.processMean).to.equal(0.5);
            expect(data.systemMean).to.be.closeTo(0.3, 0.0000001);
        });

        it('should emit http-urls aggregated data', () => {
            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            const httpHandler = monitoring.on.withArgs('http').firstCall.args[1];
            httpHandler({ duration: 100, url: '/api/test1', time: Date.now() });
            httpHandler({ duration: 200, url: '/api/test2', time: Date.now() });
            httpHandler({ duration: 300, url: '/api/test1', time: Date.now() });

            clock.tick(2000);

            const httpUrlsEmit = ioStub.emit.withArgs('http-urls').firstCall;
            expect(httpUrlsEmit).to.not.be.undefined;
            const data = JSON.parse(httpUrlsEmit.args[1]);
            expect(data).to.have.lengthOf(2);
            const test1 = data.find(d => d.url === '/api/test1');
            expect(test1.hits).to.equal(2);
        });
    });

    describe('GC events', () => {
        let clock;
        let appmetrics;
        let monitoring;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            registerStub.callsArgWith(1, null);
            const mocks = createMockAppmetrics();
            appmetrics = mocks.appmetrics;
            monitoring = mocks.monitoring;
        });

        afterEach(() => {
            clock.restore();
        });

        it('should aggregate GC duration and max heap used', () => {
            sinon.stub(process, 'uptime').returns(10);

            moduleExports.monitor({
                server: serverStub,
                appmetrics: appmetrics,
                socketIo: socketIoFunc
            });

            const gcHandler = monitoring.on.withArgs('gc').firstCall.args[1];
            gcHandler({ duration: 50, used: 1000, time: Date.now() });
            gcHandler({ duration: 150, used: 2000, time: Date.now() });

            clock.tick(2000);

            const gcEmit = ioStub.emit.withArgs('gc').firstCall;
            const data = JSON.parse(gcEmit.args[1]);
            expect(data.usedHeapAfterGCMax).to.equal(2000);
            expect(data.timeSummary).to.equal(200 / (10 * 1000));
        });
    });
});
