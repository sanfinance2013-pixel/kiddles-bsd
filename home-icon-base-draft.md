# Draft UI — KIDDLES BSD Home Icon Base

> Dokumen ini adalah draft tampilan yang sudah disetujui. Increment frontend Home Icon Base sudah diterapkan; database, QR server, dan permission production belum diimplementasikan pada tahap ini.

## 1. Arah desain

Home setelah login menjadi halaman penuh sebagai pusat aktivitas harian. Sidebar/menu bar lama dihilangkan dari halaman utama dan diganti dengan launcher ikon. User langsung melihat nama, jabatan, pengumuman, menu utama, dan pekerjaan terdekat tanpa harus membuka dashboard tabel terlebih dahulu.

Untuk **Parent** dan **Teacher**, halaman dibuat ringkas agar seluruh aktivitas utama terlihat cepat di satu layar. Untuk **Admin** dan **Owner**, halaman lebih panjang dengan beberapa kelompok ikon dan daftar pekerjaan yang dapat di-scroll ke bawah.

Gaya tetap mengikuti identitas KIDDLES: hangat, fun learning, warna pink-lime-blue-orange, kartu rounded, tipografi bersih, dan logo KIDDLES pada header.

## 2. Wireframe struktur umum

```text
┌─────────────────────────────────────────────────────────────┐
│  [Logo KIDDLES]                         [Bell] [Avatar]     │
│  KIDDLES BSD                                                 │
│                                                             │
│  Selamat pagi, Sarah                                        │
│  Owner · KIDDLES BSD                                       │
├─────────────────────────────────────────────────────────────┤
│  PENGUMUMAN                                                  │
│  ◀  [ Banner 1: Libur kelas 28 Oktober ]  [1/3]  ▶         │
│     Perubahan jadwal / promo / catatan cabang               │
├─────────────────────────────────────────────────────────────┤
│  AKSES CEPAT                                                 │
│                                                             │
│  [▣]        [◉]        [□]        [◎]        [＋]           │
│  Jadwal     Scan QR    Murid     Invoice    Tugas           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  TUGAS & AGENDA HARI INI                                    │
│  • Kelas berikutnya                         10:00           │
│  • Follow-up pembayaran                     12:00           │
│  • Isi absensi Primary B                    13:30           │
│                                                             │
│  [Lihat semua tugas]                                        │
└─────────────────────────────────────────────────────────────┘
```

Pada perangkat mobile, banner dapat digeser kiri/kanan dengan swipe. Pada desktop/iPad, tersedia tombol panah kiri/kanan dan indikator jumlah slide.

## 3. Header user dan jabatan

Header menampilkan logo KIDDLES, nama user, jabatan, cabang aktif, notifikasi, dan avatar. Contoh:

```text
Selamat pagi, Kak Sarah
Owner · KIDDLES BSD
```

Role yang digunakan:

| Role | Label tampilan | Fokus Home |
|---|---|---|
| Parent | Orang Tua / Parent | Jadwal anak, sisa course, invoice, pengumuman |
| Teacher | Guru / Teacher | Jadwal mengajar, kelas berikutnya, scan absensi, catatan materi |
| Admin | Admin Operasional | Pendaftaran, billing, jadwal, absensi, tugas, follow-up |
| Owner | Owner Cabang | Ringkasan bisnis, pengumuman, keuangan, laporan, kontrol operasional |

Nama dan jabatan harus berasal dari user login/server pada versi production. Dropdown role yang ada sekarang hanya boleh dipakai untuk demo dan tidak menjadi kontrol keamanan.

## 4. Banner pengumuman swipeable

Banner berada tepat di bawah header. Setiap kartu dapat berisi:

- Label prioritas: Penting, Informasi, Promo, Jadwal
- Judul pengumuman
- Ringkasan maksimal 2–3 baris
- Tanggal terbit
- Tombol detail bila ada
- Warna berbeda sesuai jenis pengumuman

Contoh slide:

```text
[PENTING]
Perubahan jadwal kelas Primary B
Jumat, 24 Oktober pindah ke Ruang 02.
[ Lihat detail ]                              1 / 3
```

Interaction:

- Swipe kiri/kanan di mobile dan iPad.
- Tombol panah di desktop.
- Auto-slide opsional setiap 6–8 detik, berhenti saat user menyentuh banner.
- Pengumuman yang dibaca diberi status `Sudah dibaca`.
- Pengumuman penting tetap berada di urutan pertama sampai dibaca.

## 5. Launcher icon menggantikan menu bar

Menu utama tidak tampil sebagai sidebar pada Home. Setiap menu menjadi ikon dengan label singkat, warna kategori, dan badge jumlah pekerjaan.

### Parent / Orang Tua

```text
[Jadwal Anak] [Sisa Course] [Absensi]
[Invoice]     [Rapor]       [Pengumuman]
```

Informasi paling penting ditampilkan di bawah ikon:

```text
Nadine Putri
Kinder A · Besok 08:30
Sisa course: 6 sesi
Tagihan berikutnya: Rp1.000.000
```

### Teacher / Guru

```text
[Jadwal Saya] [Kelas Berikutnya] [Scan QR]
[Absensi]     [Catatan Materi]   [Evaluasi]
```

Ikon `Scan QR` menjadi tombol utama dengan ukuran lebih besar karena merupakan aksi utama guru saat kelas berlangsung.

### Admin

```text
[Pendaftaran] [Murid]     [Invoice]    [Pembayaran]
[Jadwal]      [Absensi]   [Scan QR]    [Tugas]
[Pengumuman]  [Laporan]   [Pengaturan]
```

Jika ikon terlalu banyak pada layar kecil, ikon dikelompokkan menjadi:

- Operasional
- Keuangan
- Komunikasi
- Pengaturan

### Owner

```text
[Dashboard] [Keuangan] [Laporan] [Murid Aktif]
[Jadwal]    [Payroll]  [Pengumuman] [Pengaturan]
```

Owner melihat badge untuk angka penting seperti piutang, payroll menunggu persetujuan, dan konflik jadwal.

## 6. Kartu Scan Absensi

Untuk Teacher dan Admin, Scan QR menjadi kartu besar di bawah launcher atau menjadi ikon pertama jika terdapat kelas aktif.

```text
┌────────────────────────────────────────────┐
│  SCAN ABSENSI                              │
│  Primary B — P2                            │
│  Hari ini · 10:00 · Kak Daniel             │
│                                            │
│        [ BUKA KAMERA & SCAN QR ]           │
│  QR aktif sampai 11:45                     │
│  5 dari 7 murid sudah hadir                │
└────────────────────────────────────────────┘
```

Jika belum waktunya:

```text
QR belum aktif
QR akan aktif 15 menit sebelum kelas dimulai.
```

Jika kelas sudah selesai:

```text
QR sudah ditutup
Hubungi Admin jika perlu koreksi dengan alasan.
```

Teacher hanya melihat kelas yang ditugaskan. Admin dapat melihat semua kelas sesuai permission. Parent tidak melihat tombol scan guru; Parent hanya melihat status absensi anak.

## 7. To-do dan agenda berdasarkan role

### Teacher

Urutan list:

1. Kelas berikutnya.
2. Scan absensi kelas aktif.
3. Absensi/catatan materi yang belum diselesaikan.
4. Kelas hari ini berikutnya.
5. Evaluasi murid yang sudah mencapai 8 pertemuan.

Contoh:

```text
TUGAS MENGAJAR
[●] Primary B — P2                 10:00
    7 murid · Ruang 03 · Scan QR
[ ] Isi catatan Kinder A            12:00
[ ] Evaluasi William Hartono        Jumat
```

### Parent

Urutan list:

1. Jadwal kelas anak berikutnya.
2. Sisa course.
3. Invoice belum lunas.
4. Absensi terakhir.
5. Pengumuman dari cabang.

Contoh:

```text
AGENDA ANAK
[Calendar] Nadine · Kinder A        Besok 08:30
[Wallet]   Invoice berikutnya        Rp1.000.000
[Book]     Sisa course               6 sesi
```

### Admin

Urutan list:

1. Trial hari ini.
2. Follow-up lead yang melewati SLA.
3. Invoice jatuh tempo.
4. Bukti pembayaran menunggu verifikasi.
5. Murid dengan sisa course 3 sesi.
6. Guru belum mengisi absensi/catatan.
7. Bentrok jadwal.

Admin dapat scroll ke bawah untuk melihat seluruh kelompok operasional, billing, dan komunikasi.

### Owner

Urutan list:

1. Ringkasan murid aktif dan murid baru.
2. Omzet, piutang, dan pemasukan hari ini.
3. Payroll guru menunggu persetujuan.
4. Invoice dan bukti pembayaran yang belum diverifikasi.
5. Konflik jadwal dan kapasitas kelas.
6. Pengumuman penting cabang.

Owner dapat scroll ke bawah untuk laporan ringkas tanpa memenuhi layar awal dengan tabel panjang.

## 8. Aturan full-screen dan responsive

- Home menggunakan tinggi minimal `100dvh`.
- Pada iPad/desktop, konten memenuhi lebar layar dengan padding nyaman, tanpa sidebar tetap.
- Pada mobile, launcher menggunakan grid 3 atau 4 kolom sesuai lebar layar.
- Parent dan Teacher memprioritaskan tampilan satu layar: header, banner, ikon, kartu kelas, dan to-do utama.
- Admin dan Owner menggunakan halaman panjang dengan scroll vertikal alami.
- Tidak ada horizontal scroll pada halaman utama; hanya banner yang dapat di-swipe secara horizontal.
- Tombol scan QR memiliki ukuran sentuh minimal 44px.
- Kontras warna dan label ikon tetap jelas tanpa mengandalkan warna saja.

## 9. Keputusan yang perlu disetujui sebelum implementasi

1. Struktur Home tanpa sidebar pada halaman utama disetujui.
2. Banner pengumuman berada di bawah header dan dapat swipe kiri/kanan.
3. Menu lama diubah menjadi launcher ikon dengan akses berbeda berdasarkan role.
4. Scan QR menjadi kartu utama untuk Teacher/Admin saat ada kelas aktif.
5. Parent dan Teacher dibuat ringkas; Admin dan Owner dapat scroll melihat kelompok menu/tugas yang lebih banyak.
6. Draft ini baru akan diterapkan setelah disetujui.
