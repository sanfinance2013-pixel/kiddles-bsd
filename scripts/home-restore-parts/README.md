# Home.tsx restore parts

Run from repo root:

```bash
bash scripts/restore-home-from-parts.sh
git add client/src/pages/Home.tsx
git commit -m "Restore full Home.tsx"
git push
```

Parts are base64 of the full Home.tsx (PaymentEvidenceReview + reports + export Excel).
