# AsetKu Bundle Script
# Menggabungkan login.html + index.html + style.css + app.js
# menjadi satu file AsetKu.html yang bisa dibagikan

$dir = $PSScriptRoot
$out = Join-Path $dir "AsetKu.html"

$css    = Get-Content (Join-Path $dir "style.css")    -Raw -Encoding UTF8
$appjs  = Get-Content (Join-Path $dir "app.js")       -Raw -Encoding UTF8

# Patch JS: redirect ke view switch, bukan file lain
$appjs = $appjs -replace "window\.location\.href\s*=\s*'login\.html'", "showView('login')"
$appjs = $appjs -replace "window\.location\.href\s*=\s*'index\.html'", "showView('app')"

$html = @"
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="description" content="AsetKu - Sistem Manajemen Aset Fisik"/>
  <title>AsetKu — Manajemen Aset Fisik</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    /* ── VIEW SWITCHER ── */
    .view { display: none; }
    .view.active { display: block; }
    /* LOGIN PAGE: body needs flex centering */
    #view-login {
      min-height: 100vh;
      display: none;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      padding: 20px;
    }
    #view-login.active { display: flex; }
    /* APP: body is flex row (sidebar + main) */
    #view-app { display: none; min-height: 100vh; }
    #view-app.active { display: flex; width: 100%; }

$css

    /* ── LOGIN-SPECIFIC STYLES ── */
    .bg-blob{position:absolute;border-radius:50%;filter:blur(80px);opacity:.15;animation:blob-float 8s ease-in-out infinite;pointer-events:none}
    .blob-1{width:400px;height:400px;background:#388bfd;top:-100px;left:-100px;animation-delay:0s}
    .blob-2{width:350px;height:350px;background:#bc8cff;bottom:-80px;right:-80px;animation-delay:3s}
    .blob-3{width:250px;height:250px;background:#3fb950;top:60%;left:60%;animation-delay:6s}
    @keyframes blob-float{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(20px,-20px) scale(1.05)}66%{transform:translate(-15px,15px) scale(.95)}}
    #view-login::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(56,139,253,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(56,139,253,.04) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}
    .login-wrapper{position:relative;z-index:10;width:100%;max-width:420px}
    .login-logo{text-align:center;margin-bottom:32px}
    .login-logo-icon{width:60px;height:60px;background:linear-gradient(135deg,#388bfd,#bc8cff);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 14px;box-shadow:0 8px 32px rgba(56,139,253,.3)}
    .login-logo-text{font-size:26px;font-weight:800;background:linear-gradient(135deg,#388bfd,#bc8cff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-.5px}
    .login-logo-sub{font-size:13px;color:#656d76;margin-top:4px}
    .login-card{background:rgba(28,33,41,.85);backdrop-filter:blur(20px);border:1px solid #30363d;border-radius:16px;padding:32px;box-shadow:0 24px 64px rgba(0,0,0,.5)}
    .login-title{font-size:18px;font-weight:700;margin-bottom:4px}
    .login-subtitle{font-size:13px;color:#656d76;margin-bottom:24px}
    .lform-group{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
    .lform-group label{font-size:12px;font-weight:600;color:#8b949e}
    .input-wrapper{position:relative;display:flex;align-items:center}
    .input-icon{position:absolute;left:12px;font-size:16px;pointer-events:none;color:#656d76}
    .lform-group input{width:100%;background:#161b22;border:1px solid #30363d;border-radius:6px;color:#e6edf3;padding:10px 12px 10px 38px;font-size:14px;font-family:inherit;outline:none;transition:all .2s ease}
    .lform-group input:focus{border-color:#388bfd;box-shadow:0 0 0 3px rgba(56,139,253,.15)}
    .lform-group input.invalid{border-color:#f85149}
    .toggle-pw{position:absolute;right:10px;background:none;border:none;cursor:pointer;color:#656d76;font-size:16px;padding:4px;transition:all .2s}
    .toggle-pw:hover{color:#e6edf3}
    .form-row-inline{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
    .checkbox-label{display:flex;align-items:center;gap:8px;font-size:13px;color:#8b949e;cursor:pointer;user-select:none}
    .checkbox-label input[type=checkbox]{width:15px;height:15px;accent-color:#388bfd;cursor:pointer}
    .lerror-msg{display:none;align-items:center;gap:8px;background:rgba(248,81,73,.1);border:1px solid rgba(248,81,73,.3);border-radius:6px;padding:10px 14px;font-size:13px;color:#f85149;margin-bottom:16px;animation:shake .3s ease}
    .lerror-msg.show{display:flex}
    @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
    .btn-login{width:100%;padding:12px;background:linear-gradient(135deg,#388bfd,#5c9dfd);color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
    .btn-login:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(56,139,253,.35)}
    .btn-login:disabled{opacity:.6;cursor:not-allowed;transform:none}
    .btn-login .spinner{display:none;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;margin:0 auto}
    .btn-login.loading .btn-text{display:none}
    .btn-login.loading .spinner{display:block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .ldivider{display:flex;align-items:center;gap:12px;margin:20px 0;color:#656d76;font-size:12px}
    .ldivider::before,.ldivider::after{content:'';flex:1;height:1px;background:#30363d}
    .demo-accounts{display:flex;flex-direction:column;gap:8px}
    .demo-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#656d76;margin-bottom:4px}
    .demo-btn{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#161b22;border:1px solid #30363d;border-radius:6px;cursor:pointer;transition:all .2s;font-family:inherit;color:#e6edf3;font-size:13px}
    .demo-btn:hover{background:#1c2129;border-color:#388bfd}
    .demo-btn-info{text-align:left}
    .demo-btn-name{font-weight:600}
    .demo-btn-cred{font-size:11px;color:#656d76;margin-top:1px}
    .demo-btn-role{font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px}
    .role-admin{background:rgba(56,139,253,.15);color:#388bfd}
    .role-viewer{background:rgba(63,185,80,.15);color:#3fb950}
    .role-user{background:rgba(188,140,255,.15);color:#bc8cff}
    .login-footer{text-align:center;margin-top:20px;font-size:12px;color:#656d76}
  </style>
</head>
<body>

<!-- ══════════════ LOGIN VIEW ══════════════ -->
<div id="view-login">
  <div class="bg-blob blob-1"></div>
  <div class="bg-blob blob-2"></div>
  <div class="bg-blob blob-3"></div>
  <div class="login-wrapper">
    <div class="login-logo">
      <div class="login-logo-icon">📦</div>
      <div class="login-logo-text">AsetKu</div>
      <div class="login-logo-sub">Sistem Manajemen Aset Fisik</div>
    </div>
    <div class="login-card">
      <h1 class="login-title">Selamat Datang!</h1>
      <p class="login-subtitle">Login untuk mengakses dashboard aset</p>
      <div class="lerror-msg" id="lerrorMsg"><span>⚠️</span><span id="lerrorText">Username atau password salah.</span></div>
      <form id="loginForm" novalidate>
        <div class="lform-group">
          <label for="lusername">Username</label>
          <div class="input-wrapper">
            <span class="input-icon">👤</span>
            <input type="text" id="lusername" placeholder="Masukkan username" autocomplete="username"/>
          </div>
        </div>
        <div class="lform-group">
          <label for="lpassword">Password</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input type="password" id="lpassword" placeholder="Masukkan password" autocomplete="current-password"/>
            <button type="button" class="toggle-pw" id="ltogglePw">👁️</button>
          </div>
        </div>
        <div class="form-row-inline">
          <label class="checkbox-label"><input type="checkbox" id="lrememberMe"/> Ingat saya</label>
        </div>
        <button type="submit" class="btn-login" id="lbtn">
          <span class="btn-text">Masuk</span>
          <div class="spinner"></div>
        </button>
      </form>
      <div class="ldivider">atau gunakan akun demo</div>
      <div class="demo-accounts">
        <div class="demo-title">Akun Demo Tersedia</div>
        <button class="demo-btn" onclick="fillDemo('admin','admin123')">
          <div class="demo-btn-info"><div class="demo-btn-name">Administrator</div><div class="demo-btn-cred">admin / admin123</div></div>
          <span class="demo-btn-role role-admin">Admin</span>
        </button>
        <button class="demo-btn" onclick="fillDemo('user1','user123')">
          <div class="demo-btn-info"><div class="demo-btn-name">Budi Santoso</div><div class="demo-btn-cred">user1 / user123</div></div>
          <span class="demo-btn-role role-user">User</span>
        </button>
        <button class="demo-btn" onclick="fillDemo('viewer','view123')">
          <div class="demo-btn-info"><div class="demo-btn-name">Siti Rahayu</div><div class="demo-btn-cred">viewer / view123</div></div>
          <span class="demo-btn-role role-viewer">Viewer</span>
        </button>
      </div>
    </div>
    <div class="login-footer">© 2026 AsetKu — Manajemen Aset Fisik &nbsp;|&nbsp; v1.0</div>
  </div>
</div>

<!-- ══════════════ APP VIEW ══════════════ -->
<div id="view-app">
<aside class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <div class="logo">
      <div class="logo-icon">📦</div>
      <span class="logo-text">AsetKu</span>
    </div>
    <button class="sidebar-close" id="sidebarClose">✕</button>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-label">NAVIGASI</div>
    <a class="nav-item active" data-page="dashboard" href="#"><span class="nav-icon">🏠</span> Dashboard</a>
    <a class="nav-item" data-page="assets" href="#"><span class="nav-icon">📋</span> Daftar Aset</a>
    <a class="nav-item" data-page="categories" href="#"><span class="nav-icon">🗂️</span> Kategori</a>
    <a class="nav-item" data-page="locations" href="#"><span class="nav-icon">📍</span> Lokasi</a>
    <a class="nav-item" data-page="reports" href="#"><span class="nav-icon">📊</span> Laporan</a>
  </nav>
  <div class="sidebar-footer">
    <div class="sidebar-user"></div>
  </div>
</aside>
<div class="overlay" id="overlay"></div>
<div class="main-wrapper">
  <header class="topbar">
    <div class="topbar-left">
      <button class="menu-btn" id="menuBtn">☰</button>
      <h1 class="page-title" id="pageTitle">Dashboard</h1>
    </div>
    <div class="topbar-right">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="globalSearch" placeholder="Cari aset..."/>
      </div>
      <button class="btn btn-primary" id="addAssetBtn"><span>＋</span> Tambah Aset</button>
    </div>
  </header>
  <main class="page" id="page-dashboard">
    <div class="stats-grid">
      <div class="stat-card card-blue"><div class="stat-icon">📦</div><div class="stat-info"><div class="stat-value" id="stat-total">0</div><div class="stat-label">Total Aset</div></div></div>
      <div class="stat-card card-green"><div class="stat-icon">✅</div><div class="stat-info"><div class="stat-value" id="stat-aktif">0</div><div class="stat-label">Aset Aktif</div></div></div>
      <div class="stat-card card-yellow"><div class="stat-icon">🔧</div><div class="stat-info"><div class="stat-value" id="stat-pemeliharaan">0</div><div class="stat-label">Pemeliharaan</div></div></div>
      <div class="stat-card card-red"><div class="stat-icon">❌</div><div class="stat-info"><div class="stat-value" id="stat-rusak">0</div><div class="stat-label">Rusak / Nonaktif</div></div></div>
    </div>
    <div class="charts-row">
      <div class="card chart-card"><div class="card-header"><h3 class="card-title">Distribusi Kategori</h3></div><div class="chart-container" id="chart-category"></div><div class="chart-legend" id="legend-category"></div></div>
      <div class="card chart-card"><div class="card-header"><h3 class="card-title">Status Aset</h3></div><div class="chart-container" id="chart-status"></div><div class="chart-legend" id="legend-status"></div></div>
      <div class="card chart-card"><div class="card-header"><h3 class="card-title">Distribusi Lokasi</h3></div><div class="chart-container" id="chart-location"></div><div class="chart-legend" id="legend-location"></div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3 class="card-title">Aset Terbaru</h3><button class="btn btn-outline-sm" data-page="assets">Lihat Semua</button></div>
      <div class="table-wrapper"><table class="data-table"><thead><tr><th>Kode Aset</th><th>Nama Aset</th><th>Kategori</th><th>Lokasi</th><th>Kondisi</th><th>Status</th></tr></thead><tbody id="recent-table-body"></tbody></table></div>
    </div>
  </main>
  <main class="page hidden" id="page-assets">
    <div class="card">
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="filter-group"><label>Kategori</label><select id="filter-category"><option value="">Semua</option></select></div>
          <div class="filter-group"><label>Lokasi</label><select id="filter-location"><option value="">Semua</option></select></div>
          <div class="filter-group"><label>Status</label><select id="filter-status"><option value="">Semua</option><option>Aktif</option><option>Pemeliharaan</option><option>Rusak</option><option>Nonaktif</option></select></div>
          <div class="filter-group"><label>Kondisi</label><select id="filter-condition"><option value="">Semua</option><option>Baik</option><option>Cukup</option><option>Buruk</option></select></div>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-outline-sm" id="exportBtn">⬇ Export</button>
          <button class="btn btn-outline-sm" id="printBtn">🖨 Print</button>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table sortable">
          <thead><tr>
            <th data-sort="kode">Kode Aset <span class="sort-icon">⇕</span></th>
            <th data-sort="nama">Nama Aset <span class="sort-icon">⇕</span></th>
            <th data-sort="kategori">Kategori <span class="sort-icon">⇕</span></th>
            <th data-sort="merek">Merek / Model</th>
            <th data-sort="serialNumber">No. Seri</th>
            <th data-sort="lokasi">Lokasi <span class="sort-icon">⇕</span></th>
            <th data-sort="jumlah">Jumlah <span class="sort-icon">⇕</span></th>
            <th data-sort="satuan">Satuan</th>
            <th data-sort="kondisi">Kondisi <span class="sort-icon">⇕</span></th>
            <th data-sort="status">Status <span class="sort-icon">⇕</span></th>
            <th>Aksi</th>
          </tr></thead>
          <tbody id="assets-table-body"></tbody>
        </table>
      </div>
      <div class="table-footer">
        <div class="table-info" id="table-info">Menampilkan 0 aset</div>
        <div class="pagination" id="pagination"></div>
      </div>
    </div>
  </main>
  <main class="page hidden" id="page-categories">
    <div class="two-col">
      <div class="card"><div class="card-header"><h3 class="card-title">Kelola Kategori</h3></div><div class="inline-form"><input type="text" id="new-category-input" placeholder="Nama kategori baru..."/><button class="btn btn-primary" id="addCategoryBtn">Tambah</button></div><ul class="tag-list" id="category-list"></ul></div>
      <div class="card"><div class="card-header"><h3 class="card-title">Ringkasan per Kategori</h3></div><div class="summary-list" id="category-summary"></div></div>
    </div>
  </main>
  <main class="page hidden" id="page-locations">
    <div class="two-col">
      <div class="card"><div class="card-header"><h3 class="card-title">Kelola Lokasi</h3></div><div class="inline-form"><input type="text" id="new-location-input" placeholder="Nama lokasi baru..."/><button class="btn btn-primary" id="addLocationBtn">Tambah</button></div><ul class="tag-list" id="location-list"></ul></div>
      <div class="card"><div class="card-header"><h3 class="card-title">Ringkasan per Lokasi</h3></div><div class="summary-list" id="location-summary"></div></div>
    </div>
  </main>
  <main class="page hidden" id="page-reports">
    <div class="reports-grid" id="reports-grid"></div>
  </main>
</div><!-- /.main-wrapper -->
</div><!-- /#view-app -->

<!-- MODAL ASET -->
<div class="modal-backdrop" id="assetModal">
  <div class="modal">
    <div class="modal-header"><h2 class="modal-title" id="modal-title">Tambah Aset Baru</h2><button class="modal-close" id="modalClose">✕</button></div>
    <div class="modal-body">
      <form id="assetForm" novalidate>
        <input type="hidden" id="asset-id"/>
        <div class="form-section-title">Informasi Umum</div>
        <div class="form-row">
          <div class="form-group"><label for="f-kode">Kode Aset <span class="required">*</span></label><input type="text" id="f-kode" placeholder="cth: AST-001" required/></div>
          <div class="form-group"><label for="f-nama">Nama Aset <span class="required">*</span></label><input type="text" id="f-nama" placeholder="Nama aset" required/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label for="f-kategori">Kategori <span class="required">*</span></label><select id="f-kategori" required><option value="">-- Pilih Kategori --</option></select></div>
          <div class="form-group"><label for="f-merek">Merek / Model</label><input type="text" id="f-merek" placeholder="Merek atau model"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label for="f-serial">Nomor Seri</label><input type="text" id="f-serial" placeholder="Nomor seri / barcode"/></div>
          <div class="form-group"><label for="f-tahun">Tahun Perolehan</label><input type="number" id="f-tahun" placeholder="2024" min="1900" max="2100"/></div>
        </div>
        <div class="form-section-title">Lokasi & Penugasan</div>
        <div class="form-row">
          <div class="form-group"><label for="f-lokasi">Lokasi <span class="required">*</span></label><select id="f-lokasi" required><option value="">-- Pilih Lokasi --</option></select></div>
          <div class="form-group"><label for="f-penanggungjawab">Penanggung Jawab</label><input type="text" id="f-penanggungjawab" placeholder="Nama penanggung jawab"/></div>
        </div>
        <div class="form-section-title">Detail Fisik</div>
        <div class="form-row">
          <div class="form-group form-group-sm"><label for="f-jumlah">Jumlah <span class="required">*</span></label><input type="number" id="f-jumlah" placeholder="1" min="0" required/></div>
          <div class="form-group form-group-sm"><label for="f-satuan">Satuan</label><input type="text" id="f-satuan" placeholder="unit / pcs / set"/></div>
          <div class="form-group"><label for="f-kondisi">Kondisi</label><select id="f-kondisi"><option>Baik</option><option>Cukup</option><option>Buruk</option></select></div>
          <div class="form-group"><label for="f-status">Status</label><select id="f-status"><option>Aktif</option><option>Pemeliharaan</option><option>Rusak</option><option>Nonaktif</option></select></div>
        </div>
        <div class="form-group"><label for="f-deskripsi">Deskripsi / Catatan</label><textarea id="f-deskripsi" rows="3" placeholder="Deskripsi tambahan..."></textarea></div>
      </form>
    </div>
    <div class="modal-footer"><button class="btn btn-ghost" id="cancelBtn">Batal</button><button class="btn btn-primary" id="saveBtn">Simpan Aset</button></div>
  </div>
</div>

<!-- MODAL HAPUS -->
<div class="modal-backdrop" id="deleteModal">
  <div class="modal modal-sm">
    <div class="modal-header"><h2 class="modal-title">Hapus Aset</h2><button class="modal-close" id="deleteModalClose">✕</button></div>
    <div class="modal-body"><div class="delete-confirm-icon">🗑️</div><p class="delete-confirm-text">Apakah Anda yakin ingin menghapus aset ini?</p><p class="delete-confirm-name" id="deleteAssetName">—</p></div>
    <div class="modal-footer"><button class="btn btn-ghost" id="deleteCancelBtn">Batal</button><button class="btn btn-danger" id="deleteConfirmBtn">Ya, Hapus</button></div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
// ══════════════ VIEW SWITCHER ══════════════
function showView(name) {
  document.getElementById('view-login').classList.toggle('active', name === 'login');
  document.getElementById('view-app').classList.toggle('active', name === 'app');
  if (name === 'app') {
    // init app after showing it
    if (!window._appInited) { window._appInited = true; initApp(); }
    else { renderDashboard(); }
  }
}

// ══════════════ LOGIN LOGIC ══════════════
const DEFAULT_USERS = [
  { username:'admin',  password:'admin123', name:'Administrator', role:'Admin',  avatar:'A' },
  { username:'user1',  password:'user123',  name:'Budi Santoso',  role:'User',   avatar:'B' },
  { username:'viewer', password:'view123',  name:'Siti Rahayu',   role:'Viewer', avatar:'S' },
];

function getUsers() {
  const s = localStorage.getItem('asetku_users');
  return s ? JSON.parse(s) : DEFAULT_USERS;
}
if (!localStorage.getItem('asetku_users')) {
  localStorage.setItem('asetku_users', JSON.stringify(DEFAULT_USERS));
}

function fillDemo(u, p) {
  document.getElementById('lusername').value = u;
  document.getElementById('lpassword').value = p;
  document.getElementById('lusername').classList.remove('invalid');
  document.getElementById('lpassword').classList.remove('invalid');
  document.getElementById('lerrorMsg').classList.remove('show');
}

document.getElementById('ltogglePw').addEventListener('click', () => {
  const inp = document.getElementById('lpassword');
  const btn = document.getElementById('ltogglePw');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁️'; }
});

document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const username = document.getElementById('lusername').value.trim();
  const password = document.getElementById('lpassword').value;
  const remember = document.getElementById('lrememberMe').checked;
  const errEl = document.getElementById('lerrorMsg');
  errEl.classList.remove('show');

  let valid = true;
  if (!username) { document.getElementById('lusername').classList.add('invalid'); valid = false; }
  if (!password) { document.getElementById('lpassword').classList.add('invalid'); valid = false; }
  if (!valid) {
    document.getElementById('lerrorText').textContent = 'Username dan password wajib diisi.';
    errEl.classList.add('show'); return;
  }
  document.getElementById('lusername').classList.remove('invalid');
  document.getElementById('lpassword').classList.remove('invalid');

  const btn = document.getElementById('lbtn');
  btn.classList.add('loading'); btn.disabled = true;

  setTimeout(() => {
    const user = getUsers().find(u => u.username === username && u.password === password);
    btn.classList.remove('loading'); btn.disabled = false;
    if (user) {
      const expiry = remember ? Date.now() + 7*24*60*60*1000 : Date.now() + 8*60*60*1000;
      localStorage.setItem('asetku_session', JSON.stringify({ username: user.username, name: user.name, role: user.role, avatar: user.avatar, expiry }));
      showView('app');
    } else {
      document.getElementById('lerrorText').textContent = 'Username atau password salah. Coba lagi.';
      errEl.classList.add('show');
      document.getElementById('lpassword').value = '';
      document.getElementById('lpassword').focus();
    }
  }, 700);
});

['lusername','lpassword'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    document.getElementById(id).classList.remove('invalid');
    document.getElementById('lerrorMsg').classList.remove('show');
  });
});

// ══════════════ STARTUP ══════════════
(function() {
  const raw = localStorage.getItem('asetku_session');
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s.expiry > Date.now()) { showView('app'); return; }
      localStorage.removeItem('asetku_session');
    } catch(e) { localStorage.removeItem('asetku_session'); }
  }
  showView('login');
})();
</script>

<script>
// ══════════════ APP LOGIC ══════════════
$appjs
</script>
</body>
</html>
"@

[System.IO.File]::WriteAllText($out, $html, [System.Text.Encoding]::UTF8)
Write-Host "✅ Bundle berhasil dibuat: $out" -ForegroundColor Green
Write-Host "   Ukuran: $([math]::Round((Get-Item $out).Length / 1KB, 1)) KB" -ForegroundColor Cyan
