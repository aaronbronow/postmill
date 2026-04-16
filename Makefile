# Bun executable (override with 'make BUN=/path/to/bun' if not in PATH)
BUN := bun

.PHONY: all test test-backend test-e2e help

all: help

# Run all tests in the project
test: test-backend test-e2e

# Run backend unit tests
test-backend:
	@echo "Running backend unit tests..."
	@$(BUN) test f/public/postmill__raw_app/backend/

# Run end-to-end integration tests
test-e2e:
	@echo "Running E2E integration tests..."
	@$(BUN) run e2e_draft_test.ts

# Show help information
help:
	@echo "Postmill Development Commands:"
	@echo "  make test          Run all tests (backend + E2E)"
	@echo "  make test-backend  Run only the backend unit tests"
	@echo "  make test-e2e      Run only the E2E integration tests"
	@echo "  make help          Show this help message"
