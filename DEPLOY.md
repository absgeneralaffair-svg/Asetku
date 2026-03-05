# 🚀 Panduan Deploy AsetKu ke Semua Perangkat

Panduan ini menjelaskan cara membuat aplikasi AsetKu bisa diakses dari **HP, tablet, dan laptop** mana pun melalui internet.

---

## ⚡ Cara Tercepat: Deploy Otomatis (1 Perintah)

### Prasyarat
- **Git** — download di [git-scm.com](https://git-scm.com/downloads)
- **Node.js** — download di [nodejs.org](https://nodejs.org) (pilih LTS)

### Jalankan Deploy

```powershell
# Buka PowerShell di folder asset-management, lalu jalankan:
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

Skrip akan otomatis:
1. ✅ Cek Git & Node.js
2. ✅ Inisialisasi Git repository
3. ✅ Commit semua file
4. ✅ Deploy ke Vercel

> 💡 Pertama kali deploy? Anda akan diminta login ke [vercel.com](https://vercel.com) via browser.

Setelah selesai, Anda mendapat URL seperti: `https://asetku-xxxxx.vercel.app`

---

## 📱 Cara Manual: GitHub + Vercel

### Step 1 — Upload ke GitHub
```bash
# Buka terminal/PowerShell di folder asset-management
git init
git add .
git commit -m "Initial commit - AsetKu"

# Buat repository baru di github.com, lalu:
git remote add origin https://github.com/USERNAME/asetku.git
git branch -M main
git push -u origin main
```

### Step 2 — Deploy ke Vercel
1. Buka [vercel.com/new](https://vercel.com/new)
2. Klik **"Import Git Repository"**
3. Pilih repository `asetku` yang baru dibuat
4. Klik **"Deploy"** — tunggu ~30 detik
5. ✅ Selesai! Vercel akan memberikan URL seperti: `https://asetku-xxxxx.vercel.app`

### Step 3 — Akses dari HP
1. Buka browser di HP (Chrome / Safari)
2. Ketik URL Vercel tadi
3. Login seperti biasa (admin/admin123)
4. Data otomatis tersinkronisasi via Firebase!

---

## 📦 Cara Offline: File AsetKu.html

Jika **tidak ada koneksi internet**, gunakan file bundle:

```powershell
# Jalankan di folder asset-management:
powershell -File bundle.ps1
```

Ini akan menghasilkan file `AsetKu.html` yang bisa:
- Dibuka langsung di browser mana pun
- Dikirim via WhatsApp/Email ke perangkat lain
- Disimpan di USB/Google Drive

> ⚠️ Mode offline: data tersimpan di browser masing-masing (tidak sync antar perangkat)

---

## 📲 Install Sebagai Aplikasi (PWA)

Setelah deploy ke Vercel, aplikasi bisa di-install seperti app native:

### Android (Chrome)
1. Buka URL Vercel di Chrome
2. Tap menu ⋮ di pojok kanan atas
3. Pilih **"Tambahkan ke Layar Utama"** / **"Install app"**
4. AsetKu akan muncul di home screen seperti app biasa

### iPhone (Safari)
1. Buka URL Vercel di Safari
2. Tap tombol **Share** (kotak + panah atas)
3. Pilih **"Tambahkan ke Layar Utama"**
4. AsetKu akan muncul di home screen

### Desktop (Chrome/Edge)
1. Buka URL Vercel
2. Klik icon install (⊕) di address bar
3. Klik **"Install"**

---

## ☁️ Sinkronisasi Data Antar Perangkat

Aplikasi sudah dikonfigurasi dengan **Firebase Firestore** untuk sync realtime:

| Fitur | Status |
|---|---|
| Data aset | ✅ Auto-sync |
| Data kategori & lokasi | ✅ Auto-sync |
| Data riwayat | ✅ Auto-sync |
| Data inspeksi | ✅ Auto-sync |
| Data pengguna | ✅ Auto-sync |

### Cara kerjanya:
- Saat Anda mengubah data di laptop → otomatis muncul di HP
- Saat Anda menambah aset di HP → otomatis muncul di laptop
- Indikator sync muncul di pojok kanan bawah: ☁️

### Setup Firebase (jika belum):
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project `asetku-manajemen`
3. Pastikan Firestore Database sudah aktif
4. Rules Firestore (untuk testing):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ Untuk production, tambahkan authentication rules yang lebih ketat!

---

## 🔧 Troubleshooting

| Masalah | Solusi |
|---|---|
| `git` tidak ditemukan | Install Git: [git-scm.com](https://git-scm.com/downloads) |
| `npx` tidak ditemukan | Install Node.js: [nodejs.org](https://nodejs.org) |
| Vercel minta login | Buka browser dan login di [vercel.com](https://vercel.com) |
| Firebase tidak sync | Cek koneksi internet + Firebase Console |
| Halaman blank di HP | Clear cache browser, coba incognito mode |
| PWA tidak bisa install | Pastikan akses via HTTPS (URL Vercel sudah HTTPS) |

---

## 📊 Ringkasan

| Metode | Internet? | Sync? | Install? | Cara |
|---|---|---|---|---|
| Vercel (otomatis) | ✅ Ya | ✅ Ya | ✅ PWA | `deploy.ps1` |
| GitHub + Vercel | ✅ Ya | ✅ Ya | ✅ PWA | Manual via browser |
| AsetKu.html | ❌ Tidak | ❌ Lokal | ❌ File | `bundle.ps1` |

**Rekomendasi:** Jalankan `deploy.ps1` untuk deploy tercepat! 🎯
