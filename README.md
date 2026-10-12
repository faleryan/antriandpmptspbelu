# Antrian Terpadu

Satu webapp berisi **buku tamu**, **antrian online + offline (kiosk)** yang terintegrasi, dan **pemutar promosi** (poster/video) untuk layar antrian maupun online. Ada tiga dashboard: admin utama, operator layanan, dan beranda publik yang isinya diatur admin.

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
| `/admin` | Admin utama | Ringkasan, layanan & loket, buku tamu, berita, media promosi, tampilan situs, pengguna |

## Pasang (sekitar 15 menit)

### 1. Supabase
1. Buat project di <https://supabase.com>.
2. Buka **SQL Editor → New query**, tempel seluruh isi `supabase/schema.sql`, klik **Run**.
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

**Admin:** isi beranda publik di **Tampilan situs**, unggah poster/video di **Media promosi** (atau tempel tautan YouTube), tulis **Berita**, dan atur **Layanan & loket**. Perubahan langsung muncul di situs dan layar antrian tanpa memuat ulang.

## Aturan penting

- **Nomor antrian direset otomatis tiap hari** (zona waktu WITA). Ubah zona di fungsi `today_local()` pada `schema.sql` dan di `src/lib/util.js` bila instansi Anda di zona lain.
- **Loket dengan layanan kosong melayani semua layanan**; loket yang dikaitkan ke satu layanan hanya memanggil nomor layanan itu.
- **Data pribadi pengunjung** (nama, telepon) disimpan di tabel terpisah yang hanya bisa dibaca staf, sehingga tidak ikut tersiar ke layar publik.
- Upload video dibatasi ukuran berkas paket Supabase Anda (paket gratis 50 MB per berkas). Video lebih besar bisa diunggah ke YouTube lalu ditempel tautannya.

## Catatan keamanan

- Pengambilan nomor dan pengisian buku tamu bersifat terbuka untuk umum (tanpa login). Bila situs sering disalahgunakan, tambahkan Cloudflare Turnstile atau batasi laju di Supabase.
- `anon key` memang aman ditaruh di frontend; yang melindungi data adalah aturan Row Level Security di `schema.sql`. **Jangan pernah** memakai `service_role key` di frontend.
- Ubah kata sandi akun admin pertama menjadi yang kuat sebelum situs dipublikasikan.

## Struktur kode

```
supabase/schema.sql         tabel, RLS, fungsi antrian, realtime, storage, data awal
src/context/                Auth (peran) dan Settings (tampilan situs)
src/hooks/useQueue.js       antrian realtime hari ini
src/components/             PromoPlayer, TicketView, Crud, PublicLayout
src/pages/public/           beranda, ambil antrian, status, buku tamu, berita
src/pages/Display.jsx       layar antrian + suara
src/pages/Kiosk.jsx         kiosk cetak tiket
src/pages/operator/         dashboard operator
src/pages/admin/            dashboard admin
```
