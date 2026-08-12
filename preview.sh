#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
INDEX_FILE="${PROJECT_DIR}/index.qmd"
PREVIEW_HOST="127.0.0.1"
PREVIEW_PORT="${1:-4444}"

if ! command -v quarto >/dev/null 2>&1; then
  printf 'Quarto was not found. Install it from https://quarto.org/docs/get-started/ or add it to your PATH.\n' >&2
  exit 1
fi

if [[ ! "${PREVIEW_PORT}" =~ ^[0-9]+$ ]] || (( PREVIEW_PORT < 1024 || PREVIEW_PORT > 65535 )); then
  printf 'Port must be a number between 1024 and 65535.\n' >&2
  exit 1
fi

if command -v lsof >/dev/null 2>&1; then
  while lsof -nP -iTCP:"${PREVIEW_PORT}" -sTCP:LISTEN >/dev/null 2>&1; do
    PREVIEW_PORT=$((PREVIEW_PORT + 1))
    if (( PREVIEW_PORT > 65535 )); then
      printf 'No available preview port was found.\n' >&2
      exit 1
    fi
  done
fi

PREVIEW_URL="http://${PREVIEW_HOST}:${PREVIEW_PORT}/"

if command -v code >/dev/null 2>&1; then
  code "${PROJECT_DIR}" "${INDEX_FILE}"
else
  printf 'Warning: the VS Code command-line launcher was not found.\n' >&2
fi

printf '\nQuarto live preview\n'
printf '  Editor: %s\n' "${INDEX_FILE}"
printf '  Browser: %s\n' "${PREVIEW_URL}"
printf '  Stop: Ctrl+C\n\n'

cd "${PROJECT_DIR}"
exec quarto preview \
  --no-browser \
  --host "${PREVIEW_HOST}" \
  --port "${PREVIEW_PORT}"
