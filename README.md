# Antrian Terpadu

Satu webapp berisi **buku tamu**, **antrian online + offline (kiosk)** yang terintegrasi, dan **pemutar promosi** (poster/video) untuk layar antrian maupun online. Ada tiga dashboard: admin utama, operator layanan, dan beranda publik yang isinya diatur admin.

Cocok untuk tempat pelayanan yang melayani **beberapa instansi** (misalnya Mal Pelayanan Publik): pengunjung memilih **instansi** (dengan logonya) → memilih **jenis layanan** → nomor antrian keluar. Admin punya **rekap harian, bulanan, triwulan, dan tahunan** per jenis layanan.

## Sudah memasang versi pertama?

Jalankan **`supabase/update-v2-instansi-rekap.sql`** sekali di Supabase → SQL Editor. File ini menambah tabel instansi, kolom instansi pada layanan dan loket, aturan panggilan per instansi, dan fungsi rekap. Data antrian, buku tamu, berita, dan pengguna tidak tersentuh. Setelah itu:

1. Buka **Admin → Instansi & layanan**, tambahkan instansi dan unggah logonya.
2. Pada tabel **Jenis layanan**, pilih instansi untuk setiap layanan (layanan tanpa instansi tampil sebagai "Layanan umum").
3. Pada tabel **Loket**, pilih instansi pemilik tiap loket.
4. Unggah ulang kode ke GitHub agar Vercel men-deploy versi baru.

- Frontend: React + Vite → di-host di **Vercel**
- Backend: **Supabase** (Postgres, Auth, Realtime, Storage)

## Halaman

| Alamat | Untuk | Keterangan |
|---|---|---|
| `/` | Publik | Beranda: papan antrian live, layanan, kartu info, promosi, berita, kontak |
| `/antrian` | Publik | Ambil nomor antrian online |
| `/status/A-001` | Publik | Pantau posisi nomor |
| `/buku-tamu` | Publik | Isi buku tamu, bisa sekaligus ambil nomor |
| `/berita` | Publik | Berita & pengumuman |
| `/display` | Komputer/TV antrian | Layar antrian + promosi + suara panggilan |
| `/promo` | Online / layar lain | Hanya pemutar promosi |
| `/kiosk` | Layar sentuh loket | Pilih layanan, tiket tercetak otomatis |
| `/login` | Staf | Masuk / daftar petugas |
| `/operator` | Operator | Panggil, panggil ulang, layani, selesai, lewati, tamu langsung |
| `/admin` | Admin utama | Ringkasan, rekap layanan, instansi & layanan, buku tamu, berita, media promosi, tampilan situs, pengguna |
| `/admin/rekap` | Admin utama | Rekap harian / bulanan / triwulan / tahunan per jenis layanan, unduh CSV, cetak |

## Pasang (sekitar 15 menit)

### 1. Supabase
1. Buat project di <https://supabase.com>.
2. Buka **SQL Editor → New query**, tempel seluruh isi `supabase/schema.sql`, klik **Run**. (Instalasi baru tidak perlu menjalankan file update; isinya sudah termasuk. Data contoh berisi dua instansi dan lima layanan — ubah atau hapus dari dashboard admin.)
3. Buka **Project Settings → API**, salin **Project URL** dan **anon public key**.
4. (Disarankan) **Authentication → Providers → Email**: matikan *Confirm email* bila Anda ingin petugas langsung bisa masuk setelah mendaftar.

### 2. Coba di komputer sendiri
```bash
npm install
cp .env.example .env     # isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
npm run dev
```

### 3. Admin pertama
Buka `/login` → **Daftar**. **Pengguna pertama yang mendaftar otomatis menjadi admin utama.** Daftar sendiri pertama kali sebelum alamat situs dibagikan. Petugas berikutnya mendaftar sendiri, lalu Anda ubah perannya jadi *Operator* di **Admin → Pengguna**.

### 4. Vercel
1. Unggah folder ini ke GitHub (repository baru).
2. Di Vercel: **Add New → Project**, pilih repository tersebut. Framework otomatis terdeteksi sebagai Vite.
3. Isi **Environment Variables**: `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
4. **Deploy**. `vercel.json` sudah mengatur agar semua alamat (misalnya `/operator`) terbuka normal.

## Cara memakai

**Komputer antrian (loket):** buka `/display` di browser, klik **Layar penuh** (gerakkan mouse ke pojok kanan atas) dan **Aktifkan suara panggilan** sekali — browser mewajibkan satu klik sebelum suara boleh keluar. Promosi diputar di sisi kanan layar.

**Kiosk cetak tiket:** buka `/kiosk`. Agar tiket langsung tercetak tanpa dialog, jalankan Chrome dengan `--kiosk-printing` dan atur printer thermal 80 mm sebagai printer bawaan.

**Operator:** buka `/operator`, pilih loket, klik **Panggil berikutnya**. Nomor yang dipanggil muncul di layar dan diumumkan dengan suara. Tamu yang datang langsung tanpa kiosk dapat dibuatkan nomor dari kotak *Tambah nomor untuk tamu langsung*.

**Instansi & layanan:** setiap instansi punya logo (unggah PNG persegi berlatar putih/transparan). Kode layanan harus unik di semua instansi karena menjadi awalan nomor (A-001, B-001, …). Loket bisa diatur melayani satu layanan, semua layanan satu instansi, atau semua layanan.

**Rekap layanan:** pilih Harian (per tanggal dalam satu bulan), Bulanan (Jan–Des), Triwulan (TW I–IV), atau Tahunan (beberapa tahun). Tabel menampilkan jumlah per layanan dikelompokkan per instansi dengan subtotal dan total, ditambah rincian online/offline, selesai, dilewati, dibatalkan, persentase selesai, rata-rata waktu tunggu dan waktu layanan. Bisa disaring per instansi, diunduh CSV (terbuka di Excel), atau dicetak.

**Admin:** isi beranda publik di **Tampilan situs**, unggah poster/video di **Media promosi** (atau tempel tautan YouTube), tulis **Berita**, dan atur **Layanan & loket**. Perubahan langsung muncul di situs dan layar antrian tanpa memuat ulang.

## Aturan penting

- **Nomor antrian direset otomatis tiap hari** (zona waktu WITA). Ubah zona di fungsi `today_local()` pada `schema.sql` dan di `src/lib/util.js` bila instansi Anda di zona lain.
- **Aturan panggilan loket:** bila "Khusus layanan" diisi, loket hanya memanggil layanan itu; bila kosong, semua layanan milik instansinya; bila instansi juga kosong, semua layanan.
- **Rekap dihitung dari riwayat nomor antrian.** Menghapus layanan juga menghapus riwayat dan rekapnya — nonaktifkan saja bila layanan tidak dibuka lagi.
- **Data pribadi pengunjung** (nama, telepon) disimpan di tabel terpisah yang hanya bisa dibaca staf, sehingga tidak ikut tersiar ke layar publik.
- Upload video dibatasi ukuran berkas paket Supabase Anda (paket gratis 50 MB per berkas). Video lebih besar bisa diunggah ke YouTube lalu ditempel tautannya.

## Catatan keamanan

- Pengambilan nomor dan pengisian buku tamu bersifat terbuka untuk umum (tanpa login). Bila situs sering disalahgunakan, tambahkan Cloudflare Turnstile atau batasi laju di Supabase.
- `anon key` memang aman ditaruh di frontend; yang melindungi data adalah aturan Row Level Security di `schema.sql`. **Jangan pernah** memakai `service_role key` di frontend.
- Ubah kata sandi akun admin pertama menjadi yang kuat sebelum situs dipublikasikan.

## Struktur kode

```
supabase/schema.sql         tabel, RLS, fungsi antrian & rekap, realtime, storage, data awal
supabase/update-v2-...sql   pembaruan untuk database versi pertama (instansi + rekap)
src/context/                Auth (peran) dan Settings (tampilan situs)
src/hooks/useQueue.js       antrian realtime hari ini
src/components/             PromoPlayer, TicketView, Crud, PublicLayout
src/pages/public/           beranda, ambil antrian, status, buku tamu, berita
src/pages/Display.jsx       layar antrian + suara
src/pages/Kiosk.jsx         kiosk cetak tiket
src/pages/operator/         dashboard operator
src/pages/admin/            dashboard admin (Reports.jsx = rekap layanan)
src/lib/agency.js           pengelompokan layanan per instansi
```
