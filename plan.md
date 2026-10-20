

## 12. Pengembangan UX: Home Icon Base dan QR sesi kelas

### Konsep halaman utama
Halaman `/` diubah menjadi pusat navigasi berbasis ikon, bukan hanya dashboard tabel. Urutannya adalah header cabang dan identitas pengguna, blok pengumuman terbaru, launcher ikon berdasarkan role, lalu event jadwal kelas terdekat.

Blok pengumuman menampilkan pengumuman operasional dari Owner/Admin, misalnya perubahan jadwal, libur, promo, atau catatan penting. Setiap pengumuman memiliki judul, ringkasan, tanggal, prioritas, dan status sudah dibaca.

Launcher ikon menampilkan tindakan yang relevan dengan role yang sedang terautentikasi. Owner melihat Dashboard, Laporan, Pengumuman, dan Pengaturan. Admin melihat Pendaftaran Murid, Murid, Invoice, Jadwal, Absensi, dan Tugas. Guru melihat Jadwal Saya, Kelas Hari Ini, Scan QR, Catatan Materi, dan Absensi. Murid/Orang Tua melihat Jadwal, QR/Kartu Murid, Sisa Course, Absensi, Invoice, dan Pengumuman. Role switcher yang ada sekarang hanya untuk demo dan tidak boleh menjadi kontrol akses production.

Blok schedule event menampilkan kartu kelas berurutan berdasarkan waktu Asia/Jakarta: nama kelas, program, guru, ruang/link, jumlah murid, status, dan countdown. Kartu memiliki aksi sesuai status: lihat detail, buka absensi, scan QR, catat materi, atau lihat reschedule.

### QR berbasis sesi kelas
Saat pertemuan kelas mendekati waktu mulai, server membuat `session_qr` opaque untuk pertemuan tersebut. QR tidak memuat data pribadi; token disimpan dalam bentuk hash. QR memiliki status `Belum aktif`, `Aktif`, `Ditutup`, atau `Dibatalkan` dan hanya dapat dipakai dalam jendela yang dikonfigurasi, misalnya 15 menit sebelum mulai sampai 30 menit setelah selesai.

Alur yang disarankan: guru yang ditugaskan membuka event kelas, server memvalidasi guru dan status pertemuan, lalu menampilkan mode `Scan QR Murid`. Guru memindai QR kartu murid satu per satu. Setiap scan harus melewati validasi server terhadap QR sesi aktif, guru yang ditugaskan, murid yang terdaftar di kelas, dan status pembayaran/enrollment. Setelah valid, absensi Hadir dicatat idempotent dan sisa course berkurang satu. Scan ulang murid pada sesi yang sama hanya menampilkan `Sudah tercatat` tanpa mengurangi saldo lagi.

Untuk fallback, guru dapat mengetik nomor induk murid jika kamera tidak tersedia. Fallback tetap melewati validasi sesi, role, enrollment, dan idempotency yang sama. Setelah waktu kelas berakhir, QR sesi otomatis ditutup dan tidak dapat dipakai untuk membuat absensi baru tanpa override Admin dengan alasan wajib.

### Model data tambahan
Tambahkan `announcements`, `announcement_reads`, `session_qr_tokens`, dan perluasan `sessions` dengan `starts_at`, `ends_at`, `qr_status`, `qr_activated_at`, `qr_closed_at`, serta `assigned_teacher_id`. Tambahkan unique key untuk `session_id + student_id` pada attendance dan `session_id` pada QR sesi aktif. Job terjadwal hanya mengaktivasi/menutup QR secara idempotent; server tetap menghitung status saat request sehingga tidak bergantung pada job yang tepat waktu.

### Acceptance utama
Home menampilkan pengumuman, icon launcher yang berbeda sesuai role, dan schedule event kelas terdekat. Guru hanya dapat membuka QR untuk kelas yang memang ditugaskan. QR sesi tidak aktif sebelum jendela waktu, aktif pada jadwal, dan tertutup setelah sesi berakhir. Guru dapat scan QR murid, fallback nomor induk tersedia, satu murid tidak dapat tercatat dua kali pada sesi yang sama, dan sisa course berkurang tepat satu hanya untuk status Hadir yang valid.
