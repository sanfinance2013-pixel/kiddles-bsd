import { trpc } from "@/lib/trpc";
import { Check, Clock3, X } from "lucide-react";

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

const fmt = (d: Date | string | null | undefined) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
};

export function InvoiceDetailPanel({
  invoiceId,
  onClose,
}: {
  invoiceId: number;
  onClose: () => void;
}) {
  const q = trpc.domain.billing.getDetail.useQuery({ invoiceId }, { retry: false });

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 720, width: "min(720px, 96vw)", maxHeight: "90vh", overflow: "auto" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">Tracking invoice</span>
            <h2 style={{ margin: "4px 0" }}>
              {q.data?.invoice.invoiceNumber ?? "Memuat…"}
            </h2>
          </div>
          <button type="button" className="icon-button icon-button--large" onClick={onClose} aria-label="Tutup">
            <X size={19} />
          </button>
        </div>

        {q.isLoading && <p>Memuat detail…</p>}
        {q.isError && <p style={{ color: "#9B3A5A" }}>{q.error.message}</p>}

        {q.data && (
          <>
            <div className="panel" style={{ marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 14 }}>
                <div>
                  <span style={{ color: "#68717b" }}>Murid</span>
                  <div>
                    <strong>{q.data.invoice.student?.fullName ?? `Murid #${q.data.invoice.studentId}`}</strong>
                  </div>
                </div>
                <div>
                  <span style={{ color: "#68717b" }}>Paket</span>
                  <div>{q.data.invoice.package?.name ?? "—"}</div>
                </div>
                <div>
                  <span style={{ color: "#68717b" }}>Total</span>
                  <div>
                    <strong>{money(q.data.invoice.total)}</strong>
                  </div>
                </div>
                <div>
                  <span style={{ color: "#68717b" }}>Sudah dibayar</span>
                  <div>{money(q.data.invoice.paidAmount)}</div>
                </div>
                <div>
                  <span style={{ color: "#68717b" }}>Sisa piutang</span>
                  <div>
                    <strong>{money(q.data.invoice.outstanding)}</strong>
                  </div>
                </div>
                <div>
                  <span style={{ color: "#68717b" }}>Status</span>
                  <div>{q.data.invoice.status}</div>
                </div>
                <div>
                  <span style={{ color: "#68717b" }}>Jatuh tempo</span>
                  <div>{fmt(q.data.invoice.dueDate)}</div>
                </div>
                <div>
                  <span style={{ color: "#68717b" }}>Dibuat</span>
                  <div>{fmt(q.data.invoice.createdAt)}</div>
                </div>
              </div>
            </div>

            <h4 style={{ margin: "12px 0 8px" }}>Alur proses</h4>
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {q.data.timeline.map((step) => (
                <li
                  key={step.key}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "10px 12px",
                    marginBottom: 8,
                    borderRadius: 10,
                    background: step.done ? "#e8f5ef" : "#f7f8f6",
                    border: "1px solid #dfe2df",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: step.done ? "#1F6B4A" : "#c5ccd3",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {step.done ? <Check size={14} /> : <Clock3 size={14} />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong>{step.label}</strong>
                    <div style={{ fontSize: 13, color: "#68717b" }}>{step.detail}</div>
                    <div style={{ fontSize: 12, color: "#68717b", marginTop: 2 }}>{fmt(step.at)}</div>
                  </div>
                </li>
              ))}
            </ol>

            <h4 style={{ margin: "16px 0 8px" }}>Bukti pembayaran</h4>
            {q.data.evidence.length === 0 ? (
              <p style={{ fontSize: 13, color: "#68717b" }}>Belum ada bukti diunggah.</p>
            ) : (
              <div className="snapshot-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nominal</th>
                      <th>Status</th>
                      <th>Diunggah</th>
                      <th>Direview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.evidence.map((e) => (
                      <tr key={e.id}>
                        <td>#{e.id}</td>
                        <td>{money(e.amount)}</td>
                        <td>{e.status}</td>
                        <td>{fmt(e.createdAt)}</td>
                        <td>{fmt(e.reviewedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h4 style={{ margin: "16px 0 8px" }}>Log aktivitas</h4>
            {q.data.activity.length === 0 ? (
              <p style={{ fontSize: 13, color: "#68717b" }}>Belum ada log.</p>
            ) : (
              <ul style={{ fontSize: 13, color: "#68717b", paddingLeft: 18 }}>
                {q.data.activity.map((a) => (
                  <li key={a.id} style={{ marginBottom: 4 }}>
                    <strong>{a.action}</strong> · {a.entityType}
                    {a.entityId ? ` #${a.entityId}` : ""} · {fmt(a.createdAt)}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="modal-foot" style={{ marginTop: 16 }}>
          <button type="button" className="button button--outline" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
