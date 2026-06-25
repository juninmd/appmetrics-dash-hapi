# Contributing to appmetrics-dash-hapi

## Development Setup

```bash
git clone <repo-url>
cd appmetrics-dash-hapi
yarn install
```

## Code Quality

Run linting and formatting checks before committing:

```bash
yarn lint           # Check code style
yarn format:check   # Check formatting
yarn format         # Auto-format code
```

## Testing

We require **80%+ code coverage**. Run tests locally:

```bash
yarn test              # Run test suite
yarn test:coverage     # Run with coverage report
```

### Test Structure
- `test/unit/` - Unit tests for individual functions
- `test/integration/` - Integration tests for API endpoints

### Writing Tests
- Use Mocha + Chai + Sinon for testing
- Place unit tests in `test/unit/` and integration tests in `test/integration/`
- Name test files with `.test.js` suffix
- Aim for minimum 80% coverage on all metrics

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration:

### Pipeline Stages
1. **Lint** - ESLint and Prettier checks, dependency audit
2. **Test** - Unit + integration tests across Node 16/18/20, coverage upload
3. **Security** - Snyk vulnerability scanning, CodeQL analysis
4. **Build** - Package verification
5. **Deploy** - Automated npm publish on main branch pushes

### Before Merging
- [ ] All CI checks pass
- [ ] No linting errors
- [ ] Test coverage >= 80%
- [ ] Dependencies are up to date and secure

## Dependency Management
- Always use `yarn` for package management
- Commit `yarn.lock` to lock dependency versions
- Run `yarn audit` to check for vulnerabilities
- Pin dependency versions in `package.json`

## Pull Request Process
1. Create a feature branch from `develop`
2. Implement changes with tests
3. Ensure all CI checks pass
4. Request review from maintainers
5. Squash merge to `develop`
6. Release from `main` branch

## Release Process
Releases are automated via CI:
1. Merge to `develop` triggers staging deployment
2. Merge to `main` triggers production deployment to npm
3. Tag releases with semantic versioning
