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

echo "Using: $COMPOSE_CMD"

echo "Stopping and removing containers, networks, images and volumes..."
eval "$COMPOSE_CMD down --rmi all --volumes --remove-orphans"

echo "Cleanup complete."
