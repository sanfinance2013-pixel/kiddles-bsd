# KIDDLES BSD — Outcome MVP

## Dashboard operasional Owner
- [x] Dashboard menampilkan jumlah murid aktif, murid baru bulan ini, omzet bulan ini, piutang, pengeluaran, dan laba.
- [x] Dashboard menampilkan grafik pendaftar, omzet bulanan, utilisasi kelas, agenda terdekat, dan peringatan tagihan/trial/bentrok.

## Pendaftaran dan CRM
- [x] Admin dapat melihat pipeline lead dengan status Baru, Dihubungi, Trial dijadwalkan, Sudah trial, Daftar, dan Tidak jadi.
- [x] Admin dapat membuka form tambah calon murid, mencatat sumber informasi, jadwal trial, follow-up, dan mengonversi lead menjadi murid.

## Jadwal, kelas, dan absensi
- [x] Admin dapat melihat jadwal mingguan dengan filter program/guru/ruang dan indikator bentrok.
- [x] Guru dapat melihat sesi hari ini dan mengisi status hadir, izin, sakit, atau alpa dari tampilan yang ramah ponsel.
- [x] Master kelas menampilkan program, guru, ruang/link online, waktu, kapasitas, dan pengisian kursi.

## Data murid
- [x] Admin dapat melihat tabel murid berisi program, orang tua, sisa sesi, dan status aktif/cuti/berhenti.
- [x] Owner/Admin dapat membuka form tambah murid dan melihat ringkasan data contoh.

## Billing dan pembayaran
- [x] Admin dapat melihat invoice berurutan dengan status Belum bayar, Lunas, Sebagian, Jatuh tempo, dan Dibatalkan.
- [x] Admin dapat membuat invoice, mencatat pembayaran transfer manual, dan mengirim pengingat melalui link WhatsApp.
- [x] Dashboard memberi alert paket hampir habis dan invoice jatuh tempo.

## Keuangan dasar
- [x] Owner dapat melihat pemasukan, pengeluaran, honor guru, arus kas, piutang, dan laba/rugi sederhana.
- [x] Owner/Admin dapat mencatat pengeluaran menurut kategori dan melihat tombol ekspor CSV/PDF.
- [x] Pengaturan royalty/fee franchise tersedia sebagai nilai opsional untuk tahap berikutnya.

## Portal murid/orang tua
- [x] Portal preview memperlihatkan jadwal, sisa sesi, absensi, tagihan, dan status pembayaran murid/orang tua.

## Kualitas dan branding
- [x] Responsif mobile-first dengan logo KIDDLES pengguna, format tanggal Indonesia, Rupiah, dan zona waktu Asia/Jakarta.
- [x] Tombol pengelolaan data contoh tersedia di Pengaturan.
- [x] Halaman Tugas Hari Ini tersedia di `/tasks`, menampilkan tugas berbeda berdasarkan role Owner, Admin, Guru, dan Murid/Orang Tua; setiap kartu punya tautan tindakan dan status selesai untuk sesi demo.
- [x] Home Icon Base frontend tersedia sebagai halaman full-screen: header nama/jabatan, banner pengumuman, launcher ikon berbasis role, kartu Scan QR untuk Guru/Admin, dan to-do/agenda berbasis role; halaman modul lama tetap dapat dibuka melalui navigasi ikon.
- [ ] Hubungkan data layar ke tabel relasional Drizzle dan autentikasi role-based secara penuh pada iterasi backend berikutnya. Layar MVP saat ini sengaja menggunakan data contoh frontend untuk validasi alur dan desain.

## Fondasi API operasional server
- [x] Schema additive tersedia untuk students, packages, invoices, paymentEvidence, sessions, sessionQrTokens, attendance, teacherPayouts, dan activityLogs dengan soft delete serta unique key attendance per sesi/murid.
- [x] API terproteksi menyediakan daftar dan pembuatan murid, pembuatan invoice dengan perhitungan server-side subtotal-diskon-biaya admin-pajak-total, daftar invoice, daftar bukti bayar, dan review bukti bayar.
- [x] API bukti bayar menyimpan object key/stable storage URL, MIME yang dibatasi JPG/PNG/PDF, nominal, status review, actor, dan audit log; persetujuan bukti memperbarui paidAmount/status invoice.
- [x] API jadwal menyediakan sesi mendatang dan aktivasi/penutupan status QR oleh staff; API absensi menolak sesi nonaktif dan membuat absensi idempotent sehingga scan ulang tidak mengurangi saldo dua kali.
- [x] API payroll menyediakan daftar payout guru sebagai dasar increment payroll PDF berikutnya.
- [ ] Hubungkan form frontend ke presigned upload storage dan API domain; tahap ini baru menyediakan kontrak server yang aman dan belum menambahkan upload file langsung di UI.

## Pendaftaran murid, pembayaran, jadwal, dan QR absensi
- [ ] Admin dapat mendaftarkan murid dan orang tua/wali; server membuat nomor induk murid unik, paket aktif, kelas, dan invoice.
- [ ] Paket menyimpan nominal dan jumlah pertemuan; contoh pembayaran Rp1.000.000 untuk 8 pertemuan memberi saldo awal 8 setelah pembayaran diverifikasi Lunas.
- [ ] Invoice memuat nomor invoice, nomor induk, murid, paket, nominal, status pembayaran, tanggal, dan dapat dicetak dari halaman print-friendly/PDF browser.
- [ ] Detail murid menampilkan jadwal, riwayat absensi, pembayaran, dan sisa pertemuan.
- [ ] Absensi dapat dilakukan dengan scan QR murid melalui browser HTTPS atau fallback nomor induk/manual; hanya guru/admin berwenang yang dapat mencatatnya.
- [ ] Satu absensi Hadir mengurangi sisa pertemuan tepat satu kali; scan ulang untuk pertemuan yang sama tidak mengurangi saldo kedua kali. Izin, Sakit, dan Alpa tidak mengurangi saldo.
- [ ] Saat sisa pertemuan menjadi 3, status murid berubah menjadi Sesi hampir habis dan tugas perpanjangan dibuat satu kali.
- [ ] QR tidak memuat data pribadi; server memvalidasi token, murid, kelas, pertemuan aktif, role, dan mencatat activity log.

## Dokumen pembayaran, invoice PDF, dan payroll guru
- [ ] Admin dapat mengambil foto bukti pembayaran melalui kamera browser HTTPS atau mengupload JPG, PNG, dan PDF dari perangkat.
- [ ] Bukti pembayaran tersimpan di durable storage dengan metadata invoice, status Menunggu verifikasi/Disetujui/Ditolak/Perlu diperiksa, catatan admin, dan activity log; OCR hanya menjadi saran dan tidak otomatis melunasi invoice.
- [ ] Invoice dapat di-download sebagai PDF profesional berisi identitas KIDDLES BSD, nomor invoice, nomor induk murid, rincian paket/sesi, subtotal, diskon, biaya admin, pajak bila diaktifkan, total, pembayaran, saldo, jatuh tempo, status, dan informasi verifikasi.
- [ ] Perhitungan pajak, biaya admin, pembulatan, dan harga termasuk pajak berasal dari konfigurasi server; default tarif pajak dan biaya admin adalah 0 sampai Owner menetapkan skema resmi.
- [ ] Invoice lama mempertahankan snapshot perhitungannya dan tidak berubah ketika konfigurasi pajak/biaya admin diperbarui; koreksi invoice memakai workflow audit, bukan edit langsung.
- [ ] Owner/Admin dapat membuat periode payroll guru dari sesi valid, tarif per sesi/jam, bonus, potongan, pajak/withholding bila dikonfigurasi, dan menghasilkan slip honor PDF.
- [ ] Payroll memiliki status Draft, Ditinjau, Disetujui, Dibayar, dan Dibatalkan; bukti transfer payroll dapat diambil melalui kamera atau upload, diverifikasi, dan dibatasi kepada Owner/Admin serta guru terkait.
