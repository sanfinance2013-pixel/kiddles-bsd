import { trpc } from "@/lib/trpc";
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, FileSpreadsheet, WalletCards } from "lucide-react";

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

function exportCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CashflowTrackingPage({ onNotify }: { onNotify: (message: string) => void }) {
  const q = trpc.domain.cashflow.summary.useQuery(undefined, { retry: false });
  const data = q.data;

  const downloadAll = () => {
    if (!data) return;
    const rows: string[][] = [
      ["Jenis", "Ref", "Pihak", "Total", "Dibayar", "Sisa", "Status", "Tanggal"],
      ...data.piutang.items.map((i) => [
        "Piutang",
        String(i.ref),
        String(i.party),
        String(i.total),
        String(i.paid),
        String(i.outstanding),
        String(i.status),
        i.dueDate ? new Date(i.dueDate as string).toLocaleDateString("id-ID") : "",
      ]),
      ...data.utang.items.map((i) => [
        "Utang",
        String(i.ref),
        String(i.party),
        String(i.total),
        String(i.paid),
        String(i.outstanding),
        String(i.status),
        i.dueDate ? new Date(i.dueDate as string).toLocaleDateString("id-ID") : "",
      ]),
      [],
      ["Cashflow masuk", String(data.cashflow.masuk)],
      ["Cashflow keluar", String(data.cashflow.keluar)],
      ["Netto", String(data.cashflow.netto)],
    ];
    exportCsv(`KIDDLES-cashflow-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    onNotify("File Excel/CSV cashflow diunduh.");
  };

  if (q.isLoading) {
    return (
      <div className="page-stack">
        <div className="panel">Memuat data piutang, utang, dan arus kas…</div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="page-stack">
        <div className="panel">
          <strong>Data belum bisa dimuat.</strong>
          <p>{q.error.message || "Pastikan DATABASE_URL dan migrasi sudah jalan."}</p>
        </div>
      </div>
    );
  }

  const piutang = data?.piutang ?? { total: 0, count: 0, items: [] };
  const utang = data?.utang ?? { total: 0, count: 0, items: [] };
  const cf = data?.cashflow ?? { masuk: 0, keluar: 0, netto: 0 };

  return (
    <div className="page-stack">
      <div className="panel">
        <div className="panel-title-row" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <span className="eyebrow">Keuangan cabang</span>
            <h3 style={{ margin: "4px 0" }}>Tracking Piutang, Utang & Cashflow</h3>
            <p style={{ margin: 0, color: "#68717b", fontSize: 14 }}>
              Piutang dari invoice belum lunas · Utang dari pembelian tempo (payable) · Arus kas dari pembayaran masuk & pengeluaran cash/bank.
              {data?.periodLabel ? ` · ${data.periodLabel}` : ""}
            </p>
          </div>
          <button type="button" className="button button--dark" onClick={downloadAll}>
            <FileSpreadsheet size={15} /> Export Excel/CSV
          </button>
        </div>

        <div className="accounting-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginTop: 16 }}>
          <div className="panel accounting-kpi">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><WalletCards size={14} /> Piutang</span>
            <strong>{money(piutang.total)}</strong>
            <small>{piutang.count} invoice belum lunas</small>
          </div>
          <div className="panel accounting-kpi">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><CircleDollarSign size={14} /> Utang</span>
            <strong>{money(utang.total)}</strong>
            <small>{utang.count} pembelian tempo</small>
          </div>
          <div className="panel accounting-kpi">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={14} /> Kas masuk</span>
            <strong>{money(cf.masuk)}</strong>
            <small>Total dibayar di invoice</small>
          </div>
          <div className="panel accounting-kpi">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><ArrowDownRight size={14} /> Kas keluar</span>
            <strong>{money(cf.keluar)}</strong>
            <small>Pembelian cash/bank</small>
          </div>
          <div className="panel accounting-kpi">
            <span>Netto kas</span>
            <strong style={{ color: cf.netto >= 0 ? "#1F6B4A" : "#9B3A5A" }}>{money(cf.netto)}</strong>
            <small>Masuk − keluar</small>
          </div>
        </div>
      </div>

      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Piutang usaha (receivable)</h4>
        <div className="snapshot-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Pihak</th>
                <th>Total</th>
                <th>Dibayar</th>
                <th>Sisa</th>
                <th>Status</th>
                <th>Jatuh tempo</th>
              </tr>
            </thead>
            <tbody>
              {piutang.items.map((i) => (
                <tr key={`p-${i.id}`}>
                  <td>{String(i.ref)}</td>
                  <td>{String(i.party)}</td>
                  <td>{money(Number(i.total))}</td>
                  <td>{money(Number(i.paid))}</td>
                  <td><strong>{money(Number(i.outstanding))}</strong></td>
                  <td>{String(i.status)}</td>
                  <td>{i.dueDate ? new Date(i.dueDate as string).toLocaleDateString("id-ID") : "—"}</td>
                </tr>
              ))}
              {!piutang.items.length && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-table-state">Tidak ada piutang. Invoice lunas atau belum ada tagihan.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h4 style={{ marginTop: 0 }}>Utang usaha (payable)</h4>
        <p style={{ fontSize: 13, color: "#68717b" }}>Dari procurement dengan metode <strong>payable</strong> yang belum berstatus paid.</p>
        <div className="snapshot-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>No. PO</th>
                <th>Vendor</th>
                <th>Item</th>
                <th>Total</th>
                <th>Status</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {utang.items.map((i) => (
                <tr key={`u-${i.id}`}>
                  <td>{String(i.ref)}</td>
                  <td>{String(i.party)}</td>
                  <td>{String((i as { itemName?: string }).itemName || "—")}</td>
                  <td><strong>{money(Number(i.outstanding))}</strong></td>
                  <td>{String(i.status)}</td>
                  <td>{i.dueDate ? new Date(i.dueDate as string).toLocaleDateString("id-ID") : "—"}</td>
                </tr>
              ))}
              {!utang.items.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-table-state">Tidak ada utang tempo. Catat pembelian dengan metode payable di Procurement.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
