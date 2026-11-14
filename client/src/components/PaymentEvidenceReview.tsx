import { Check, ExternalLink, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

function StatusPill({ children, tone = "blue" }: { children: React.ReactNode; tone?: "pink" | "lime" | "blue" | "orange" }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

export function PaymentEvidenceReview({ onNotify }: { onNotify: (message: string) => void }) {
  const evidenceQuery = trpc.domain.payments.listEvidence.useQuery(undefined, { retry: false });
  const review = trpc.domain.payments.reviewEvidence.useMutation({
    onSuccess: () => {
      onNotify("Status bukti pembayaran diperbarui.");
      void evidenceQuery.refetch();
    },
    onError: (error) => onNotify(error.message || "Gagal memperbarui status bukti."),
  });
  const rows = evidenceQuery.data ?? [];
  const pendingCount = rows.filter((item) => item.status === "pending" || item.status === "review").length;

  return (
    <section className="panel table-panel">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">Verifikasi</span>
          <h3>Bukti pembayaran menunggu review</h3>
          <p>Setujui untuk menambahkan nominal ke invoice. Tolak jika bukti tidak sesuai.</p>
        </div>
        <StatusPill tone={pendingCount ? "orange" : "lime"}>{pendingCount ? `${pendingCount} menunggu` : "Semua sudah diproses"}</StatusPill>
      </div>
      <div className="snapshot-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Invoice</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Catatan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>#{item.id}</strong>
                </td>
                <td>INV #{item.invoiceId}</td>
                <td>
                  <strong>{money(item.amount)}</strong>
                </td>
                <td>
                  <StatusPill tone={item.status === "approved" ? "lime" : item.status === "rejected" ? "pink" : "orange"}>{item.status}</StatusPill>
                </td>
                <td>{item.note || "—"}</td>
                <td>
                  <div className="table-actions">
                    {(item.status === "pending" || item.status === "review") && (
                      <>
                        <button className="text-button" disabled={review.isPending} onClick={() => review.mutate({ evidenceId: item.id, status: "approved" })}>
                          <Check size={14} /> Setujui
                        </button>
                        <button
                          className="text-button"
                          disabled={review.isPending}
                          onClick={() => {
                            const note = window.prompt("Alasan penolakan (opsional):") || undefined;
                            review.mutate({ evidenceId: item.id, status: "rejected", note });
                          }}
                        >
                          <X size={14} /> Tolak
                        </button>
                      </>
                    )}
                    {item.stableUrl ? (
                      <a className="text-button" href={item.stableUrl} target="_blank" rel="noreferrer">
                        <ExternalLink size={14} /> Lihat
                      </a>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-table-state">Belum ada bukti pembayaran yang diunggah.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
