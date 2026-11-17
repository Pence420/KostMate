# KostMate

Website pencarian dan pengelolaan kos sekitar BINUS, dibuat dari `KostMate.pdf`. React + TypeScript di frontend, FastAPI (Python) dan SQLite di backend.

Visual minimalis: putih hangat, aksen teal, foto hunian, navigasi sederhana. Referensi alur pencarian: [Airbnb](https://www.airbnb.com/). Referensi hierarki dashboard: [Linear](https://linear.app/). Preview tersimpan di `docs/previews/kostmate-desktop.jpg`.

## Menjalankan secara lokal

Prasyarat: Node.js 20.19+ atau 22.12+ dan Python 3.11+.

```sh
git clone https://github.com/Pence420/KostMate.git
cd KostMate
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
npm ci --prefix frontend
```

Buka dua terminal di folder project:

```sh
# Terminal 1: backend di http://127.0.0.1:8000
npm run backend
```

```sh
# Terminal 2: frontend di http://127.0.0.1:5173
npm run dev
```

API docs: [Swagger UI](http://127.0.0.1:8000/docs). Frontend memproksikan `/api` ke backend; tidak perlu konfigurasi CORS saat pengembangan.

Untuk memasang versi Python yang sama dengan lingkungan pengujian, gunakan `backend/requirements.lock.txt` (Python 3.14 pada pengujian awal).

## Akun demo

Di dialog **Masuk**, tombol **Pencari kos** dan **Pemilik kos** mengisi akun demo. Setelah memilih, klik **Masuk**.

| Peran       | Email                 | Kata sandi     |
| ----------- | --------------------- | -------------- |
| Pencari kos | `nadia@kostmate.demo` | `Kostmate123!` |
| Pemilik kos | `owner@kostmate.demo` | `Kostmate123!` |

Akun baru juga bisa didaftarkan melalui dialog yang sama. Setiap pemilik hanya dapat mengelola propertinya sendiri.

## Fitur

- Cari nama kos, lokasi, dan kampus. Filter area, harga, penghuni, jenis kos, fasilitas, tanggal masuk, dan kamar tersedia; urutkan berdasarkan harga atau jarak.
- Detail kos dengan galeri foto, ukuran, fasilitas, peraturan, alamat, biaya tambahan, dan kontak WhatsApp jika nomor pemilik diisi.
- Favorit yang tersimpan di akun, termasuk setelah keluar dan masuk kembali.
- Pengajuan jadwal survei yang masuk ke dashboard pemilik; jadwal masih perlu dikonfirmasi oleh pemilik.
- Pengaduan dengan status Baru, Diproses, Selesai. Hanya pemilik kos terkait yang dapat mengubah statusnya.
- Dashboard pemilik: total kamar, kamar kosong, tingkat hunian, pembayaran tercatat, dan tagihan penghuni yang belum terbayar.
- Tambah/edit listing, foto, kontak, dan ketersediaan kamar. Pembaruan publik disebarkan melalui Server-Sent Events (interval maksimal sekitar 2 detik, satu proses server).
- Catatan penghuni dan pembayaran bulanan manual; pembayaran ganda untuk penghuni/bulan yang sama ditolak.
- Tampilan desktop dan HP, dialog yang mendukung keyboard, status loading/error/kosong.

## Data dan batas integrasi

Database otomatis dibuat di `backend/kostmate.db`. Listing, alamat, jarak, foto, dan penghuni demo adalah ilustrasi, bukan inventaris kos nyata. Foto berasal dari Unsplash; font web dari Google Fonts, sehingga aset tersebut memerlukan internet.

Nomor WhatsApp demo sengaja kosong. Isi nomor sendiri melalui **Kelola kos** dengan format `62812...` agar tombol kontak tampil. Aplikasi tidak mengirim pesan otomatis. Tidak ada transaksi pembayaran online, payment gateway, subscription berbayar, atau pengingat WhatsApp otomatis yang dijalankan.

Data penghuni demo hanya merupakan sebagian contoh pencatatan. Total hunian dihitung dari total kamar dikurangi kamar kosong; pendapatan dan tagihan hanya dihitung dari penghuni yang dicatat, untuk bulan berjalan. Catatan penghuni tidak otomatis mengubah ketersediaan kamar; pemilik memperbaruinya melalui **Kelola kos**.

Pencarian tanggal masuk berarti kamar tersedia mulai paling lambat tanggal pilihan; aplikasi belum memiliki kalender reservasi atau pemesanan kamar. Hasil “Rekomendasi” memprioritaskan kamar tersedia, lalu jarak terdekat ke kampus.

## Build dan pengujian

```sh
npm test
npm run build
```

Setelah build, FastAPI bisa menyajikan frontend dan API dalam satu proses:

```sh
.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Buka [KostMate](http://127.0.0.1:8000). Jalankan ulang server setelah build pertama jika server sudah menyala sebelum folder `frontend/dist` dibuat.

Pengujian API memakai database sementara: filter, registrasi/login/logout, otorisasi, persistensi favorit, pengajuan survei, pengaduan, kepemilikan, validasi kamar, pencatatan pembayaran, duplikasi, dan event perubahan. Pemeriksaan browser mencakup desktop 1440 px dan HP 390 px, filter mobile, detail, login, favorit, pengajuan survei hingga inbox pemilik, dan perubahan jumlah kamar.

## Konfigurasi

| Variabel        | Default               | Fungsi                                       |
| --------------- | --------------------- | -------------------------------------------- |
| `KOSTMATE_DB`   | `backend/kostmate.db` | Lokasi SQLite                                |
| `KOSTMATE_SEED` | `1`                   | `0` untuk database baru tanpa data/akun demo |
| `COOKIE_SECURE` | `0`                   | `1` untuk cookie HTTPS saat dihosting        |

Versi ini ditujukan untuk demo lokal. Sebelum hosting publik, mulai dengan database baru dan `KOSTMATE_SEED=0`, aktifkan HTTPS/cookie secure, tambahkan pembatasan percobaan login, backup database, serta gunakan sistem event bersama jika server dijalankan lebih dari satu proses. Mengubah `KOSTMATE_SEED` tidak menghapus data yang sudah ada.

## Struktur

```text
backend/
  app.py           Endpoint API dan server frontend
  db.py            Koneksi dan schema SQLite
  models.py        Validasi input
  security.py      Hash password PBKDF2
  seed.py          Data contoh
  tests/           Tes integrasi API
frontend/
  src/components/  Komponen UI, autentikasi, kartu, editor
  src/pages/       Pencarian, detail, favorit, dashboard, pengaduan
  src/api.ts       Klien API dan format data
  src/context.tsx  State akun, favorit, notifikasi
  src/styles.css   Desain dan breakpoint responsif
docs/
  superpowers/     Spesifikasi dan rencana
  previews/        Screenshot hasil
```
