#!/usr/bin/env bash
# Restore Home.tsx from commit before placeholder overwrite
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
git fetch origin
git checkout 6317b0923bb33610b47abb838bea8f7ee9c31db1 -- client/src/pages/Home.tsx

if ! grep -q 'PaymentEvidenceReview' client/src/pages/Home.tsx; then
  if [[ "$(uname)" == Darwin ]]; then
    sed -i '' 's|import { AdminAssistant } from "@/components/AdminAssistant";|import { AdminAssistant } from "@/components/AdminAssistant";\nimport { PaymentEvidenceReview } from "@/components/PaymentEvidenceReview";|' client/src/pages/Home.tsx
    sed -i '' 's|<PaymentEvidenceUploader onNotify={onNotify} />|<PaymentEvidenceUploader onNotify={onNotify} /><PaymentEvidenceReview onNotify={onNotify} />|' client/src/pages/Home.tsx
  else
    sed -i 's|import { AdminAssistant } from "@/components/AdminAssistant";|import { AdminAssistant } from "@/components/AdminAssistant";\nimport { PaymentEvidenceReview } from "@/components/PaymentEvidenceReview";|' client/src/pages/Home.tsx
    sed -i 's|<PaymentEvidenceUploader onNotify={onNotify} />|<PaymentEvidenceUploader onNotify={onNotify} /><PaymentEvidenceReview onNotify={onNotify} />|' client/src/pages/Home.tsx
  fi
fi

echo "OK: Home.tsx restored and PaymentEvidenceReview wired."
echo "Next: git add client/src/pages/Home.tsx && git commit -m 'Restore Home.tsx and wire PaymentEvidenceReview' && git push"
