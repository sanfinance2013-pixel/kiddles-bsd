/**
 * Export akuntansi → CSV/Excel-friendly rows.
 * Integrasi: data dari trpc.domain.accounting / billing / tax / payroll
 * Alur: Print Ready (cek + rumus) → exportExcel() atau cetak PDF.
 *
 * Browser: CSV blob (buka di Excel / Google Sheets).
 */

export type Money = number;

export type PayrollExportInput = {
  name: string;
  ptkp: string;
  honor: Money;
  tunjangan: Money;
  terRate: number;
  jkkRate?: number;
};

const CAP_KES = 12_000_000;
const CAP_JP = 11_086_300;

export function calcPayrollIntegrated(p: PayrollExportInput) {
  const jkkRate = p.jkkRate ?? 0.0024;
  const bruto = p.honor + p.tunjangan;
  const capKes = Math.min(bruto, CAP_KES);
  const capJp = Math.min(bruto, CAP_JP);
  const kesEE = Math.round(capKes * 0.01);
  const jhtEE = Math.round(bruto * 0.02);
  const jpEE = Math.round(capJp * 0.01);
  const pph21 = Math.round(bruto * p.terRate);
  const takeHome = bruto - kesEE - jhtEE - jpEE - pph21;
  const kesER = Math.round(capKes * 0.04);
  const jhtER = Math.round(bruto * 0.037);
  const jpER = Math.round(capJp * 0.02);
  const jkkER = Math.round(bruto * jkkRate);
  const jkmER = Math.round(bruto * 0.003);
  const totalER = kesER + jhtER + jpER + jkkER + jkmER;

  const journalLines = [
    { account: "Beban Honor Guru", debit: bruto, credit: 0, formula: "bruto honor+tunjangan" },
    { account: "Beban BPJS perusahaan", debit: totalER, credit: 0, formula: "total iuran ER" },
    { account: "Kas & Bank", debit: 0, credit: takeHome, formula: "take-home pay" },
    { account: "Utang BPJS", debit: 0, credit: kesEE + jhtEE + jpEE + totalER, formula: "EE+ER BPJS" },
    { account: "Utang Pajak", debit: 0, credit: pph21, formula: "PPh 21 TER" },
  ];

  return {
    bruto, kesEE, jhtEE, jpEE, pph21, takeHome, kesER, jhtER, jpER, jkkER, jkmER, totalER, journalLines,
    formulas: {
      bruto: "honor + tunjangan",
      kesEE: "1% \u00d7 min(bruto, 12_000_000)",
      jhtEE: "2% \u00d7 bruto",
      jpEE: "1% \u00d7 min(bruto, 11_086_300)",
      pph21: "bruto \u00d7 tarif TER (PMK 168/2023)",
      takeHome: "bruto \u2212 kesEE \u2212 jhtEE \u2212 jpEE \u2212 pph21",
    },
  };
}

export function buildPayrollExportRows(list: PayrollExportInput[]) {
  const header = [
    "Nama", "PTKP", "Honor", "Tunjangan", "Bruto", "Kes_EE", "JHT_EE", "JP_EE", "PPh21", "TakeHome",
    "Kes_ER", "JHT_ER", "JP_ER", "JKK_ER", "JKM_ER", "Total_ER",
  ];
  const rows = list.map((p) => {
    const c = calcPayrollIntegrated(p);
    return [p.name, p.ptkp, p.honor, p.tunjangan, c.bruto, c.kesEE, c.jhtEE, c.jpEE, c.pph21, c.takeHome, c.kesER, c.jhtER, c.jpER, c.jkkER, c.jkmER, c.totalER];
  });
  return [header, ...rows];
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.rel = "noopener";
  // iPad Safari: append to DOM dulu agar download/share sheet muncul
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export function buildMonthlyAccountingRows(report: {
  period: string; revenue: number; expense: number; netIncome: number; assets: number; liabilities: number;
}) {
  return [
    ["Metrik", "Nilai", "Rumus"],
    ["Periode", report.period, "filter journal status=posted"],
    ["Pendapatan", report.revenue, "\u03a3 journalLines akun revenue"],
    ["Beban", report.expense, "\u03a3 journalLines akun expense"],
    ["Laba/(rugi)", report.netIncome, "pendapatan \u2212 beban"],
    ["Aset", report.assets, "\u03a3 saldo akun asset"],
    ["Liabilitas", report.liabilities, "\u03a3 saldo akun liability"],
  ];
}

export type MonthlyReportLike = {
  period: string; revenue: number; expense: number; netIncome: number; assets: number; liabilities: number;
  entries?: { entryNumber: string; description: string; entryDate: string | Date }[];
};

export type InvoiceLike = {
  invoiceNumber: string; studentName: string; total: number; paidAmount?: number; status: string; dueDate: string | Date;
};

export type TaxRowLike = { taxType: string; taxBase: number; taxAmount: number; dueDate: string | Date };

export function exportMonthlyAccountingPack(opts: {
  report?: MonthlyReportLike | null;
  invoices?: InvoiceLike[];
  taxByType?: TaxRowLike[];
  payroll?: PayrollExportInput[];
}) {
  const period = opts.report?.period ?? new Date().toISOString().slice(0, 7);
  const stamp = period.replace(/[^\d-]/g, "");

  if (opts.report) {
    downloadCsv(`kiddles-dashboard-${stamp}.csv`, buildMonthlyAccountingRows({
      period: opts.report.period, revenue: opts.report.revenue, expense: opts.report.expense,
      netIncome: opts.report.netIncome, assets: opts.report.assets, liabilities: opts.report.liabilities,
    }));
  }

  if (opts.report?.entries?.length) {
    downloadCsv(`kiddles-jurnal-${stamp}.csv`, [
      ["No. jurnal", "Uraian", "Tanggal"],
      ...opts.report.entries.map((e) => [
        e.entryNumber, e.description,
        typeof e.entryDate === "string" ? e.entryDate : new Date(e.entryDate).toISOString().slice(0, 10),
      ]),
    ]);
  }

  if (opts.invoices?.length) {
    downloadCsv(`kiddles-invoice-${stamp}.csv`, [
      ["No. Invoice", "Murid", "Total", "Dibayar", "Outstanding", "Status", "Jatuh tempo"],
      ...opts.invoices.map((inv) => {
        const paid = inv.paidAmount ?? (inv.status === "paid" ? inv.total : 0);
        return [
          inv.invoiceNumber, inv.studentName, inv.total, paid, inv.total - paid, inv.status,
          typeof inv.dueDate === "string" ? inv.dueDate : new Date(inv.dueDate).toISOString().slice(0, 10),
        ];
      }),
    ]);
  }

  if (opts.taxByType?.length) {
    downloadCsv(`kiddles-pajak-${stamp}.csv`, [
      ["Jenis", "Dasar", "Pajak", "Jatuh tempo"],
      ...opts.taxByType.map((t) => [
        t.taxType, t.taxBase, t.taxAmount,
        typeof t.dueDate === "string" ? t.dueDate : new Date(t.dueDate).toISOString().slice(0, 10),
      ]),
    ]);
  }

  if (opts.payroll?.length) {
    downloadCsv(`kiddles-payroll-bpjs-pph21-${stamp}.csv`, buildPayrollExportRows(opts.payroll));
  }
}
