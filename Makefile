# Bun executable (override with 'make BUN=/path/to/bun' if not in PATH)
BUN := bun

.PHONY: all test test-backend help

all: help

# Run all tests in the project
test: test-backend

# Run backend unit tests
test-backend:
	@echo "Running backend unit tests..."
	@$(BUN) test f/public/postmill__raw_app/backend/

# Show help information
help:
	@echo "Postmill Development Commands:"
	@echo "  make test          Run all tests (currently backend only)"
	@echo "  make test-backend  Run only the backend unit tests"
	@echo "  make help          Show this help message"
