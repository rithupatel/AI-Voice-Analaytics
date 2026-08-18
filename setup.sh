#!/bin/bash
set -e

echo "=============================================="
echo " Voice Analysis Platform - Setup & Verification "
echo "=============================================="

echo "[1/4] Installing / Updating Python Dependencies..."
cd backend
pip install -r requirements.txt

echo "[2/4] Running Code Quality Linters..."
ruff check .
pyrefly check --ignore missing-import

echo "[3/4] Executing Smoke Tests..."
# The system requires smoke tests to pass before considering setup successful.
pytest -m smoke -x

echo "[4/4] Starting Services..."
echo "Starting Redis Server..."
if ! command -v redis-server &> /dev/null; then
    echo "Redis is not installed. Installing it via apt..."
    sudo apt-get update && sudo apt-get install -y redis-server
fi
sudo systemctl start redis-server || echo "Warning: Could not start Redis via systemctl."

echo "Starting Celery Worker..."
celery -A app.celery_app worker --loglevel=info &
CELERY_PID=$!

echo "Starting FastAPI Server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
UVICORN_PID=$!

echo "=============================================="
echo " System is UP and Running!"
echo " Press Ctrl+C to shut down all services."
echo "=============================================="

# Trap termination signals to kill background processes
trap "echo 'Shutting down services...'; kill $CELERY_PID $UVICORN_PID; exit" INT TERM
wait
