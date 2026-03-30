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
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return 0
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
    return 1
  fi

  return 0
}

cleanup_old_app_images() {
  local protected_images=("$FRONTEND_IMAGE" "$BACKEND_IMAGE")
  local running_image
  local repositories=("${FRONTEND_IMAGE%:*}" "${BACKEND_IMAGE%:*}")

  for container_name in voting-game-frontend voting-game-backend; do
    running_image="$(docker container inspect --format '{{.Config.Image}}' "$container_name" 2>/dev/null || true)"
    if [ -n "$running_image" ]; then
      protected_images+=("$running_image")
    fi
  done

  docker image prune -f >/dev/null 2>&1 || true
  docker builder prune -f >/dev/null 2>&1 || true

  for repository in "${repositories[@]}"; do
    while IFS= read -r image_ref; do
      [ -z "$image_ref" ] && continue

      local keep_image=false
      for protected in "${protected_images[@]}"; do
        if [ "$image_ref" = "$protected" ]; then
          keep_image=true
          break
        fi
      done

      if [ "$keep_image" = false ]; then
        docker image rm -f "$image_ref" >/dev/null 2>&1 || true
      fi
    done < <(docker image ls --format '{{.Repository}}:{{.Tag}}' "$repository" | grep -v '<none>' || true)
  done
}

deploy_with_docker_run() {
  docker network inspect voting-game >/dev/null 2>&1 || docker network create voting-game >/dev/null

  cleanup_old_app_images

  docker pull "$BACKEND_IMAGE"
  docker pull "$FRONTEND_IMAGE"

  docker rm -f voting-game-frontend voting-game-backend >/dev/null 2>&1 || true

  docker run -d \
    --name voting-game-backend \
    --network voting-game \
    --restart unless-stopped \
    --env-file .env.runtime \
    -e PORT=5050 \
    -p 5050:5050 \
    "$BACKEND_IMAGE"

  docker run -d \
    --name voting-game-frontend \
    --network voting-game \
    --restart unless-stopped \
    --env-file .env.runtime \
    -e PORT=3000 \
    -p 3000:3000 \
    "$FRONTEND_IMAGE"

  cleanup_old_app_images
}

ECR_REGISTRY="${FRONTEND_IMAGE%%/*}"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

if ensure_compose; then
  cleanup_old_app_images
  "${COMPOSE_CMD[@]}" -f docker-compose.server.yml pull
  "${COMPOSE_CMD[@]}" -f docker-compose.server.yml up -d --remove-orphans
  cleanup_old_app_images
else
  echo "Docker Compose is not available on this host. Falling back to plain docker run."
  deploy_with_docker_run
fi
