# Rencana Implementasi Workflow KIDDLES BSD

## 1. Tujuan dan batasan

Proyek ini melanjutkan web app **KIDDLES BSD** yang sudah ada di `/home/ubuntu/kiddlesbsd`, bukan membuat ulang dari nol. Cabang operasionalnya adalah:

> West Village Business Park 2, D-8, Jalan BSD Raya Pusat, Kabupaten Tangerang, Banten.

Antarmuka tetap berbahasa Indonesia, mobile-first, menggunakan Rupiah dan zona waktu Asia/Jakarta, serta mempertahankan identitas visual KIDDLES, logo pengguna, dan gaya **Playful Learning Console** yang sudah dipreview.

Versi saat ini adalah dashboard frontend dengan data contoh. Perluasan ini mengubahnya menjadi sistem operasional yang digerakkan oleh workflow: setiap status memiliki transisi yang diizinkan, setiap perpindahan memiliki riwayat, dan satu tindakan memicu pembaruan modul lain tanpa input ulang.

Implementasi hanya mencakup kebutuhan dalam lampiran: siklus murid, siklus guru, keuangan/operasional, Tugas Hari Ini per peran, mesin otomasi/notifikasi, keamanan data, data contoh, dan panduan kerja harian. Fitur lain tidak ditambahkan tanpa persetujuan baru.

## 2. Prinsip implementasi

1. **State machine di server.** UI hanya menawarkan aksi yang diizinkan; server menjadi sumber kebenaran untuk status, hak akses, validasi transisi, alasan wajib, dan efek samping.
2. **Satu sumber data.** Perubahan status dan transaksi dibuat melalui service/procedure server yang melakukan efek samping dalam satu transaksi database bila memungkinkan.
3. **Tugas Hari Ini sebagai pusat kerja.** Setiap role langsung melihat pekerjaan yang perlu diselesaikan hari itu. Setiap kartu tugas punya link atau aksi langsung ke tindakan terkait.
4. **Otomasi idempotent.** Setiap event dan pengingat memiliki `dedupe_key`/kunci unik, sehingga retry tidak membuat tugas atau pesan ganda.
5. **Audit lengkap.** Perpindahan status, aksi pengguna, pengiriman notifikasi, dan otomasi dicatat dengan actor, waktu, alasan, entitas, dan metadata perubahan.
6. **Keamanan server-side.** Role Owner, Admin, Guru, dan Murid/Orang Tua diperiksa di server menggunakan Manus OAuth dan permission mapping aplikasi; role switcher demo tidak dipakai sebagai kontrol akses.

## 3. State machine dan transisi yang diizinkan

### 3.1 Calon murid / lead

Status: `Baru`, `Dihubungi`, `Trial dijadwalkan`, `Sudah trial`, `Menunggu pembayaran`, `Terdaftar`, `Tidak jadi`.

Transisi:

- `Baru -> Dihubungi`: admin mencatat follow-up pertama.
- `Dihubungi -> Trial dijadwalkan`: admin memilih slot trial yang tersedia.
- `Trial dijadwalkan -> Sudah trial`: guru menyimpan catatan hasil trial dan rekomendasi level.
- `Sudah trial -> Menunggu pembayaran`: admin memilih paket dan kelas yang sesuai level serta masih memiliki kursi; sistem membuat invoice.
- `Menunggu pembayaran -> Terdaftar`: invoice terkait berubah menjadi `Lunas`; sistem menjalankan aktivasi murid, pendaftaran kelas, penambahan sesi, dan pesan sambutan dalam satu workflow.
- Status pra-terdaftar -> `Tidak jadi`: admin memilih alasan wajib `harga`, `jadwal`, `pindah`, `kurang cocok`, atau `lainnya`.
- `Tidak jadi` tidak boleh diaktifkan kembali lewat edit langsung; jika calon kembali, dibuat event follow-up baru yang mempertahankan riwayat lama.

Otomasi lead:

- Form publik membuat lead `Baru`, membuat tugas follow-up untuk Admin dengan SLA 24 jam, dan menyimpan sumber lead.
- Tugas yang melewati SLA muncul sebagai peringatan merah di Tugas Hari Ini.
- Penjadwalan trial membuat pengingat untuk orang tua melalui struktur pesan dan link `wa.me`.
- Setelah trial, perpindahan status tidak tersedia sebelum catatan hasil dan rekomendasi level diisi.
- Kelas yang ditawarkan hanya yang levelnya cocok dan kursinya tersedia; jika tidak ada, lead masuk daftar tunggu.

### 3.2 Murid

Status: `Aktif`, `Cuti`, `Sesi hampir habis`, `Berhenti`.

Transisi:

- `Terdaftar -> Aktif` pada invoice `Lunas` dan enrolment berhasil.
- `Aktif -> Sesi hampir habis` ketika sisa sesi mencapai 3.
- `Sesi hampir habis -> Aktif` setelah paket baru lunas dan sesi bertambah.
- `Aktif -> Cuti`: admin mencatat tanggal mulai dan selesai; sisa sesi dibekukan.
- `Cuti -> Aktif`: job terjadwal mengaktifkan kembali setelah tanggal selesai.
- `Aktif` atau `Sesi hampir habis -> Berhenti`: alasan wajib `harga`, `jadwal`, `pindah`, `kurang cocok`, atau `lainnya`.

Otomasi murid:

- Absensi `Hadir` mengurangi satu sesi secara atomik dan mencatat sumber perubahan.
- Pada sisa sesi 3 dibuat tugas Admin “Tawarkan perpanjangan”.
- Dua kali tidak hadir berturut-turut membuat flag `berisiko berhenti` dan tugas follow-up.
- Setiap 8 pertemuan atau akhir level membuat tugas Guru untuk evaluasi; setelah disimpan, rapor tersedia untuk orang tua.

### 3.3 Pelamar dan guru

Status pelamar: `Pelamar`, `Seleksi berkas`, `Trial mengajar`, `Diterima`, `Ditolak`.

Status guru: `Aktif`, `Cadangan`, `Nonaktif`.

Transisi dan aturan:

- `Diterima -> Guru Aktif` melalui satu aksi “Terima & mulai onboarding”.
- Onboarding wajib mencentang: kurikulum, SOP, aturan absensi, dan pelatihan sistem.
- Penjadwalan memvalidasi bentrok waktu, level yang boleh diajar, dan jam tersedia.
- Guru wajib mengisi absensi dan catatan materi setiap pertemuan.
- Dua jam setelah kelas selesai tanpa absensi/catatan membuat tugas pengingat Guru; jika tetap kosong, tugas dieskalasikan ke Admin.
- Guru dapat mengajukan berhalangan; Admin memilih guru pengganti atau menjadwalkan ulang. Murid/orang tua menerima pemberitahuan dan pertemuan menyimpan jejak reschedule.
- Honor dihitung dari pertemuan yang benar-benar diajar berdasarkan tarif per sesi atau jam; rekap bulanan dan slip honor PDF dibuat dari data pertemuan tervalidasi.
- Evaluasi guru berkala menggabungkan kehadiran, penilaian orang tua, dan catatan Owner.

### 3.4 Invoice dan pembayaran

Status invoice: `Belum bayar`, `Sebagian`, `Lunas`, `Jatuh tempo`, `Dibatalkan`.

Transisi:

- `Belum bayar -> Sebagian` ketika pembayaran terverifikasi kurang dari total.
- `Belum bayar -> Lunas` ketika pembayaran terverifikasi memenuhi total.
- `Belum bayar` atau `Sebagian -> Jatuh tempo` melalui job tanggal jatuh tempo.
- `Jatuh tempo -> Sebagian` atau `Lunas` saat pembayaran diverifikasi.
- Invoice yang belum lunas dapat `Dibatalkan` oleh role yang berwenang dengan alasan; invoice lunas tidak boleh dibatalkan lewat edit biasa.

Otomasi invoice:

- Pengingat dibuat untuk H-3, hari jatuh tempo, dan H+3 setelah jatuh tempo; setiap pengingat memakai dedupe key.
- Invoice terlambat muncul di Tugas Hari Ini Admin.
- Invoice lunas otomatis membuat pemasukan, mengaktifkan murid, mendaftarkan kelas, dan menambah sesi tanpa input ganda.
- Biaya payment gateway dan royalti franchise dihitung dari konfigurasi Owner; nilai awal yang direncanakan adalah 0% sampai Owner mengisi persentase resmi.

### 3.5 Kelas dan pertemuan

Untuk memenuhi prinsip status pada entitas kelas/pertemuan, rencana ini memakai status operasional berikut:

- Kelas: `Draft`, `Aktif`, `Penuh`, `Nonaktif`.
- Pertemuan: `Terjadwal`, `Berlangsung`, `Selesai`, `Reschedule`, `Dibatalkan`.

Transisi hanya melalui aksi server: publish/nonaktifkan kelas, buka/tutup pertemuan, reschedule dengan alasan, atau batalkan dengan dampak ke peserta. Status `Penuh` tidak menghapus kelas dari jadwal, tetapi mengarahkan lead ke daftar tunggu.

## 4. Satu sumber data dan event workflow

Service domain terpusat akan menjadi satu-satunya jalur untuk aksi penting. Contoh event dan efeknya:

| Event | Efek otomatis |
|---|---|
| `lead.created` | Lead `Baru`, tugas follow-up 24 jam, activity log |
| `trial.scheduled` | Lead `Trial dijadwalkan`, tugas/pengingat orang tua |
| `trial.completed` | Catatan hasil, rekomendasi level, lead `Sudah trial` |
| `invoice.created` | Nomor urut, status `Belum bayar`, tugas sesuai jatuh tempo |
| `payment.verified` | Status invoice dihitung ulang; jika lunas, aktivasi murid/enrolment/sesi/pesan sambutan |
| `attendance.recorded` | Sesi berkurang untuk `Hadir`, status hampir habis, risiko mangkir, evaluasi berkala |
| `leave.started` / `leave.ended` | Status cuti dan aktivasi otomatis berdasarkan tanggal |
| `teacher.absence_requested` | Tugas Admin memilih pengganti/reschedule, notifikasi peserta |
| `session.completed` | Tugas absensi/catatan terlambat, honor eligible |
| `month.closing_started` | Wizard penutupan bulan dan checklist bertahap |

Semua event menyimpan `event_key`, `occurred_at`, `actor_user_id`, entitas sumber, dan hasil. Handler retry memeriksa `event_key` sebelum membuat efek baru.

## 5. Tugas Hari Ini per peran

Route utama baru: `/tasks` atau `/today`, dengan panel yang juga diringkas di dashboard.

- **Admin:** lead melewati SLA, trial hari ini, invoice jatuh tempo/terlambat, murid sesi hampir habis, murid berisiko berhenti, absensi/catatan guru belum diisi, dan jadwal bentrok.
- **Guru:** kelas hari ini, absensi dan catatan materi yang belum diisi, evaluasi berkala.
- **Owner:** murid aktif, omzet berjalan, piutang, kursi kosong, peringatan terpenting, dan progres penutupan bulan.
- **Murid/Orang tua:** jadwal terdekat, tagihan, sisa sesi, absensi, dan rapor terbaru.

Setiap kartu tugas memiliki status `Open`, `In progress`, `Done`, atau `Dismissed` dengan alasan bila ditutup tanpa menyelesaikan sumber masalah. Tugas yang berasal dari event memiliki referensi ke entitas dan deep link tindakan.

## 6. Mesin otomasi dan notifikasi

- Tambahkan tabel aturan otomasi berisi nama aturan, event/cron, waktu relatif, role penerima, status aktif, dan parameter.
- Sediakan pengaturan Owner untuk mengaktifkan/nonaktifkan dan mengubah waktu pengingat H-3, H+0, H+3, SLA follow-up, eskalasi absensi 2 jam, serta evaluasi 8 pertemuan.
- Callback terpusat menggunakan endpoint `/api/scheduled/*` dan diverifikasi dengan kontrak scheduler platform. Handler memproses antrean tugas/pengingat secara idempotent dan mengembalikan 2xx setelah hasil tercatat.
- Template WhatsApp/email dapat diedit Admin. Tahap awal hanya membangun template, log pengiriman, dan link `wa.me`; tidak menggunakan metode WhatsApp tidak resmi. Provider email/WhatsApp resmi akan menjadi adapter yang dapat diaktifkan lewat secret tanpa mengubah workflow.
- Log pengiriman menyimpan template, penerima internal, channel, status, waktu, error ringkas, dan dedupe key. Data pribadi tidak dimasukkan ke URL selain parameter `wa.me` yang sengaja dibuat untuk tindakan Admin.

## 7. Skema database dan migrasi

Database tetap memakai managed MySQL + Drizzle yang sudah tersedia. Tabel domain yang direncanakan:

- `users`, `user_roles`, `guardians`, `students`, `student_status_history`.
- `teacher_applicants`, `teachers`, `teacher_onboarding_checks`, `teacher_evaluations`.
- `programs`, `packages`, `classes`, `class_enrollments`, `waitlists`.
- `sessions`, `attendance`, `lesson_notes`, `student_evaluations`, `report_cards`.
- `leads`, `lead_followups`, `trials`, `trial_notes`.
- `invoices`, `invoice_items`, `payments`, `payment_evidence`.
- `expenses`, `teacher_rates`, `teacher_payouts`, `payout_slips`.
- `tasks`, `automation_rules`, `automation_runs`, `message_templates`, `message_logs`.
- `activity_logs`, `entity_status_history`, `monthly_closings`, `monthly_closing_steps`.
- `branch_settings`, `vouchers`, `demo_seed_runs`.

Kolom lintas tabel: `id`, `created_at`, `updated_at`, `deleted_at` untuk soft delete, dan bila perlu `created_by`/`updated_by`. Status history menyimpan `from_status`, `to_status`, `reason`, `actor_user_id`, dan metadata JSON. Unique key dipasang untuk nomor invoice, enrollment aktif, event automation, dan dedupe notification.

Seed realistis: sekitar 20 murid dalam berbagai status, 4 guru, 6 kelas, lead di semua tahap, invoice dengan semua status, pengeluaran, evaluasi, tugas, dan satu konflik jadwal yang dapat diperbaiki. Tombol hapus data contoh menghapus/menyembunyikan hanya record seed melalui seed run ID, tidak menghapus data operasional pengguna.

Migrasi bersifat additive dan ter-commit. Karena database development dan publication berbagi data, seed/migrasi tidak akan dijalankan ulang secara destruktif saat startup.

## 8. Hak akses dan halaman

Manus OAuth menjadi login default. Server memetakan identitas ke role aplikasi dan memeriksa permission pada setiap procedure. Tidak ada data sensitif di URL; detail murid hanya melalui ID opaque dan pemeriksaan akses server.

Halaman yang dipertahankan/diperluas:

- Dashboard Owner dan ringkasan `/tasks`.
- Pendaftaran & CRM: board, detail lead, follow-up, trial, hasil trial, daftar tunggu, dan konversi.
- Murid: daftar, profil, status/cuti/berhenti, sesi, evaluasi, riwayat status.
- Guru: daftar pelamar, onboarding, jadwal, pengajuan berhalangan, evaluasi, honor/slip.
- Jadwal & Kelas: master kelas, kalender, kapasitas, konflik, reschedule, pertemuan.
- Absensi & catatan materi: pertemuan hari ini, seluruh peserta, penilaian, tugas tertunda.
- Invoice & pembayaran: buat invoice, cicilan, bukti transfer, verifikasi, pengingat.
- Keuangan: pemasukan, pengeluaran, honor, royalty/fee, laporan, dan wizard penutupan bulan.
- Portal murid/orang tua: jadwal, sisa sesi, tagihan, absensi, rapor, bantuan.
- Pengaturan: branch, role, program/paket, aturan otomasi, template pesan, royalty/payment fee, activity log, dan seed data.

## 9. Urutan pengerjaan setelah persetujuan

### Tahap 1 — Fondasi workflow dan Alur Murid

Buat schema inti, autentikasi/permission server, state transition service, activity/status history, seed realistis, endpoint tasks, lalu implementasikan lead → trial → invoice → pembayaran lunas → murid aktif → absensi → sesi berkurang → perpanjangan → evaluasi/rapor.

**Ringkasan tahap:** satu siklus murid dapat dijalankan tanpa input ulang, status tidak dapat melompat, dan riwayat tersimpan.

**Skenario uji utama:** lead baru melewati SLA; trial dicatat; paket penuh masuk daftar tunggu; invoice lunas mengaktifkan murid; hadir mengurangi sesi; sisa 3 membuat tugas; dua mangkir membuat risiko; cuti aktif kembali.

### Tahap 2 — Alur Guru

Tambahkan pelamar, onboarding checklist, validasi penjadwalan, absensi/catatan wajib, pengajuan pengganti, evaluasi guru, honor, rekap, dan slip PDF.

**Ringkasan tahap:** Guru dan Admin melihat tugas yang tepat, konflik terdeteksi sebelum simpan, dan honor hanya berasal dari pertemuan valid.

**Skenario uji utama:** guru baru tidak dapat mengajar sebelum onboarding selesai; jadwal bentrok ditolak; absensi terlambat dieskalasikan; pengganti memberi notifikasi; honor bulan mengikuti sesi yang benar-benar diajar.

### Tahap 3 — Alur Keuangan dan Operasional

Tambahkan state invoice lengkap, pembayaran manual/bukti transfer, pengingat tagihan, expense, fee/royalty configurable, laporan, dan wizard penutupan bulan dengan lock periode.

**Ringkasan tahap:** Owner/Admin dapat menutup satu bulan dengan urutan cek absensi, honor, pengeluaran, piutang, laporan laba/rugi, lalu mengunci angka.

**Skenario uji utama:** invoice sebagian/jatuh tempo/lunas; pengingat tidak dobel; pembayaran lunas masuk pemasukan; periode terkunci menolak edit tanpa prosedur pembukaan resmi.

### Tahap 4 — Tugas Hari Ini dan mesin otomasi terpusat

Satukan event bus ringan, automation rules, cron callback, idempotency, message templates, message logs, dan deep link kartu tugas untuk semua role.

**Ringkasan tahap:** setiap role membuka aplikasi dan langsung melihat pekerjaan hari itu tanpa menyisir modul secara manual.

**Skenario uji utama:** retry callback tidak menggandakan tugas/pesan; aturan dapat dimatikan Owner; tugas selesai dari kartu mengubah sumbernya; error pengiriman dicatat tanpa menggagalkan transaksi utama.

### Tahap 5 — Panduan kerja harian dan hardening

Tambahkan onboarding copy untuk Owner baru, panduan harian Admin/Guru/Owner, audit permission, soft delete, validasi input, pemeriksaan route, check/build, dan checkpoint Git canonical.

## 10. Kriteria selesai

- Satu siklus penuh dapat dijalankan: calon murid masuk, trial, membayar, otomatis aktif, hadir, sesi berkurang, diingatkan perpanjangan, honor guru dan laporan bulanan terbentuk tanpa input ganda.
- Status tidak bisa melompat di luar transisi yang diizinkan dan setiap perpindahan tercatat dengan siapa, kapan, dan alasan bila wajib.
- Tiap role membuka aplikasi dan langsung melihat daftar tugas yang perlu dikerjakan hari itu.
- Otomasi dapat diaktifkan/dimatikan, diubah waktunya, retry dengan aman, dan tidak menggandakan efek.
- Data pribadi anak dibatasi sesuai role, record mendukung soft delete, dan seed demo dapat dihapus tanpa menghapus data operasional.
- `pnpm check`, build produksi, manifest route, endpoint health, dan inspeksi visual desktop/mobile lulus sebelum checkpoint.

## 11. Keputusan yang perlu dikonfirmasi sebelum implementasi

1. Threshold dari lampiran dipakai persis: sisa sesi **3**, evaluasi setiap **8** pertemuan, dan risiko berhenti setelah **2** kali tidak hadir berturut-turut.
2. Royalti franchise dan biaya payment gateway dimulai dari **0%** dan dapat diisi Owner di Pengaturan. Jika ada angka resmi, masukkan sejak awal.
3. Status kelas/pertemuan yang diusulkan di atas (`Draft/Aktif/Penuh/Nonaktif` dan `Terjadwal/Berlangsung/Selesai/Reschedule/Dibatalkan`) disetujui.
4. Login aplikasi menggunakan **Manus OAuth** sebagai default, dengan mapping role aplikasi di database.
5. Tahap awal pesan hanya menyiapkan template, log, dan link `wa.me`; integrasi provider resmi tidak diaktifkan sebelum kredensial dan provider dipilih.
6. Pengerjaan dilakukan berurutan Tahap 1 → 2 → 3 → 4 → 5, dengan ringkasan dan skenario uji setelah setiap tahap seperti diminta lampiran.

## 12. Struktur proyek yang akan dipakai

- `client/src/pages/`: halaman operasional dan portal yang sudah ada, diperluas dengan Today Tasks, guru, closing, dan detail workflow.
- `client/src/components/`: kartu tugas, status transition dialog, timeline riwayat, filter, form validasi, dan komponen tabel.
- `client/src/lib/`: formatter tanggal/Rupiah, permission helper UI, API client, dan route metadata.
- `server/routers.ts`: procedure query/mutation yang sudah dilindungi role.
- `server/workflows/`: transition service dan event handlers per domain.
- `server/automation/`: scheduler callback, rule evaluator, idempotency, tasks, dan message log.
- `server/db.ts` + `drizzle/schema.ts` + `drizzle/`: schema, query, migration, dan seed version.
- `server/storage.ts`: bukti pembayaran, slip honor, dan rapor dengan index metadata di database.
- `public/manus-routes.json`: manifest seluruh halaman baru.
- `plan.md` dan `TODO.md`: keputusan, acceptance clauses, serta progres yang dipertahankan tiap tahap.
