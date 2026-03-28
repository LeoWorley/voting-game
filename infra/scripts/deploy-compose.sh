#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/voting-game}"
AWS_REGION="${AWS_REGION:?AWS_REGION is required}"
SECRETS_ID="${SECRETS_ID:?SECRETS_ID is required}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:?FRONTEND_IMAGE is required}"
BACKEND_IMAGE="${BACKEND_IMAGE:?BACKEND_IMAGE is required}"

mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ ! -f docker-compose.server.yml ]; then
  echo "docker-compose.server.yml not found in $APP_DIR"
  exit 1
fi

aws secretsmanager get-secret-value \
  --region "$AWS_REGION" \
  --secret-id "$SECRETS_ID" \
  --query SecretString \
  --output text > .env.runtime.json

jq -r 'to_entries | .[] | "\(.key)=\(.value)"' .env.runtime.json > .env.runtime
rm -f .env.runtime.json

export FRONTEND_IMAGE
export BACKEND_IMAGE

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Docker Compose is not installed. Install the Docker Compose plugin or docker-compose."
  exit 1
fi

"${COMPOSE_CMD[@]}" -f docker-compose.server.yml pull

"${COMPOSE_CMD[@]}" -f docker-compose.server.yml up -d --remove-orphans
