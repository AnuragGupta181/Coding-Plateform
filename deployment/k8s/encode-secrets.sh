#!/usr/bin/env bash
# Helper script to generate base64-encoded values for secrets.yml
# Usage: bash encode-secrets.sh
#
# It reads from Backend/.env and prints the base64-encoded values
# you need to paste into secrets.yml

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../Backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Backend/.env not found at: $ENV_FILE"
  exit 1
fi

echo "====================================="
echo "  Base64-encoded secrets for K8s"
echo "====================================="
echo ""
echo "Copy these values into secrets.yml"
echo ""

# List of secret keys to encode
SECRET_KEYS=("MONGODB_URI" "JWT_SECRET" "EMAIL_USER" "EMAIL_PASS" "REDIS_URL" "GROQ_API_KEY" "TURNSTILE_SECRET_KEY")

for key in "${SECRET_KEYS[@]}"; do
  # Extract value from .env (handles quotes and inline comments)
  value=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | sed 's/^[^=]*=//' | sed 's/^"//' | sed 's/"$//' | sed 's/ *#.*//')

  if [ -n "$value" ]; then
    encoded=$(echo -n "$value" | base64 -w 0)
    echo "  $key: \"$encoded\""
  else
    echo "  # $key: (not found in .env, skipping)"
  fi
done

echo ""
echo "====================================="

