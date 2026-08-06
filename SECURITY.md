# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please open an issue at:
https://github.com/juninmd/appmetrics-dash-hapi/issues

## Security Measures

### 1. Secrets Management

- All sensitive data should be passed via environment variables, never hardcoded
- `.env`, `.env.local`, `*.key`, `*.pem`, `*.p12` files are gitignored
- Run `git-secrets` or `truffleHog` before committing to check for leaked secrets

### 2. Input Validation

- **URL paths** are sanitized before being used in routes to prevent path traversal and route injection
- **Socket.IO events** use an allowlist (`ALLOWED_SOCKET_EVENTS`) to restrict which events can be registered
- Unknown socket events from clients are silently blocked

### 3. Rate Limiting

- Socket.IO connections are rate-limited (default: 20 connections per IP per 60s window)
- Excess connections receive an error and are disconnected

### 4. CORS Configuration

- Pass a `cors` option to `monitor()` to configure CORS for Socket.IO
- Default: allow all origins
- Wildcard origin with credentials is rejected as insecure

```js
appmetrics.monitor({
  server: server,
  cors: {
    origin: 'https://your-app.com',
    credentials: true,
  },
});
```

### 5. Security Headers

The following headers are added to all responses:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### 6. Error Handling

- Error messages are sanitized to prevent stack trace leaks
- Errors exposed to clients contain only message text, no stack traces
- Long error strings are truncated to 200 characters

### 7. Dependencies

- Dependabot is configured for weekly automated dependency updates
- Run `npm audit` regularly to check for vulnerabilities
- Pin dependency versions in production

### OWASP Top 10 Coverage

| # | Category | Status |
|---|----------|--------|
| 1 | Broken Access Control | Socket event allowlist, rate limiting |
| 2 | Cryptographic Failures | N/A (no crypto implemented in this library) |
| 3 | Injection | URL sanitization, event allowlist |
| 4 | Insecure Design | Security headers, input validation |
| 5 | Security Misconfiguration | CORS validation, .gitignore |
| 6 | Vulnerable Components | Dependabot, npm audit |
| 7 | Authentication Failures | Rate limiting (mitigates brute force) |
| 8 | Integrity Failures | Dependency versioning |
| 9 | Logging & Monitoring | Debug logging for blocked events |
| 10 | SSRF | N/A (no server-side requests in this library) |
