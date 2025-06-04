.PHONY: all run run-backend run-frontend install-backend-deps install-frontend-deps stop clean

# Default target
all: run

# Install dependencies
install-backend-deps:
	@echo "Installing backend dependencies..."
	@cd backend && uv pip install -r requirements.txt

install-frontend-deps:
	@echo "Installing frontend dependencies (assuming npm)..."
	@cd frontend && npm install

# Run servers
run-backend:
	@echo "Starting backend server on http://localhost:8000 ..."
	@cd backend && uv run uvicorn main:app --reload --port 8000

run-frontend:
	@echo "Starting frontend server (assuming npm start on http://localhost:3000)..."
	@cd frontend && npm start

run:
	@echo "Starting backend and frontend servers concurrently..."
	@echo "Backend will be on http://localhost:8000"
	@echo "Frontend will be on http://localhost:3000 (or as configured by npm start)"
	@make run-backend & make run-frontend

# Stop servers (this is a best-effort, might need manual intervention or more specific pkill commands)
stop:
	@echo "Attempting to stop servers..."
	@-pkill -f "uvicorn main:app --reload --port 8000" || echo "Backend (uvicorn) was not running or pkill failed."
	@-pkill -f "react-scripts start" || echo "Frontend (npm start / react-scripts) was not running or pkill failed (adjust if not using react-scripts)."
	@echo "Please check manually if processes are still running."

# Clean (example - you might want to add more specific clean targets)
clean:
	@echo "Cleaning up backend __pycache__ and .venv..."
	@rm -rf backend/__pycache__
	@rm -rf backend/.venv
	@echo "If you want to clean frontend node_modules, do it manually or add to this target (cd frontend && rm -rf node_modules)"

help:
	@echo "Available commands:"
	@echo "  make install-backend-deps   - Install backend Python dependencies using uv."
	@echo "  make install-frontend-deps  - Install frontend Node.js dependencies (uses npm)."
	@echo "  make run-backend            - Start only the backend server."
	@echo "  make run-frontend           - Start only the frontend server (assumes npm start)."
	@echo "  make run                    - Start backend and frontend servers concurrently."
	@echo "  make all                    - Default, same as 'make run'."
	@echo "  make stop                   - Attempt to stop running servers."
	@echo "  make clean                  - Remove backend __pycache__ and .venv."
	@echo "  make help                   - Show this help message."
