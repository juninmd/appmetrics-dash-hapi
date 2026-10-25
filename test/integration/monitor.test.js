'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const { expect } = require('chai');

describe('Monitor Integration', function () {
    let mod;
    let mockSocketIo;
    let mockAppmetrics;
    let mockMonitoring;
    let mockServer;
    let mockListener;

    beforeEach(function () {
        mockSocketIo = sinon.stub();
        mockSocketIo.returns({
            emit: sinon.stub(),
            on: sinon.stub()
        });

        mockListener = { on: sinon.stub() };

        mockServer = {
            route: sinon.stub(),
            register: sinon.stub().callsFake(function (p, cb) { cb(); }),
            listener: mockListener
        };

        mockMonitoring = {
            getEnvironment: sinon.stub().returns({}),
            on: sinon.stub(),
            enable: sinon.stub(),
            disable: sinon.stub()
        };

        mockAppmetrics = {
            monitor: sinon.stub().returns(mockMonitoring),
            writeSnapshot: sinon.stub()
        };

        mod = proxyquire('../../index', {
            'socket.io': mockSocketIo,
            inert: {},
            appmetrics: mockAppmetrics,
            'appmetrics-dash': {}
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    // monitor() resolve appmetrics/socket.io em tempo de execucao, entao o
    // proxyquire nao intercepta esses requires: injeta os mocks explicitamente.
    function monitorServer(options) {
        mod.monitor(
            Object.assign(
                { appmetrics: mockAppmetrics, socketIo: mockSocketIo },
                options
            )
        );
    }

    it('should export monitor function', function () {
        expect(mod).to.have.property('monitor');
        expect(mod.monitor).to.be.a('function');
    });

    it('should call server.register when monitor is invoked', function () {
        monitorServer({ server: mockServer });
        expect(mockServer.register.calledOnce).to.be.true;
    });

    it('should initialize socket.io after plugin registration', function () {
        monitorServer({ server: mockServer });
        expect(mockSocketIo.calledOnce).to.be.true;
        expect(mockSocketIo.firstCall.args[0]).to.equal(mockListener);
    });

    it('should handle Inert registration failure without throwing', function () {
        var loggedMsg;
        var origLog = console.log;
        console.log = function (msg) { loggedMsg = msg; };

        mockServer.register = sinon.stub().callsFake(function (p, cb) {
            cb(new Error('Plugin not found'));
        });
        monitorServer({ server: mockServer });

        expect(loggedMsg.message).to.equal('Plugin not found');
        console.log = origLog;
    });

    it('should accept monitor with minimal options', function () {
        monitorServer({ server: mockServer });
    });

    it('should accept monitor with all custom options', function () {
        monitorServer({
            server: mockServer,
            url: '/custom/{param*}',
            title: 'My Metrics',
            docs: 'https://example.com'
        });
    });

    it('should set up default route when no url specified', function () {
        monitorServer({ server: mockServer });
        expect(mockServer.route.firstCall.args[0].path).to.equal('/appmetrics-dash/{param*}');
    });

    it('should set up custom route when url specified', function () {
        monitorServer({ server: mockServer, url: '/custom/{param*}' });
        expect(mockServer.route.firstCall.args[0].path).to.equal('/custom/{param*}');
    });

    it('should support multiple server instances', function () {
        const mockServer2 = {
            route: sinon.stub(),
            register: sinon.stub().callsFake(function (p, cb) { cb(); }),
            listener: { on: sinon.stub() }
        };

        monitorServer({ server: mockServer });
        monitorServer({ server: mockServer2 });

        expect(mockServer.route.calledOnce).to.be.true;
        expect(mockServer2.route.calledOnce).to.be.true;
    });
});
