# ============================================================
# AsetKu — Deploy Otomatis ke Vercel
# Jalankan: powershell -File deploy.ps1
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AsetKu — Deploy ke Vercel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# -- 1. Cek Git -------------------------------------------
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
    Write-Host "[ERROR] Git belum terinstall!" -ForegroundColor Red
    Write-Host "Download di: https://git-scm.com/downloads" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}
Write-Host "[OK] Git ditemukan: $(git --version)" -ForegroundColor Green

# -- 2. Cek Node.js / npx -----------------------------------
$npx = Get-Command npx -ErrorAction SilentlyContinue
if (-not $npx) {
    Write-Host "[ERROR] Node.js belum terinstall!" -ForegroundColor Red
    Write-Host "Download di: https://nodejs.org (pilih LTS)" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}
Write-Host "[OK] Node.js ditemukan: $(node --version)" -ForegroundColor Green
Write-Host ""

# -- 3. Git Init (jika belum) --------------------------------
if (-not (Test-Path ".git")) {
    Write-Host "[*] Inisialisasi Git repository..." -ForegroundColor Yellow
    git init
    git add .
    git commit -m "Initial commit - AsetKu Asset Management"
    Write-Host "[OK] Repository Git dibuat." -ForegroundColor Green
} else {
    Write-Host "[OK] Repository Git sudah ada." -ForegroundColor Green
    # Commit perubahan terbaru
    git add .
    $status = git status --porcelain
    if ($status) {
        git commit -m "Update AsetKu $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        Write-Host "[OK] Perubahan terbaru di-commit." -ForegroundColor Green
    } else {
        Write-Host "[OK] Tidak ada perubahan baru." -ForegroundColor Green
    }
}
Write-Host ""

# -- 4. Deploy ke Vercel ------------------------------------
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploying ke Vercel..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Jika ini pertama kali, Anda akan diminta:" -ForegroundColor Yellow
Write-Host "  1. Login ke akun Vercel (buka browser)" -ForegroundColor Yellow
Write-Host "  2. Pilih scope/team" -ForegroundColor Yellow
Write-Host "  3. Confirm project settings" -ForegroundColor Yellow
Write-Host ""

# Deploy menggunakan npx vercel (otomatis install jika belum ada)
npx -y vercel --prod

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy Selesai!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Langkah selanjutnya:" -ForegroundColor Cyan
Write-Host "  1. Buka URL yang ditampilkan di atas" -ForegroundColor White
Write-Host "  2. Login dengan admin/admin123" -ForegroundColor White
Write-Host "  3. Buka URL yang sama di HP/tablet" -ForegroundColor White
Write-Host "  4. Data otomatis tersinkronisasi!" -ForegroundColor White
Write-Host ""
Write-Host "Untuk Install sebagai App (PWA):" -ForegroundColor Cyan
Write-Host "  Android: Tap menu > Tambahkan ke Layar Utama" -ForegroundColor White
Write-Host "  iPhone:  Tap Share > Tambahkan ke Layar Utama" -ForegroundColor White
Write-Host "  Desktop: Klik icon install di address bar" -ForegroundColor White
Write-Host ""
Read-Host "Tekan Enter untuk keluar"
