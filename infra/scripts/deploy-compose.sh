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

run_as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    return 1
  fi
}

ensure_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return
  fi

  if command -v dnf >/dev/null 2>&1; then
    run_as_root dnf install -y docker-compose-plugin || true
  elif command -v apt-get >/dev/null 2>&1; then
    run_as_root apt-get update || true
    run_as_root apt-get install -y docker-compose-plugin || true
  fi

  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    echo "Docker Compose is not installed. Install the Docker Compose plugin or docker-compose."
    exit 1
  fi
}

ECR_REGISTRY="${FRONTEND_IMAGE%%/*}"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

ensure_compose

"${COMPOSE_CMD[@]}" -f docker-compose.server.yml pull

"${COMPOSE_CMD[@]}" -f docker-compose.server.yml up -d --remove-orphans
