#!/usr/bin/env bash
# Wait until a Foundry instance is serving, or give up loudly.
#
# Foundry answers /api/status once the server is up, which is well before a world is active - so
# this waits for the world too, since a suite that joins a world has nothing to do without one.
set -euo pipefail

url="${1:?usage: wait-for-foundry.sh <url>}"
deadline=$(( SECONDS + ${2:-180} ))

while (( SECONDS < deadline )); do
  status="$(curl --silent --show-error --fail "${url}/api/status" 2>/dev/null || true)"
  if [ -n "$status" ]; then
    echo "$status"
    if echo "$status" | grep -q '"active":[[:space:]]*true'; then
      echo "Foundry is up with a world active."
      exit 0
    fi
  fi
  sleep 3
done

echo "Foundry did not come up with an active world within the deadline." >&2
exit 1
