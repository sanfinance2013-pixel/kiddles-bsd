import { useEffect, useState } from "react";

/** Temporary placeholder while Home.tsx is restored from last good commit. */
export default function Home() {
  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 640, margin: "48px auto", padding: 24, lineHeight: 1.5 }}>
      <h1>KIDDLES BSD — restore needed</h1>
      <p>
        File <code>client/src/pages/Home.tsx</code> was temporarily overwritten during deploy.
        Run this in your project folder:
      </p>
      <pre style={{ background: "#f4f5f3", padding: 16, borderRadius: 8, overflow: "auto" }}>{`bash scripts/restore-home.sh
git add client/src/pages/Home.tsx
git commit -m "Restore Home.tsx and wire PaymentEvidenceReview"
git push`}</pre>
      <p>
        Atau: <code>git checkout 6317b0923bb33610b47abb838bea8f7ee9c31db1 -- client/src/pages/Home.tsx</code>
        lalu tambahkan import + render <code>PaymentEvidenceReview</code>.
      </p>
    </div>
  );
}
