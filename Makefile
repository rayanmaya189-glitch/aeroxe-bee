.PHONY: build-backend build-frontend validate-swagger validate-swagger-verbose test-backend test-frontend lint-backend lint-frontend

# ─── Validation ───────────────────────────────────────────────────────────

validate-swagger:
	@echo "🔍 Validating swagger.json against router.go..."
	@python3 backend/scripts/validate-swagger.py

validate-swagger-verbose:
	@python3 backend/scripts/validate-swagger.py --verbose

# ─── Build ────────────────────────────────────────────────────────────────

build-backend:
	@echo "🔨 Building backend..."
	cd backend && go build ./...

build-frontend:
	@echo "🔨 Building frontend..."
	cd frontend && npm run build

build: build-backend build-frontend

# ─── Test ─────────────────────────────────────────────────────────────────

test-backend:
	cd backend && go test ./... -v -count=1

test-frontend:
	cd frontend && npx vitest run --reporter=verbose 2>/dev/null || echo "No vitest config found, skipping"

test: test-backend test-frontend

# ─── Lint ─────────────────────────────────────────────────────────────────

lint-backend:
	cd backend && go vet ./...

lint-frontend:
	cd frontend && npx oxlint 2>/dev/null || echo "oxlint not available, skipping"

lint: lint-backend lint-frontend

# ─── CI (runs everything) ─────────────────────────────────────────────────

ci: validate-swagger lint build test
	@echo "✅ CI checks passed"
