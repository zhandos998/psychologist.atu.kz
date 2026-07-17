#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/docker.env}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups/mysql}"
RETENTION_COUNT="${RETENTION_COUNT:-14}"

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "docker env file not found: ${ENV_FILE}" >&2
    exit 1
fi

if ! [[ "${RETENTION_COUNT}" =~ ^[0-9]+$ ]] || (( RETENTION_COUNT < 1 )); then
    echo "RETENTION_COUNT must be a positive integer." >&2
    exit 1
fi

command -v docker >/dev/null 2>&1 || {
    echo "docker command not found." >&2
    exit 1
}

command -v gzip >/dev/null 2>&1 || {
    echo "gzip command not found." >&2
    exit 1
}

env_value() {
    awk -F= -v key="$1" '$1 == key { value = $0; sub(/^[^=]*=/, "", value); print value }' "${ENV_FILE}" \
        | tail -n 1 \
        | tr -d '\r' \
        | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

DB_NAME="$(env_value DOCKER_DB_DATABASE)"
DB_NAME="${DB_NAME:-psychologist_atu}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
TARGET_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
TMP_FILE="${TARGET_FILE}.tmp"
COMPOSE=(docker compose --env-file "${ENV_FILE}")

mkdir -p "${BACKUP_DIR}"

cleanup() {
    rm -f -- "${TMP_FILE}"
}
trap cleanup EXIT

"${COMPOSE[@]}" exec -T db sh -c \
    'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --single-transaction --quick --routines --triggers --events --no-tablespaces --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE"' \
    | gzip -9 > "${TMP_FILE}"

mv "${TMP_FILE}" "${TARGET_FILE}"
trap - EXIT

backup_count=0
while IFS= read -r backup_file; do
    backup_count=$((backup_count + 1))
    if [[ "${backup_count}" -gt "${RETENTION_COUNT}" ]]; then
        rm -f -- "${backup_file}"
    fi
done < <(
    find "${BACKUP_DIR}" -maxdepth 1 -type f -name "${DB_NAME}_*.sql.gz" -printf '%T@ %p\n' \
        | sort -nr \
        | sed 's/^[^ ]* //'
)

SIZE="$(du -h "${TARGET_FILE}" | awk '{print $1}')"
echo "Database backup created: ${TARGET_FILE} (${SIZE})"
echo "Retention: last ${RETENTION_COUNT} backup file(s)."
