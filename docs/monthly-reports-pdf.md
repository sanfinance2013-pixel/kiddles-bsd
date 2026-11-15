# Laporan Bulanan — Unduh PDF

Halaman **Laporan Bulanan** mendukung unduh PDF untuk semua jenis laporan:

1. **Laporan keuangan** — pendapatan, beban, laba-rugi, aset, liabilitas, jurnal
2. **Laporan pajak masa** — rekap PPh/PPN per jenis
3. **Laporan invoice & penagihan** — tagihan, pelunasan, outstanding
4. **Laporan murid & sisa sesi** — snapshot murid dan paket hampir habis

## UI

- Pilih periode (bulan)
- Tombol **Unduh PDF** pada setiap kartu laporan
- Tombol **Unduh semua PDF** membuka 4 dokumen berurutan (izinkan popup browser)

## Implementasi

Fungsi `MonthlyReportsPage` di `client/src/pages/Home.tsx` memakai `openPrintDocument` (cetak → Save as PDF).

Setelah restore `Home.tsx`, pastikan versi halaman laporan sudah menyertakan `downloadAll`, `printFinance`, `printTax`, `printBilling`, dan `printStudents`.
