#!/usr/bin/env bash
set -euo pipefail

COMPOSE_CMD=""
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "Neither 'docker compose' nor 'docker-compose' found. Please install Docker Compose." >&2
  exit 1
fi

echo "Building images..."
eval "$COMPOSE_CMD build --pull"

echo "Starting containers (detached)..."
eval "$COMPOSE_CMD up -d --build --remove-orphans"

echo
echo "Application started."
echo "To stop and remove everything, run: ./stop.sh"
