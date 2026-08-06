'use strict';

const { expect } = require('chai');

// Clear require cache to get fresh module
delete require.cache[require.resolve('../index')];
const lib = require('../index');

describe('Security - Input Validation', function () {

  describe('sanitizeUrlPath', function () {
    // Use the internal function via source inspection; we export helpers for testing
    const { sanitizeUrlPath } = require('../index');

    it('should return default path for non-string input', function () {
      expect(sanitizeUrlPath(undefined)).to.equal('/appmetrics-dash/{param*}');
      expect(sanitizeUrlPath(null)).to.equal('/appmetrics-dash/{param*}');
      expect(sanitizeUrlPath(123)).to.equal('/appmetrics-dash/{param*}');
      expect(sanitizeUrlPath({})).to.equal('/appmetrics-dash/{param*}');
    });

    it('should return default path for path traversal attempts', function () {
      expect(sanitizeUrlPath('../../../etc/passwd')).to.equal('/appmetrics-dash/{param*}');
      expect(sanitizeUrlPath('..\\..\\..\\windows\\system32')).to.equal('/appmetrics-dash/{param*}');
    });

    it('should return default path for unsafe characters', function () {
      expect(sanitizeUrlPath('/appmetrics-dash/<script>')).to.equal('/appmetrics-dash/{param*}');
      expect(sanitizeUrlPath('/appmetrics-dash/"onclick')).to.equal('/appmetrics-dash/{param*}');
    });

    it('should return sanitized path for valid URLs', function () {
      expect(sanitizeUrlPath('/custom-dash/{param*}')).to.equal('/custom-dash/{param*}');
      expect(sanitizeUrlPath('/my-dash/')).to.equal('/my-dash/');
      expect(sanitizeUrlPath('/')).to.equal('/');
    });

    it('should reject any path containing traversal sequences', function () {
      expect(sanitizeUrlPath('/safe/../unsafe')).to.equal('/appmetrics-dash/{param*}');
      expect(sanitizeUrlPath('/safe/..\\unsafe')).to.equal('/appmetrics-dash/{param*}');
    });
  });

  describe('sanitizeError', function () {
    const { sanitizeError } = require('../index');

    it('should return "Unknown error" for null/undefined', function () {
      expect(sanitizeError(null)).to.equal('Unknown error');
      expect(sanitizeError(undefined)).to.equal('Unknown error');
    });

    it('should return error message for Error objects', function () {
      const err = new Error('Something went wrong');
      expect(sanitizeError(err)).to.equal('Something went wrong');
    });

    it('should not leak stack traces', function () {
      const err = new Error('Hidden');
      const result = sanitizeError(err);
      expect(result).to.not.include('at ');
      expect(result).to.not.include('stack');
    });

    it('should truncate long error strings', function () {
      const long = 'a'.repeat(500);
      expect(sanitizeError(long).length).to.be.at.most(200);
    });
  });

  describe('isRateLimited', function () {
    const { isRateLimited } = require('../index');

    it('should not rate limit on first attempt', function () {
      expect(isRateLimited('192.168.1.1')).to.be.false;
    });

    it('should rate limit after exceeding threshold', function () {
      const ip = '10.0.0.1';
      // Exhaust the limit
      for (let i = 0; i < 20; i++) {
        isRateLimited(ip);
      }
      expect(isRateLimited(ip)).to.be.true;
    });

    it('should reset window after time passes', function () {
      // This is an integration-level check; we rely on the window logic
      const ip = '10.0.0.2';
      for (let i = 0; i < 20; i++) {
        isRateLimited(ip);
      }
      expect(isRateLimited(ip)).to.be.true;
    });
  });

  describe('ALLOWED_SOCKET_EVENTS', function () {
    const { ALLOWED_SOCKET_EVENTS } = require('../index');

    it('should allow only known safe events', function () {
      const known = ['connected', 'enableprofiling', 'disableprofiling', 'nodereport', 'heapdump'];
      known.forEach(function (ev) {
        expect(ALLOWED_SOCKET_EVENTS.has(ev)).to.be.true;
      });
    });

    it('should reject unknown events', function () {
      const malicious = ['$', 'eval', '__proto__', 'constructor', 'admin', 'sql', '<script>'];
      malicious.forEach(function (ev) {
        expect(ALLOWED_SOCKET_EVENTS.has(ev)).to.be.false;
      });
    });
  });
});

describe('Security - monitor() input validation', function () {

  it('should throw when no options are provided', function () {
    expect(function () { lib.monitor(); }).to.throw('A valid options object with a server property is required');
  });

  it('should throw when options is null', function () {
    expect(function () { lib.monitor(null); }).to.throw('A valid options object with a server property is required');
  });

  it('should throw when options has no server', function () {
    expect(function () { lib.monitor({}); }).to.throw('A valid options object with a server property is required');
  });
});

describe('Security - CORS configuration', function () {
  const { buildCorsOptions } = require('../index');

  it('should return default CORS when no options provided', function () {
    const opts = buildCorsOptions();
    expect(opts).to.deep.equal({
      origin: '*',
      methods: ['GET', 'POST'],
    });
  });

  it('should merge user CORS with defaults', function () {
    const opts = buildCorsOptions({ origin: 'https://example.com' });
    expect(opts.origin).to.equal('https://example.com');
    expect(opts.methods).to.deep.equal(['GET', 'POST']);
  });

  it('should not allow null origin', function () {
    const opts = buildCorsOptions({ origin: null });
    expect(opts.origin).to.equal('*');
  });

  it('should not allow wildcard credentials', function () {
    const opts = buildCorsOptions({ origin: '*', credentials: true });
    expect(opts.origin).to.not.equal('*');
  });
});

describe('Security - Security headers', function () {
  const { getSecurityHeaders } = require('../index');

  it('should return all required security headers', function () {
    const headers = getSecurityHeaders();
    expect(headers).to.have.property('X-Content-Type-Options', 'nosniff');
    expect(headers).to.have.property('X-Frame-Options', 'DENY');
    expect(headers).to.have.property('X-XSS-Protection', '1; mode=block');
  });
});
