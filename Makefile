.PHONY: all run run-backend run-frontend install-backend-deps install-frontend-deps stop clean run-backend-bg

# Default target
all: run

# Install dependencies
install-backend-deps:
	@echo "Installing backend dependencies..."
	@cd backend && uv pip install -r requirements.txt

install-frontend-deps:
	@echo "Installing frontend dependencies (assuming npm)..."
	@cd frontend && npm install

# Individual run targets (foreground)
run-backend:
	@echo "Starting backend server on http://localhost:8000 ..."
	@cd backend && uv run python -m uvicorn main:app --reload --port 8000

run-frontend:
	@echo "Starting frontend server with 'npm run dev' on http://localhost:3000 (Vite default) ..."
	@cd frontend && npm run dev

# Target to run backend in background
run-backend-bg:
	@echo "Starting backend server in background on http://localhost:8000 ..."
	@cd backend && nohup uv run python -m uvicorn main:app --reload --port 8000 > backend.log 2>&1 &

# Target to run both: backend in background, frontend in foreground
run: run-backend-bg run-frontend
	@echo "\nBoth servers initiated."
	@echo "Frontend server is running in the foreground (output visible above)."
	@echo "Backend server was started in the background."
	@echo "Press Ctrl+C to stop the frontend server and this 'make' process."
	@echo "The backend server (started by 'run-backend-bg') will continue running."
	@echo "You may need to stop it manually (e.g., using 'kill' or by creating a 'make stop-backend' target)."

# Optional: Define stop and clean targets if needed, as they are in .PHONY
# stop:
#	@echo "Stopping servers..."
#	@echo "Note: This is a placeholder. Implement specific stop commands if needed."
#	# Example for backend: pkill -f "uvicorn main:app --reload --port 8000"
#	# Example for frontend: pkill -f "npm start" # Adjust if using 'npm run dev'

# clean:
#	@echo "Cleaning up..."
#	# Add cleanup commands here (e.g., remove __pycache__, node_modules, build artifacts)
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
