# Export Excel — Laporan & Akuntansi

## Di UI (Laporan Bulanan)

1. Pilih periode
2. **Export Excel** — mengunduh CSV:
   - `kiddles-dashboard-YYYY-MM.csv` — pendapatan, beban, laba, aset, liabilitas
   - `kiddles-jurnal-YYYY-MM.csv` — jurnal posted
   - `kiddles-invoice-YYYY-MM.csv` — tagihan & outstanding
   - `kiddles-pajak-YYYY-MM.csv` — rekap pajak masa
3. Buka file di **Microsoft Excel** atau Google Sheets
4. **Unduh semua PDF** tetap tersedia untuk cetak

## Integrasi accounting

Data mengikuti modul:
- `domain.accounting.monthlyReport` (jurnal status=posted)
- `domain.billing.listInvoices`
- `domain.tax.monthlyReport`

Payroll + BPJS + PPh 21: helper `calcPayrollIntegrated` / `buildPayrollExportRows` di `client/src/lib/exportAccountingExcel.ts`.

## Alur lengkap

Print Ready (cek angka + rumus) → Export Excel dan/atau Cetak PDF final.
