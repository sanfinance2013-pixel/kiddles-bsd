#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PARTS_DIR="$ROOT/scripts/home-restore-parts"
OUT="$ROOT/client/src/pages/Home.tsx"
if [[ ! -d "$PARTS_DIR" ]]; then
  echo "Missing $PARTS_DIR — git pull dulu"
  exit 1
fi
TMP=$(mktemp)
cat "$PARTS_DIR"/part-*.b64 | tr -d '\n' | base64 -d > "$TMP"
if ! grep -q "export default function Home" "$TMP"; then
  echo "Decode failed"
  exit 1
fi
mv "$TMP" "$OUT"
echo "Restored $OUT ($(wc -c < "$OUT") bytes)"
echo "Jalankan: git add client/src/pages/Home.tsx && git commit -m 'Restore Home.tsx' && git push"
