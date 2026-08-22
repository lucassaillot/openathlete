#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/../../../docker-compose.coolify.yml"
ENV_FILE="${SCRIPT_DIR}/../.env"
OUTPUT_DIR="${1:-${SCRIPT_DIR}/../backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy from .env.example first."
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

mkdir -p "${OUTPUT_DIR}"

BACKUP_FILE="${OUTPUT_DIR}/openathlete_${TIMESTAMP}.sql.gz"

echo "Backing up database '${POSTGRES_DB}' to ${BACKUP_FILE}..."

docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --no-acl \
  | gzip > "${BACKUP_FILE}"

echo "Done: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
