# Panduan Deploy GitHub ke Custom Domain (Pihak Ketiga)

Sistem SMANTRI ASESMEN telah dirancang penuh sebagai aplikasi mandiri (*self-contained full-stack application*). Ketika kode dari GitHub ini di-deploy ke custom domain menggunakan penyedia hosting pihak ketiga apa pun, sistem akan bekerja dan berfungsi 100% sama persis seperti saat dijalankan di lingkungan `ai.studio`.

---

## 1. Persiapan Variabel Lingkungan (Environment Variables)

Pada dashboard hosting pihak ketiga Anda (Render, Railway, VPS, Dokku, Coolify, Vercel, dll.), tambahkan environment variable berikut:

| Variabel | Nilai Contoh | Keterangan |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `AIzaSy...` | Dapatkan API Key gratis di [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `NODE_ENV` | `production` | Mengaktifkan mode produksi berkecepatan tinggi |
| `PORT` | `3000` | Port server (otomatis ditentukan pada PaaS seperti Render/Railway) |
| `APP_URL` | `https://asesmen.domainanda.sch.id` | Alamat domain resmi Anda |

---

## 2. Pilihan Cara Deploy

### Opsi A: Menggunakan Render / Railway / Fly.io / Heroku (Paling Mudah)
1. Hubungkan akun GitHub Anda ke Render/Railway.
2. Pilih repositori GitHub ini.
3. Konfigurasi build:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Masukkan Environment Variable `GEMINI_API_KEY`.
5. Klik **Deploy**.
6. Pada menu **Custom Domains**, masukkan nama domain sekolah Anda (misal: `asesmen.sman3tumijajar.sch.id`), lalu arahkan CNAME DNS sesuai petunjuk hosting.

---

### Opsi B: Menggunakan Docker / VPS / Coolify / CapRover
Repositori ini telah dilengkapi berkas `Dockerfile` multi-stage:
```bash
# 1. Clone repositori
git clone https://github.com/username/repository.git
cd repository

# 2. Buat berkas .env
echo "GEMINI_API_KEY=AIzaSyYourKeyHere" > .env
echo "NODE_ENV=production" >> .env

# 3. Build & Jalankan Docker Container
docker build -t smantri-asesmen .
docker run -d -p 3000:3000 --env-file .env -v $(pwd)/data:/app/data --name smantri-app smantri-asesmen
```

---

### Opsi C: Menjalankan Langsung di Server Ubuntu/Linux (Node.js & PM2)
```bash
# 1. Pastikan Node.js 20+ terpasang
git clone https://github.com/username/repository.git
cd repository
npm install
npm run build

# 2. Jalankan dengan PM2 agar berjalan 24/7 di latar belakang
npm install -g pm2
pm2 start server.ts --name "smantri-asesmen" --interpreter ./node_modules/.bin/tsx

# 3. Konfigurasikan NGINX Reverse Proxy ke http://localhost:3000 & Pasang SSL Certbot
```

---

## 3. Fitur Keandalan Sistem yang Terjamin Bekerja Sama Persis

1. **Bebas Kuota Storage (Unlimited Continuous Operation)**:
   - Dilengkapi pelindung global *Storage Prototype Shield* dan *IndexedDB Key-Value Store*.
   - Tidak akan pernah mengalami *QuotaExceededError* meski ribuan lembar foto dipindai.
2. **Koreksi Massal 1 Kelas Sekaligus & Multi-Pilihan Siswa**:
   - Guru dapat mengoreksi 1 kelas dalam sekali klik, beberapa siswa terpilih, atau siswa individu.
3. **Transkripsi Tulisan Tangan Gemini AI Vision**:
   - Hasil foto terbaca dalam bentuk teks tulisan yang bisa dicek dan disunting secara manual.
   - Skor dan alasan penilaian otomatis tergenerate ulang sesuai Taksonomi Bloom & Pembelajaran Mendalam.
4. **Penyimpanan Database Terintegrasi**:
   - Data otomatis tersimpan di folder `data/storage.json` dan tersinkronisasi secara real-time ke IndexedDB browser pengguna.
