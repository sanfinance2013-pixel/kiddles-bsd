# Rencana Implementasi KIDDLES BSD

## Tujuan
Membangun MVP operasional untuk cabang franchise **KIDDLES BSD** di West Village Business Park 2, D-8, Jalan BSD Raya Pusat, Kabupaten Tangerang, Banten. Antarmuka berbahasa Indonesia, responsif mobile-first, menggunakan Rupiah dan nuansa brand KIDDLES yang ceria.

## Halaman dan alur utama

1. **Dashboard Owner** — ringkasan murid aktif, pendaftar baru, omzet, piutang, pengeluaran, laba, tren omzet, pendaftar, utilisasi kelas, agenda terdekat, dan peringatan operasional.
2. **Pendaftaran & CRM** — pipeline lead dari Baru sampai Daftar/Tidak jadi, follow-up, jadwal trial, dan tombol konversi.
3. **Jadwal & Kelas** — kalender mingguan, daftar kelas, guru, ruang, kapasitas, dan indikator konflik.
4. **Absensi** — sesi hari ini, status hadir/izin/sakit/alpa, serta ringkasan pengisian.
5. **Murid** — tabel murid, program, orang tua, sisa sesi, status, dan tombol tambah murid.
6. **Invoice & Pembayaran** — daftar invoice, status bayar, jatuh tempo, cicilan, bukti transfer, dan pengingat WhatsApp.
7. **Pengeluaran & Laporan** — pengeluaran menurut kategori, honor guru, arus kas, laba/rugi, dan ekspor.
8. **Portal Murid/Orang Tua** — preview pengalaman orang tua untuk jadwal, sisa sesi, absensi, dan tagihan.
9. **Pengaturan** — profil cabang, kategori program, role aktif, dan pengelolaan data contoh.

## Skema data relasional

- `users`: akun dan role Owner/Admin/Guru/Murid-Orang Tua.
- `guardians`: data orang tua/wali.
- `students`: biodata murid, status, program, guardian.
- `teachers`: guru, tarif per sesi/jam, status aktif.
- `classes`: nama kelas, program, guru, ruang/link, hari-jam, kapasitas, term.
- `sessions`: pertemuan kelas, tanggal, durasi, reschedule.
- `attendance`: status kehadiran murid per sesi dan catatan guru.
- `packages`: nama paket, jumlah sesi, masa berlaku, harga, tipe.
- `invoices`: nomor invoice, murid, paket, subtotal, diskon, jatuh tempo, status.
- `payments`: invoice, nominal, metode, tanggal, bukti transfer, verifikator.
- `expenses`: kategori, nominal, tanggal, vendor, catatan.
- `leads`: calon murid, sumber, pipeline status, trial, follow-up, alasan batal.
- `vouchers`: kode, tipe diskon, masa berlaku, kuota.
- `activity_logs`: actor, aksi, entity, waktu, dan metadata perubahan.

MVP yang dipreview memakai data contoh realistis dan state interaktif di frontend agar owner dapat menguji alur dan memahami modul. Struktur starter React/Express/tRPC/Drizzle sudah disiapkan untuk menghubungkan tabel dan prosedur database berikutnya tanpa mengubah pola halaman.

## Pendekatan implementasi

- React + TypeScript + Vite pada starter `web-db-user`.
- Layout dashboard berbasis sidebar dengan mode mobile drawer.
- Navigasi halaman internal tanpa reload menggunakan state route.
- Komponen data tabel, pipeline, kartu KPI, kalender, modal form, toast, dan role switcher.
- Logo KIDDLES pengguna disimpan sebagai asset proyek pada `/manus-storage/...`.
- Endpoint health dan server starter dipertahankan untuk Preview/Publish.
- Format tanggal dan nominal memakai locale `id-ID` serta `Asia/Jakarta`.

## Keputusan desain

### Opsi gaya
- **Playful Learning Console** — dashboard profesional dengan aksen warna logo KIDDLES dan micro-interaction ringan. Probabilitas 0,07.
- **Warm Editorial Academy** — layout editorial hangat dengan panel krem dan tipografi formal. Probabilitas 0,05.
- **Minimal SaaS Neutral** — dashboard putih/abu dengan aksen brand secukupnya. Probabilitas 0,04.

Dipilih: **Playful Learning Console**.

- **Design Movement:** playful editorial dashboard yang memadukan kerapian software operasional dengan energi ruang belajar anak.
- **Core Principles:** jelas untuk owner baru, cepat dipindai, ramah di ponsel, dan selalu memberi konteks tindakan berikutnya.
- **Color Philosophy:** latar krem lembut menjaga layar tetap tenang; magenta, lime, sky blue, dan orange diambil dari logo agar brand terasa hidup tanpa membuat data sulit dibaca. Navy gelap menjadi jangkar kontras.
- **Layout Paradigm:** rail navigasi kiri yang ringkas dan kanvas utama asimetris; KPI mendahului insight, lalu agenda dan alert ditempatkan sebagai “next action” bukan dekorasi.
- **Signature Elements:** garis aksen multiwarna ala logo, pill status berbentuk kapsul, dan kartu insight dengan sudut organik kecil.
- **Interaction Philosophy:** setiap klik memberi umpan balik langsung melalui toast; aksi penting selalu punya label tujuan yang konkret seperti “Jadwalkan trial” atau “Kirim pengingat”.
- **Animation:** transisi panel 180–240ms, chart bars naik lembut, drawer mobile meluncur dari kiri; hindari gerakan yang mengganggu pekerjaan administrasi.
- **Typography System:** Manrope untuk seluruh UI karena bentuknya ramah namun rapi; ukuran judul berani, label kecil uppercase untuk konteks, dan angka KPI memakai weight 800.
- **Brand Essence:** pusat kendali cabang KIDDLES yang membuat operasional kursus Mandarin terasa sederhana; kepribadian: ceria, terarah, hangat.
- **Brand Voice:** judul langsung dan suportif. Contoh: “Semua yang perlu Anda tahu hari ini.” dan “Trial berikutnya tinggal satu langkah.”
- **Wordmark & Logo:** logo KIDDLES asli pengguna tampil di sidebar dan halaman pengaturan, dengan label cabang BSD sebagai lockup sekunder.
- **Signature Brand Color:** magenta logo `#d51662` sebagai warna tindakan utama, dipasangkan dengan lime `#7cc242`, sky `#39a4cc`, dan orange `#f6ae42`.
