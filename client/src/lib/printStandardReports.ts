/**
 * Template cetak standar KIDDLES BSD (layout A4 + data dummy default).
 * Dipakai dari Home.tsx — printPayroll, laporan BPJS, PPh 21, invoice, keuangan.
 */

export type MoneyFn = (n: number) => string;
export type EscapeFn = (s: string) => string;

const ADDR = "West Village Business Park 2, D-8 · Kabupaten Tangerang";

/** CSS bersama untuk dokumen standar */
export const standardPrintCss = `
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", Arial, sans-serif; color: #17202b; margin: 0; line-height: 1.4; font-size: 12px; }
.doc { max-width: 720px; margin: auto; }
.head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 3px solid #17202b; padding-bottom: 12px; margin-bottom: 14px; }
.brand { font-size: 20px; font-weight: 800; letter-spacing: -0.03em; }
.muted { color: #68717b; font-size: 11px; }
.meta { text-align: right; font-size: 11px; }
h1 { font-size: 18px; margin: 0 0 10px; }
h2 { font-size: 12px; margin: 16px 0 6px; font-weight: 700; }
.box { background: #eef4fb; padding: 10px 12px; border-radius: 8px; margin: 10px 0; }
.box.orange { background: #fff4e8; }
.box.green { background: #e8f5ef; }
table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 4px; }
th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #dfe2df; vertical-align: top; }
th { background: #f0f1ef; font-weight: 700; }
td.num, th.num { text-align: right; white-space: nowrap; }
tr.total td { background: #e8f5ef; font-weight: 700; border-bottom: 0; }
tr.ded td { background: #fff4e8; font-weight: 700; }
tr.info td { background: #eef4fb; font-weight: 700; }
.footer { margin-top: 20px; border-top: 1px solid #dfe2df; padding-top: 8px; font-size: 10px; color: #68717b; }
.signature { display: flex; justify-content: space-between; margin-top: 36px; text-align: center; font-size: 11px; }
.signature div { min-width: 160px; }
.signature .line { border-top: 1px solid #17202b; margin-top: 40px; padding-top: 6px; }
.badge { display: inline-block; font-size: 10px; background: #fdecef; padding: 2px 8px; border-radius: 999px; margin-left: 6px; }
ul.check { margin: 6px 0; padding-left: 18px; }
@media print { .no-print { display: none !important; } }
`;

/** Deteksi iOS / iPadOS (termasuk iPad desktop-mode Safari). */
function isIOSLike() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1;
  return iOS || iPadOS;
}

function buildFullHtml(title: string, bodyHtml: string) {
  const safeTitle = title.replace(/</g, "");
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safeTitle}</title><style>${standardPrintCss}
.no-print-bar { position: sticky; top: 0; z-index: 9; display: flex; gap: 8px; flex-wrap: wrap; padding: 10px 12px; background: #f4f5f3; border-bottom: 1px solid #dfe2df; font-family: system-ui, sans-serif; }
.no-print-bar button, .no-print-bar a { font-size: 14px; padding: 10px 14px; border-radius: 8px; border: 0; background: #17202b; color: #fff; text-decoration: none; cursor: pointer; }
.no-print-bar .ghost { background: #fff; color: #17202b; border: 1px solid #c9cdc8; }
</style></head><body>
<div class="no-print no-print-bar">
  <button type="button" onclick="window.print()">Cetak / Simpan PDF</button>
  <span style="font-size:12px;color:#68717b;align-self:center">iPad: ketuk tombol lalu pilih <b>Save as PDF</b> / Print</span>
</div>
<main class="doc">${bodyHtml}</main>
<script>
window.onload = function () {
  // Di desktop: auto print. Di iPad: biarkan user ketuk tombol (auto-print sering gagal).
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!ios) { try { window.focus(); window.print(); } catch (e) {} }
};
</script>
</body></html>`;
}

/** Unduh file HTML laporan — paling andal di iPad (Files app → buka → Share → Print). */
export function downloadReportHtml(filename: string, title: string, bodyHtml: string) {
  const html = buildFullHtml(title, bodyHtml);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".html") ? filename : `${filename}.html`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

/**
 * Cetak dokumen standar.
 * - Desktop: popup + auto print
 * - iPad / popup diblokir: iframe print + unduh HTML sebagai cadangan
 */
export function openStandardPrint(title: string, bodyHtml: string): boolean {
  const html = buildFullHtml(title, bodyHtml);
  const safeName = title.replace(/[^\w\u00C0-\u024f\s-]/gi, "").trim().replace(/\s+/g, "-").slice(0, 60) || "laporan-kiddles";

  // 1) Coba tab/popup baru
  let printWindow: Window | null = null;
  try {
    printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=760");
  } catch {
    printWindow = null;
  }

  if (printWindow) {
    try {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      // iPad: juga unduh HTML supaya bisa dibuka offline / Share Sheet
      if (isIOSLike()) {
        downloadReportHtml(`${safeName}.html`, title, bodyHtml);
      }
      return true;
    } catch {
      try { printWindow.close(); } catch { /* ignore */ }
    }
  }

  // 2) Fallback iframe (beberapa browser iOS mengizinkan print dari iframe)
  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", title);
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch { /* ignore */ }
        setTimeout(() => iframe.remove(), 5000);
      }, 400);
    }
  } catch {
    /* ignore */
  }

  // 3) Selalu sediakan unduhan HTML di iPad / jika popup gagal
  downloadReportHtml(`${safeName}.html`, title, bodyHtml);
  return true;
}

function head(titleLines: string[], money?: MoneyFn) {
  return `<div class="head"><div><div class="brand">KIDDLES BSD</div><div class="muted">Kids Learning Chinese · ${ADDR}</div></div><div class="meta">${titleLines.map((l) => `<div>${l}</div>`).join("")}</div></div>`;
}

/** Dummy default untuk slip standar */
export const DUMMY_SLIP = {
  name: "Kak Sari Wijaya",
  nik: "3171010101010002",
  job: "Guru Primary",
  status: "PKWT / Penerima upah",
  npwp: "10.0.1.3-000.000",
  ptkp: "K/1",
  bpjsKes: "0001234567890",
  bpjsTk: "TK-2024-000987",
  period: "November 2026",
  payDate: "05 Des 2026",
  honor: 9_000_000,
  tunjangan: 500_000,
  sessionsNote: "36 sesi × Rp 250.000",
  terRate: 0.015,
  jkkRate: 0.0024,
};

export function buildStandardSlipHtml(
  money: MoneyFn,
  esc: EscapeFn,
  input: Partial<typeof DUMMY_SLIP> = {},
): string {
  const d = { ...DUMMY_SLIP, ...input };
  const bruto = d.honor + d.tunjangan;
  const capKes = Math.min(bruto, 12_000_000);
  const capJp = Math.min(bruto, 11_086_300);
  const kesEE = Math.round(capKes * 0.01);
  const jhtEE = Math.round(bruto * 0.02);
  const jpEE = Math.round(capJp * 0.01);
  const pph = Math.round(bruto * d.terRate);
  const pot = kesEE + jhtEE + jpEE + pph;
  const nett = bruto - pot;
  const kesER = Math.round(capKes * 0.04);
  const jhtER = Math.round(bruto * 0.037);
  const jpER = Math.round(capJp * 0.02);
  const jkkER = Math.round(bruto * d.jkkRate);
  const jkmER = Math.round(bruto * 0.003);
  const erTot = kesER + jhtER + jpER + jkkER + jkmER;
  const terPct = (d.terRate * 100).toFixed(1).replace(/\.0$/, "");

  return `
    ${head([`<strong>SLIP GAJI / BUKTI PEMBAYARAN UPAH</strong>`, `Periode: ${esc(d.period)}`, `Tgl bayar: ${esc(d.payDate)}`])}
    <div class="muted" style="margin-bottom:10px">Sesuai PP 36/2021 · BPJS · PPh 21 TER (PMK 168/2023) <span class="badge">DATA DUMMY / PREVIEW</span></div>
    <h2>A. Identitas pekerja</h2>
    <table>
      <tr><td><strong>Nama</strong></td><td>${esc(d.name)}</td><td><strong>NIK</strong></td><td>${esc(d.nik)}</td></tr>
      <tr><td><strong>Jabatan</strong></td><td>${esc(d.job)}</td><td><strong>Status kerja</strong></td><td>${esc(d.status)}</td></tr>
      <tr><td><strong>NPWP</strong></td><td>${esc(d.npwp)}</td><td><strong>PTKP</strong></td><td>${esc(d.ptkp)}</td></tr>
      <tr><td><strong>No. BPJS Kes</strong></td><td>${esc(d.bpjsKes)}</td><td><strong>No. BPJS TK</strong></td><td>${esc(d.bpjsTk)}</td></tr>
    </table>
    <h2>B. Penghasilan (bruto)</h2>
    <table>
      <tr><th>Komponen</th><th>Keterangan</th><th class="num">Nominal</th></tr>
      <tr><td>Honor / upah pokok</td><td>${esc(d.sessionsNote)}</td><td class="num">${money(d.honor)}</td></tr>
      <tr><td>Tunjangan tetap</td><td>Transport &amp; komunikasi</td><td class="num">${money(d.tunjangan)}</td></tr>
      <tr><td>Tunjangan tidak tetap</td><td>—</td><td class="num">${money(0)}</td></tr>
      <tr class="total"><td colspan="2">Total penghasilan bruto (A)</td><td class="num">${money(bruto)}</td></tr>
    </table>
    <h2>C. Potongan karyawan</h2>
    <table>
      <tr><th>Komponen</th><th>Dasar / tarif</th><th class="num">Nominal</th></tr>
      <tr><td>BPJS Kesehatan (EE)</td><td>1% × min(bruto, 12 jt)</td><td class="num">(${money(kesEE)})</td></tr>
      <tr><td>JHT (EE)</td><td>2% × bruto</td><td class="num">(${money(jhtEE)})</td></tr>
      <tr><td>JP (EE)</td><td>1% × min(bruto, batas JP)</td><td class="num">(${money(jpEE)})</td></tr>
      <tr><td>PPh 21 (TER)</td><td>bruto × TER ~${terPct}% (${esc(d.ptkp)})</td><td class="num">(${money(pph)})</td></tr>
      <tr class="ded"><td colspan="2">Total potongan (B)</td><td class="num">(${money(pot)})</td></tr>
      <tr class="total"><td colspan="2">TAKE-HOME PAY (A − B)</td><td class="num">${money(nett)}</td></tr>
    </table>
    <h2>D. Iuran ditanggung pemberi kerja (tidak dipotong dari gaji)</h2>
    <table>
      <tr><th>Program</th><th>Tarif</th><th class="num">Nominal</th></tr>
      <tr><td>BPJS Kes (ER)</td><td>4% × dasar</td><td class="num">${money(kesER)}</td></tr>
      <tr><td>JHT (ER)</td><td>3,7% × upah</td><td class="num">${money(jhtER)}</td></tr>
      <tr><td>JP (ER)</td><td>2% × dasar</td><td class="num">${money(jpER)}</td></tr>
      <tr><td>JKK</td><td>${(d.jkkRate * 100).toFixed(2)}% × upah</td><td class="num">${money(jkkER)}</td></tr>
      <tr><td>JKM</td><td>0,3% × upah</td><td class="num">${money(jkmER)}</td></tr>
      <tr class="info"><td colspan="2">Total iuran perusahaan</td><td class="num">${money(erTot)}</td></tr>
    </table>
    <div class="signature">
      <div>Dibuat oleh Admin<div class="line">Nama &amp; tanda tangan</div></div>
      <div>Diterima oleh Pekerja<div class="line">Nama &amp; tanda tangan</div></div>
    </div>
    <div class="footer">Dokumen internal KIDDLES BSD. Bukan slip resmi e-Dabu/SIPP. Angka dapat diganti dari data payroll live.</div>
  `;
}

export function printStandardSlip(money: MoneyFn, esc: EscapeFn, input?: Partial<typeof DUMMY_SLIP>) {
  const d = { ...DUMMY_SLIP, ...input };
  return openStandardPrint(`Slip Gaji ${d.name}`, buildStandardSlipHtml(money, esc, input));
}

export function printStandardBpjs(money: MoneyFn, esc: EscapeFn, period = "November 2026") {
  // dummy 2 workers derived from slip math
  const workers = [
    { name: "Kak Sari Wijaya", bruto: 9_500_000 },
    { name: "Kak Andi Pratama", bruto: 7_200_000 },
  ];
  const rows = workers.map((w) => {
    const kesEE = Math.round(Math.min(w.bruto, 12e6) * 0.01);
    const jhtEE = Math.round(w.bruto * 0.02);
    const jpEE = Math.round(Math.min(w.bruto, 11_086_300) * 0.01);
    const kesER = Math.round(Math.min(w.bruto, 12e6) * 0.04);
    const jhtER = Math.round(w.bruto * 0.037);
    const jpER = Math.round(Math.min(w.bruto, 11_086_300) * 0.02);
    const jkk = Math.round(w.bruto * 0.0024);
    const jkm = Math.round(w.bruto * 0.003);
    const er = kesER + jhtER + jpER + jkk + jkm;
    return { ...w, kesEE, jhtEE, jpEE, er };
  });
  const sumEE = rows.reduce((s, r) => s + r.kesEE + r.jhtEE + r.jpEE, 0);
  const sumER = rows.reduce((s, r) => s + r.er, 0);
  const body = `
    ${head([`<strong>LAPORAN IURAN BPJS BULANAN</strong>`, `Masa: ${esc(period)}`, `Jatuh tempo setor: 10–15 bulan berikutnya`])}
    <div class="muted" style="margin-bottom:10px">Rekonsiliasi internal sebelum setor eDabu / SIPP <span class="badge">DATA DUMMY</span></div>
    <h2>1. Ringkasan (agregat dummy)</h2>
    <table>
      <tr><th>Program</th><th>Tarif ER</th><th>Tarif EE</th><th class="num">Perusahaan</th><th class="num">Karyawan</th></tr>
      <tr><td>BPJS Kesehatan</td><td>4%</td><td>1%</td><td class="num">${money(rows.reduce((s, r) => s + Math.round(Math.min(r.bruto, 12e6) * 0.04), 0))}</td><td class="num">${money(rows.reduce((s, r) => s + r.kesEE, 0))}</td></tr>
      <tr><td>JHT</td><td>3,7%</td><td>2%</td><td class="num">${money(rows.reduce((s, r) => s + Math.round(r.bruto * 0.037), 0))}</td><td class="num">${money(rows.reduce((s, r) => s + r.jhtEE, 0))}</td></tr>
      <tr><td>JP</td><td>2%</td><td>1%</td><td class="num">${money(rows.reduce((s, r) => s + Math.round(Math.min(r.bruto, 11_086_300) * 0.02), 0))}</td><td class="num">${money(rows.reduce((s, r) => s + r.jpEE, 0))}</td></tr>
      <tr class="total"><td colspan="3">TOTAL</td><td class="num">${money(sumER)}</td><td class="num">${money(sumEE)}</td></tr>
    </table>
    <h2>2. Rincian per pekerja</h2>
    <table>
      <tr><th>Nama</th><th class="num">Upah dasar</th><th class="num">Kes EE</th><th class="num">JHT EE</th><th class="num">JP EE</th><th class="num">Total ER</th></tr>
      ${rows.map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${money(r.bruto)}</td><td class="num">${money(r.kesEE)}</td><td class="num">${money(r.jhtEE)}</td><td class="num">${money(r.jpEE)}</td><td class="num">${money(r.er)}</td></tr>`).join("")}
    </table>
    <h2>3. Checklist setor</h2>
    <ul class="check">
      <li>Hitung ulang iuran vs daftar upah final</li>
      <li>Setor BPJS Kesehatan via eDabu (batas ~tgl 10)</li>
      <li>Setor BPJS TK via SIPP (batas ~tgl 15)</li>
      <li>Simpan bukti bayar &amp; rekonsiliasi dengan slip gaji</li>
    </ul>
    <div class="footer">Bukan formulir resmi BPJS. DATA DUMMY untuk preview layout di app.</div>
  `;
  return openStandardPrint(`Laporan BPJS ${period}`, body);
}

export function printStandardPph21(money: MoneyFn, esc: EscapeFn, period = "November 2026") {
  const rows = [
    { name: "Kak Sari Wijaya", npwp: "10.0.1.3-000.000", ptkp: "K/1", bruto: 9_500_000, pph: 142_500 },
    { name: "Kak Andi Pratama", npwp: "10.0.1.1-000.000", ptkp: "TK/0", bruto: 7_200_000, pph: 90_000 },
  ];
  const total = rows.reduce((s, r) => s + r.pph, 0);
  const body = `
    ${head([`<strong>REKAP PPh 21 MASA</strong>`, `Masa pajak: ${esc(period)}`, `NPWP Pemotong: 10.0.0.1-000.000`])}
    <div class="muted" style="margin-bottom:10px">Metode TER (PMK 168/2023) · dokumen internal <span class="badge">DATA DUMMY</span></div>
    <h2>A. Objek pemotongan</h2>
    <table>
      <tr><th>Jenis penghasilan</th><th class="num">Dasar</th><th>Metode</th><th class="num">PPh 21</th></tr>
      ${rows.map((r) => `<tr><td>Pegawai tetap / honor guru</td><td class="num">${money(r.bruto)}</td><td>TER bulanan</td><td class="num">${money(r.pph)}</td></tr>`).join("")}
      <tr class="total"><td colspan="3">Total PPh 21 masa</td><td class="num">${money(total)}</td></tr>
    </table>
    <h2>B. Rincian per penerima</h2>
    <table>
      <tr><th>Nama</th><th>NPWP/NIK</th><th>PTKP</th><th class="num">Bruto</th><th class="num">PPh 21</th><th class="num">Netto*</th></tr>
      ${rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.npwp)}</td><td>${esc(r.ptkp)}</td><td class="num">${money(r.bruto)}</td><td class="num">${money(r.pph)}</td><td class="num">${money(r.bruto - r.pph)}</td></tr>`).join("")}
    </table>
    <p class="muted">*Netto = bruto − PPh saja (belum potongan BPJS EE)</p>
    <h2>C. Catatan metode</h2>
    <ul class="check">
      <li>Jan–Nov: PPh 21 pegawai tetap = bruto × TER (PP 58/2023 jo. PMK 168/2023).</li>
      <li>Kategori TER dari PTKP. Angka dummy bersifat ilustrasi.</li>
      <li>Desember: hitung ulang setahun tarif Pasal 17 − potongan Jan–Nov.</li>
      <li>Bukan bukti potong / e-Bupot resmi DJP.</li>
    </ul>
    <div class="footer">DATA DUMMY · Verifikasi tarif TER dengan tabel resmi sebelum pelaporan.</div>
  `;
  return openStandardPrint(`Rekap PPh 21 ${period}`, body);
}

export function printStandardInvoice(
  money: MoneyFn,
  esc: EscapeFn,
  inv: { id: string; student: string; packageName: string; amount: number; due: string; status: string },
) {
  const body = `
    ${head([`<strong>INVOICE</strong>`, esc(inv.id), esc(inv.due)])}
    <h1>Tagihan Program Belajar</h1>
    <div class="box"><strong>Ditagihkan kepada</strong><br>${esc(inv.student)}<br><span class="muted">Program ${esc(inv.packageName)} · Cabang KIDDLES BSD</span></div>
    <h2>Rincian pembayaran</h2>
    <table>
      <tr><th>Deskripsi</th><th class="num">Nominal</th></tr>
      <tr><td>${esc(inv.packageName)}</td><td class="num">${money(inv.amount)}</td></tr>
      <tr><td>Biaya administrasi</td><td class="num">${money(0)}</td></tr>
      <tr><td>Pajak</td><td class="num">${money(0)}</td></tr>
      <tr class="total"><td>Total tagihan</td><td class="num">${money(inv.amount)}</td></tr>
    </table>
    <div class="box orange"><strong>Status: ${esc(inv.status)}</strong><br><span class="muted">Jatuh tempo: ${esc(inv.due)} · Transfer BCA 1234567890 a.n. KIDDLES BSD · cantumkan no. invoice di berita transfer.</span></div>
    <div class="footer">Dokumen internal KIDDLES BSD · dapat digunakan sebagai bukti tagihan.</div>
  `;
  return openStandardPrint(`Invoice ${inv.id}`, body);
}
