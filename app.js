/**
 * AsetKu � Aplikasi Manajemen Aset Fisik
 * Versi: 1.0
 * Semua data disimpan di localStorage browser
 */

// ===========================
// AUTH / SESSION
// ===========================
let SESSION = null;

function checkAuth() {
    const raw = localStorage.getItem('asetku_session');
    if (!raw) { window.location.href = 'login.html'; return false; }
    try {
        const s = JSON.parse(raw);
        if (!s.expiry || s.expiry < Date.now()) {
            localStorage.removeItem('asetku_session');
            window.location.href = 'login.html';
            return false;
        }
        SESSION = s;
        return true;
    } catch (e) {
        localStorage.removeItem('asetku_session');
        window.location.href = 'login.html';
        return false;
    }
}

function logout() {
    // Show animated logout overlay
    const overlay = document.getElementById('logoutOverlay');
    const userEl = document.getElementById('logout-user-name');
    const bar = document.getElementById('logout-progress-bar');

    if (userEl && SESSION) userEl.textContent = SESSION.name || '';

    if (overlay) {
        overlay.classList.add('active');
        // Animate progress bar
        if (bar) {
            bar.style.transition = 'width 2s linear';
            requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = '100%'; }));
        }
    }

    // Clear session and redirect after animation completes
    setTimeout(() => {
        localStorage.removeItem('asetku_session');
        window.location.href = 'login.html';
    }, 2200);
}

function isViewer() {
    return SESSION && SESSION.role === 'Viewer';
}

function applyRoleUI() {
    if (!isViewer()) return;

    // Add body class � CSS will hide all edit/delete icons even after re-render
    document.body.classList.add('viewer-mode');

    // Hide static add buttons
    const hideIds = [
        'addAssetBtn',      // Tambah Aset (topbar)
        'addHistoryBtn',    // Tambah Riwayat
        'addCategoryBtn',   // Tambah Kategori
        'addLocationBtn',   // Tambah Lokasi
        'nav-database',     // Database nav (admin only)
    ];
    hideIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function renderSessionUser() {
    if (!SESSION) return;
    const roleColors = { Admin: '#388bfd', User: '#bc8cff', Viewer: '#3fb950' };
    const el = document.querySelector('.sidebar-user');
    if (!el) return;
    el.innerHTML = `
    <div class="user-avatar" style="background:linear-gradient(135deg,${roleColors[SESSION.role] || '#388bfd'},#5c6bc0)">${SESSION.avatar || SESSION.name[0]}</div>
    <div>
      <div class="user-name">${SESSION.name}</div>
      <div class="user-role">${SESSION.role}</div>
    </div>`;

    // Logout button
    const footer = document.querySelector('.sidebar-footer');
    if (footer && !footer.querySelector('.logout-btn')) {
        const btn = document.createElement('button');
        btn.className = 'logout-btn';
        btn.innerHTML = 'Logout';
        btn.title = 'Keluar dari aplikasi';
        btn.onclick = () => {
            if (confirm(`Keluar dari akun ${SESSION.name}?`)) logout();
        };
        footer.appendChild(btn);
    }
}


// ===========================
// STATE
// ===========================
const STATE = {
    assets: [],
    categories: [],
    locations: [],
    currentPage: 'dashboard',
    assetPage: 1,
    assetsPerPage: 10,
    sortKey: 'nama',
    sortDir: 'asc',
    filters: { category: '', location: '', status: '', condition: '', search: '' },
    editingId: null,
    deletingId: null,
};

const COLORS = [
    '#388bfd', '#3fb950', '#d29922', '#f85149', '#bc8cff',
    '#ffa657', '#39d0d8', '#ff7b72', '#79c0ff', '#56d364',
];

// ===========================
// STORAGE
// ===========================
function save() {
    localStorage.setItem('asetku_assets', JSON.stringify(STATE.assets));
    localStorage.setItem('asetku_categories', JSON.stringify(STATE.categories));
    localStorage.setItem('asetku_locations', JSON.stringify(STATE.locations));
}

function load() {
    const a = localStorage.getItem('asetku_assets');
    const c = localStorage.getItem('asetku_categories');
    const l = localStorage.getItem('asetku_locations');
    STATE.assets = a ? JSON.parse(a) : seedAssets();

    // Migration: Update legacy kondisi 'Cukup' to 'Perbaikan' and 'Buruk' to 'Rusak'
    if (a) {
        let modified = false;
        STATE.assets.forEach(asset => {
            if (asset.kondisi === 'Cukup') { asset.kondisi = 'Perbaikan'; modified = true; }
            if (asset.kondisi === 'Buruk') { asset.kondisi = 'Rusak'; modified = true; }
        });
        if (modified) localStorage.setItem('asetku_assets', JSON.stringify(STATE.assets));
    }

    STATE.categories = c ? JSON.parse(c) : ['Elektronik', 'Furnitur', 'Kendaraan', 'Mesin', 'Alat Tulis', 'Peralatan IT', 'Peralatan Medis'];
    STATE.locations = l ? JSON.parse(l) : ['Kantor Pusat', 'Gudang', 'Workshop', 'Ruang Server', 'Lobby', 'Lantai 2', 'Lantai 3'];
    if (!a) save();

    // Seed inspeksi on first load
    const insp = localStorage.getItem('asetku_inspeksi');
    if (!insp) {
        localStorage.setItem('asetku_inspeksi', JSON.stringify(seedInspeksi()));
    } else {
        try {
            let list = JSON.parse(insp);
            let modified = false;
            list.forEach(i => {
                if (i.kondisiTemuan === 'Cukup') { i.kondisiTemuan = 'Perbaikan'; modified = true; }
                if (i.kondisiTemuan === 'Buruk') { i.kondisiTemuan = 'Rusak'; modified = true; }
            });
            if (modified) localStorage.setItem('asetku_inspeksi', JSON.stringify(list));
        } catch (e) { }
    }

    // Seed history on first load
    const h = localStorage.getItem('asetku_history');
    if (!h) {
        const seeded = seedHistory();
        localStorage.setItem('asetku_history', JSON.stringify(seeded));
    }
}

// ===========================
// SEED DATA
// ===========================
function seedAssets() {
    const data = [
        { id: uid(), kode: 'AST-001', nama: 'Laptop Dell Latitude 5420', kategori: 'Peralatan IT', merek: 'Dell', serialNumber: 'DL-54201-XZ', tahun: 2022, lokasi: 'Kantor Pusat', penanggungjawab: 'Budi Santoso', jumlah: 3, satuan: 'unit', kondisi: 'Baik', status: 'Aktif', deskripsi: 'Laptop untuk staf administrasi', createdAt: Date.now() - 86400000 * 10 },
        { id: uid(), kode: 'AST-002', nama: 'Meja Kantor Besi', kategori: 'Furnitur', merek: 'Indoffice', serialNumber: '-', tahun: 2021, lokasi: 'Kantor Pusat', penanggungjawab: 'HR Dept', jumlah: 12, satuan: 'unit', kondisi: 'Baik', status: 'Aktif', deskripsi: 'Meja kerja standar', createdAt: Date.now() - 86400000 * 9 },
        { id: uid(), kode: 'AST-003', nama: 'Proyektor Epson EB-X41', kategori: 'Elektronik', merek: 'Epson', serialNumber: 'EP-X41-09281', tahun: 2020, lokasi: 'Lantai 2', penanggungjawab: 'IT Dept', jumlah: 2, satuan: 'unit', kondisi: 'Perbaikan', status: 'Aktif', deskripsi: 'Proyektor ruang meeting', createdAt: Date.now() - 86400000 * 8 },
        { id: uid(), kode: 'AST-004', nama: 'Mobil Operasional Toyota Innova', kategori: 'Kendaraan', merek: 'Toyota', serialNumber: 'B 1234 XYZ', tahun: 2019, lokasi: 'Kantor Pusat', penanggungjawab: 'Sopir Utama', jumlah: 1, satuan: 'unit', kondisi: 'Baik', status: 'Aktif', deskripsi: 'Kendaraan operasional direksi', createdAt: Date.now() - 86400000 * 7 },
        { id: uid(), kode: 'AST-005', nama: 'Printer HP LaserJet Pro', kategori: 'Peralatan IT', merek: 'HP', serialNumber: 'HP-LJ-38849', tahun: 2021, lokasi: 'Kantor Pusat', penanggungjawab: 'IT Dept', jumlah: 4, satuan: 'unit', kondisi: 'Baik', status: 'Aktif', deskripsi: 'Printer jaringan kantor', createdAt: Date.now() - 86400000 * 6 },
        { id: uid(), kode: 'AST-006', nama: 'Genset Perkins 10 KVA', kategori: 'Mesin', merek: 'Perkins', serialNumber: 'PK-10K-00291', tahun: 2018, lokasi: 'Workshop', penanggungjawab: 'Teknisi', jumlah: 1, satuan: 'unit', kondisi: 'Perbaikan', status: 'Pemeliharaan', deskripsi: 'Dalam jadwal service rutin', createdAt: Date.now() - 86400000 * 5 },
        { id: uid(), kode: 'AST-007', nama: 'Kursi Ergonomis', kategori: 'Furnitur', merek: 'Hara', serialNumber: '-', tahun: 2022, lokasi: 'Lantai 3', penanggungjawab: 'HR Dept', jumlah: 20, satuan: 'unit', kondisi: 'Baik', status: 'Aktif', deskripsi: 'Kursi staf lantai 3', createdAt: Date.now() - 86400000 * 4 },
        { id: uid(), kode: 'AST-008', nama: 'UPS APC 1500VA', kategori: 'Peralatan IT', merek: 'APC', serialNumber: 'APC-1500-XJ2', tahun: 2020, lokasi: 'Ruang Server', penanggungjawab: 'IT Dept', jumlah: 3, satuan: 'unit', kondisi: 'Baik', status: 'Aktif', deskripsi: 'Backup power server', createdAt: Date.now() - 86400000 * 3 },
        { id: uid(), kode: 'AST-009', nama: 'AC Split Daikin 1.5 PK', kategori: 'Elektronik', merek: 'Daikin', serialNumber: 'DK-15PK-9921', tahun: 2019, lokasi: 'Kantor Pusat', penanggungjawab: 'GA Dept', jumlah: 8, satuan: 'unit', kondisi: 'Perbaikan', status: 'Aktif', deskripsi: 'AC ruang kerja', createdAt: Date.now() - 86400000 * 2 },
        { id: uid(), kode: 'AST-010', nama: 'Mesin Fotokopi Ricoh MP 2014', kategori: 'Elektronik', merek: 'Ricoh', serialNumber: 'RC-MP2014-4421', tahun: 2017, lokasi: 'Lantai 2', penanggungjawab: 'GA Dept', jumlah: 1, satuan: 'unit', kondisi: 'Rusak', status: 'Rusak', deskripsi: 'Perlu perbaikan drum unit', createdAt: Date.now() - 86400000 * 1 },
        { id: uid(), kode: 'AST-011', nama: 'Server Rack Dell PowerEdge', kategori: 'Peralatan IT', merek: 'Dell', serialNumber: 'DL-PE-8811A', tahun: 2021, lokasi: 'Ruang Server', penanggungjawab: 'IT Dept', jumlah: 2, satuan: 'unit', kondisi: 'Baik', status: 'Aktif', deskripsi: 'Server utama aplikasi', createdAt: Date.now() },
        { id: uid(), kode: 'AST-012', nama: 'Forklift Toyota 3T', kategori: 'Mesin', merek: 'Toyota', serialNumber: 'TY-3T-09921', tahun: 2020, lokasi: 'Gudang', penanggungjawab: 'Kepala Gudang', jumlah: 1, satuan: 'unit', kondisi: 'Baik', status: 'Aktif', deskripsi: 'Forklift untuk bongkar muat', createdAt: Date.now() },
        // AST-013 sengaja memiliki no. seri SAMA dengan AST-001 untuk demo fitur pengelompokan
        { id: uid(), kode: 'AST-013', nama: 'Laptop Dell Latitude 5420 (Cadangan)', kategori: 'Peralatan IT', merek: 'Dell', serialNumber: 'DL-54201-XZ', tahun: 2022, lokasi: 'Lantai 2', penanggungjawab: 'Rina Wulandari', jumlah: 1, satuan: 'unit', kondisi: 'Baik', status: 'Aktif', deskripsi: 'Unit cadangan dengan body sama', createdAt: Date.now() },
    ];
    return data;
}

// ===========================
// SEED HISTORY DATA
// ===========================
function seedHistory() {
    // Helper: cari asetId berdasarkan kode
    const findId = (kode) => STATE.assets.find(a => a.kode === kode)?.id || '';

    const records = [
        // Riwayat untuk AST-001 (Laptop Dell)
        {
            id: uid(), asetId: findId('AST-001'), asetKode: 'AST-001', asetNama: 'Laptop Dell Latitude 5420',
            nik: '10023', nama: 'Budi Santoso', jabatan: 'Staff IT', departemen: 'IT',
            tgl: '2024-01-10', keterangan: 'Penyerahan aset baru untuk staf IT', createdAt: Date.now() - 86400000 * 80
        },
        {
            id: uid(), asetId: findId('AST-001'), asetKode: 'AST-001', asetNama: 'Laptop Dell Latitude 5420',
            nik: '10045', nama: 'Siti Rahma', jabatan: 'Analis Data', departemen: 'IT',
            tgl: '2024-03-15', keterangan: 'Penggantian unit setelah yang lama diperbaiki', createdAt: Date.now() - 86400000 * 30
        },
        // Riwayat untuk AST-013 (SN sama dengan AST-001 � akan dikelompokkan!)
        {
            id: uid(), asetId: findId('AST-013'), asetKode: 'AST-013', asetNama: 'Laptop Dell Latitude 5420 (Cadangan)',
            nik: '10067', nama: 'Dian Pratama', jabatan: 'Manager IT', departemen: 'IT',
            tgl: '2024-02-20', keterangan: 'Unit cadangan diserahkan saat laptop utama rusak', createdAt: Date.now() - 86400000 * 55
        },
        {
            id: uid(), asetId: findId('AST-013'), asetKode: 'AST-013', asetNama: 'Laptop Dell Latitude 5420 (Cadangan)',
            nik: '10091', nama: 'Agus Hermawan', jabatan: 'Developer', departemen: 'IT',
            tgl: '2024-04-01', keterangan: 'Dipinjam untuk proyek khusus', createdAt: Date.now() - 86400000 * 10
        },
        // Riwayat untuk AST-005 (Printer HP)
        {
            id: uid(), asetId: findId('AST-005'), asetKode: 'AST-005', asetNama: 'Printer HP LaserJet Pro',
            nik: '20011', nama: 'Dewi Kusuma', jabatan: 'Admin', departemen: 'Administrasi',
            tgl: '2024-01-20', keterangan: 'Printer ditempatkan di ruang administrasi', createdAt: Date.now() - 86400000 * 70
        },
        {
            id: uid(), asetId: findId('AST-005'), asetKode: 'AST-005', asetNama: 'Printer HP LaserJet Pro',
            nik: '20033', nama: 'Hendra Wijaya', jabatan: 'Supervisor', departemen: 'Operasional',
            tgl: '2024-02-05', keterangan: 'Dipindahkan ke bagian operasional', createdAt: Date.now() - 86400000 * 60
        },
        // Riwayat untuk AST-004 (Mobil Toyota)
        {
            id: uid(), asetId: findId('AST-004'), asetKode: 'AST-004', asetNama: 'Mobil Operasional Toyota Innova',
            nik: '30001', nama: 'Ahmad Fauzi', jabatan: 'Sopir', departemen: 'GA',
            tgl: '2024-01-05', keterangan: 'Kendaraan dinas resmi direksi', createdAt: Date.now() - 86400000 * 90
        },
        // Riwayat untuk AST-008 (UPS)
        {
            id: uid(), asetId: findId('AST-008'), asetKode: 'AST-008', asetNama: 'UPS APC 1500VA',
            nik: '10023', nama: 'Budi Santoso', jabatan: 'Staff IT', departemen: 'IT',
            tgl: '2023-12-01', keterangan: 'Instalasi UPS server utama', createdAt: Date.now() - 86400000 * 100
        },
    ];
    return records;
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ===========================
// NAVIGATION
// ===========================
function navigate(page) {
    STATE.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${page}`).classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.page === page);
    });

    const titles = { dashboard: 'Dashboard', assets: 'Daftar Aset', categories: 'Kategori', locations: 'Lokasi', reports: 'Laporan', history: 'Riwayat Aset', inspeksi: 'Inspeksi Aset', database: 'Database' };
    document.getElementById('pageTitle').textContent = titles[page] || '';

    // Re-render page specific
    if (page === 'dashboard') renderDashboard();
    if (page === 'assets') renderAssetsTable();
    if (page === 'categories') renderCategories();
    if (page === 'locations') renderLocations();
    if (page === 'reports') renderReports();
    if (page === 'history') renderHistoryPage();
    if (page === 'inspeksi') renderInspeksiPage();
    if (page === 'database') renderDatabase();

    // Mobile: close sidebar
    closeSidebar();
}

// ===========================
// DASHBOARD
// ===========================
function renderDashboard() {
    const all = STATE.assets;
    const total = all.length;
    const aktif = all.filter(a => a.status === 'Aktif').length;
    const pemeliharaan = all.filter(a => a.status === 'Pemeliharaan').length;
    const rusak = all.filter(a => a.status === 'Rusak' || a.status === 'Nonaktif').length;

    setText('stat-total', fmt(total));
    setText('stat-aktif', fmt(aktif));
    setText('stat-pemeliharaan', fmt(pemeliharaan));
    setText('stat-rusak', fmt(rusak));

    // Hero greeting
    const hour = new Date().getHours();
    const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';
    setText('dash-greeting', greeting);
    const name = SESSION?.name || 'Administrator';
    setText('dash-user-name', name);
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    setText('dash-date', dateStr);
    setText('dash-hero-summary', `${fmt(total)} aset terdaftar � ${fmt(aktif)} aktif, ${fmt(pemeliharaan)} pemeliharaan, ${fmt(rusak)} rusak`);

    // Mini progress bars on stat cards
    const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;
    const setBar = (id, pct, color) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = `<div style="height:3px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden;margin-top:12px">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;transition:width 0.8s ease"></div>
        </div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;text-align:right">${pct}% dari total</div>`;
    };
    setBar('dash-bar-aktif', pct(aktif), 'var(--accent-green)');
    setBar('dash-bar-pemeliharaan', pct(pemeliharaan), 'var(--accent-yellow)');
    setBar('dash-bar-rusak', pct(rusak), 'var(--accent-red)');

    // Condition stacked bar
    const kondisiCounts = { Baik: 0, Perbaikan: 0, Rusak: 0 };
    all.forEach(a => { if (kondisiCounts[a.kondisi] !== undefined) kondisiCounts[a.kondisi]++; });
    const kondisiColors = { Baik: 'var(--accent-green)', Perbaikan: 'var(--accent-yellow)', Rusak: 'var(--accent-red)' };
    const condBar = document.getElementById('dash-condition-bar');
    if (condBar && total > 0) {
        condBar.innerHTML = Object.entries(kondisiCounts).map(([k, v]) =>
            `<div class="stacked-segment" style="width:${(v / total) * 100}%;background:${kondisiColors[k]}" title="${k}: ${v}"></div>`
        ).join('');
    }
    const legend = document.getElementById('dash-cond-legend');
    if (legend) {
        legend.innerHTML = Object.entries(kondisiCounts).map(([k, v]) =>
            `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;margin-left:10px;color:var(--text-secondary)">
                <span style="width:8px;height:8px;border-radius:50%;background:${kondisiColors[k]};display:inline-block"></span>
                ${k} (${fmt(v)})
            </span>`
        ).join('');
    }

    // Quick action Tambah Aset wires to openAddModal too
    const qaAdd = document.getElementById('qa-add-aset');
    if (qaAdd && !isViewer()) {
        qaAdd.onclick = () => { navigate('assets'); setTimeout(openAddModal, 100); };
    }

    renderInteractiveCategories();
    renderInteractiveLocations();
    renderChartCategory();
    renderChartStatus();
    renderChartLocation();
    renderRecentTable();
}

function renderInteractiveCategories() {
    const grid = document.getElementById('dash-category-grid');
    if (!grid) return;

    // Get asset inspections
    const allInspeksi = getInspeksi ? getInspeksi() : [];
    const latestInspeksi = {};
    allInspeksi.forEach(r => {
        if (!latestInspeksi[r.asetId] || new Date(r.tglInspeksi) > new Date(latestInspeksi[r.asetId].tglInspeksi)) {
            latestInspeksi[r.asetId] = r;
        }
    });

    // Icons map for some common categories
    const iconMap = {
        'Elektronik': '🔌',
        'Furnitur': '🛋️',
        'Kendaraan': '🚗',
        'Mesin': '⚙️',
        'Alat Tulis': '✏️',
        'Peralatan IT': '💻',
        'Peralatan Medis': '🩺'
    };

    grid.innerHTML = STATE.categories.map((cat, i) => {
        // Find all assets in this category
        const catAssets = STATE.assets.filter(a => a.kategori === cat);
        const totalAset = catAssets.length;

        // Condition count
        const kondisi = { Baik: 0, Perbaikan: 0, Rusak: 0, ditelusuri: 0 };
        catAssets.forEach(a => {
            if (a.kondisi === 'Baik') kondisi.Baik++;
            if (a.kondisi === 'Perbaikan') kondisi.Perbaikan++;
            if (a.kondisi === 'Rusak') kondisi.Rusak++;
            if (a.kondisi === 'ditelusuri') kondisi.ditelusuri++;
        });

        // Latest inspection in this category
        let latestDate = null;
        let latestInspektur = null;

        catAssets.forEach(a => {
            const insp = latestInspeksi[a.id];
            if (insp && insp.status === 'Selesai') {
                const inspDate = new Date(insp.tglInspeksi + 'T00:00:00');
                if (!latestDate || inspDate > latestDate) {
                    latestDate = inspDate;
                    latestInspektur = insp.inspektur;
                }
            }
        });

        let dateStr = 'Belum Ada';
        if (latestDate) {
            dateStr = latestDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        const icon = iconMap[cat] || '📦';
        const palette = COLORS[i % COLORS.length];

        // Get location string
        const locs = Array.from(new Set(catAssets.map(a => a.lokasi))).join(', ') || 'Belum ada aset';

        // Store data attribute for modal
        const dataJson = esc(JSON.stringify({ cat, icon, total: totalAset, kondisi, dateStr, latestInspektur }));

        return `
        <div class="cat-card" onclick="openCategoryDetailDialog(this)" data-info="${dataJson}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:12px; min-width:0;">
                    <div class="cat-icon" style="color: ${palette}; margin:0; width:40px; height:40px; font-size:20px; flex-shrink:0;">${icon}</div>
                    <div class="cat-title" style="margin:0; font-size:14px; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(cat)}">${esc(cat)}</div>
                </div>
                <div class="cat-count" style="font-size:22px; margin-left:8px;">${fmt(totalAset)}</div>
            </div>
            <div>
                <div class="cat-meta" style="margin-top:0;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent-green)"></span> ${fmt(kondisi.Baik)} Baik
                </div>
            </div>
        </div>`;
    }).join('');

    if (STATE.categories.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><p>Belum ada kategori yang ditambahkan.</p></div>';
    }
}

function renderInteractiveLocations() {
    const grid = document.getElementById('dash-location-grid');
    if (!grid) return;

    // Get asset inspections
    const allInspeksi = getInspeksi ? getInspeksi() : [];
    const latestInspeksi = {};
    allInspeksi.forEach(r => {
        if (!latestInspeksi[r.asetId] || new Date(r.tglInspeksi) > new Date(latestInspeksi[r.asetId].tglInspeksi)) {
            latestInspeksi[r.asetId] = r;
        }
    });

    const iconMap = {
        'Kantor Pusat': '🏢',
        'Gudang': '🏭',
        'Workshop': '🛠️',
        'Ruang Server': '🖥️',
        'Lobby': '🛋️',
        'Lantai 2': '🏢',
        'Lantai 3': '🏢'
    };

    grid.innerHTML = STATE.locations.map((loc, i) => {
        // Find all assets in this location
        const locAssets = STATE.assets.filter(a => a.lokasi === loc);
        const totalAset = locAssets.length;

        // Condition count
        const kondisi = { Baik: 0, Perbaikan: 0, Rusak: 0, ditelusuri: 0 };
        locAssets.forEach(a => {
            if (a.kondisi === 'Baik') kondisi.Baik++;
            if (a.kondisi === 'Perbaikan') kondisi.Perbaikan++;
            if (a.kondisi === 'Rusak') kondisi.Rusak++;
            if (a.kondisi === 'ditelusuri') kondisi.ditelusuri++;
        });

        // Latest inspection in this location
        let latestDate = null;
        let latestInspektur = null;

        locAssets.forEach(a => {
            const insp = latestInspeksi[a.id];
            if (insp && insp.status === 'Selesai') {
                const inspDate = new Date(insp.tglInspeksi + 'T00:00:00');
                if (!latestDate || inspDate > latestDate) {
                    latestDate = inspDate;
                    latestInspektur = insp.inspektur;
                }
            }
        });

        let dateStr = 'Belum Ada';
        if (latestDate) {
            dateStr = latestDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        const icon = iconMap[loc] || '📍';
        const palette = COLORS[i % COLORS.length];

        // Get category string
        const cats = Array.from(new Set(locAssets.map(a => a.kategori))).join(', ') || 'Belum ada aset';

        // Store data attribute for modal
        const dataJson = esc(JSON.stringify({ loc, icon, total: totalAset, kondisi, dateStr, latestInspektur }));

        return `
        <div class="cat-card" onclick="openLocationDetailDialog(this)" data-info="${dataJson}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:12px; min-width:0;">
                    <div class="cat-icon" style="color: ${palette}; margin:0; width:40px; height:40px; font-size:20px; flex-shrink:0;">${icon}</div>
                    <div class="cat-title" style="margin:0; font-size:14px; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(loc)}">${esc(loc)}</div>
                </div>
                <div class="cat-count" style="font-size:22px; margin-left:8px;">${fmt(totalAset)}</div>
            </div>
            <div>
                <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(cats)}">🗂️ ${esc(cats)}</div>
                <div class="cat-meta" style="margin-top:0;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent-green)"></span> ${fmt(kondisi.Baik)} Baik
                </div>
            </div>
        </div>`;
    }).join('');

    if (STATE.locations.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><p>Belum ada lokasi yang ditambahkan.</p></div>';
    }
}


function openCategoryDetailDialog(el) {
    const raw = el.getAttribute('data-info');
    if (!raw) return;

    // Unescape quotes manually due to simple esc() function used previously
    const safeStr = raw.replace(/&quot;/g, '"');
    let data;
    try {
        data = JSON.parse(safeStr);
    } catch (e) {
        console.error("Invalid category data format", safeStr);
        return;
    }

    // Get locations for this category
    const catAssets = STATE.assets.filter(a => a.kategori === data.cat);
    const locs = Array.from(new Set(catAssets.map(a => a.lokasi))).join(', ') || '-';

    document.getElementById('cat-modal-title').textContent = 'Detail Kategori: ' + data.cat;
    document.getElementById('cat-modal-icon').textContent = data.icon;
    document.getElementById('cat-modal-subtitle').innerHTML = `Total Aset<br><span style="font-size:11px;color:var(--text-secondary);font-weight:normal;">Lokasi: ${esc(locs)}</span>`;
    document.getElementById('cat-modal-count').textContent = fmt(data.total) + ' Unit';

    // Conditions
    document.getElementById('cat-modal-conditions').innerHTML = `
        <div class="cat-cond-box">
            <span class="cat-cond-val" style="color:var(--accent-green)">${fmt(data.kondisi.Baik)}</span>
            <span class="cat-cond-label">Baik</span>
        </div>
        <div class="cat-cond-box">
            <span class="cat-cond-val" style="color:var(--accent-yellow)">${fmt(data.kondisi.Perbaikan)}</span>
            <span class="cat-cond-label">Perbaikan</span>
        </div>
        <div class="cat-cond-box">
            <span class="cat-cond-val" style="color:var(--accent-red)">${fmt(data.kondisi.Rusak)}</span>
            <span class="cat-cond-label">Rusak</span>
        </div>
        <div class="cat-cond-box">
            <span class="cat-cond-val" style="color:var(--accent-purple)">${fmt(data.kondisi.ditelusuri)}</span>
            <span class="cat-cond-label">Ditelusuri</span>
        </div>
    `;

    // Inspection Breakdown
    const inspHtml = data.dateStr !== 'Belum Ada' ?
        `
        <div style="display:flex;justify-content:space-between;align-items:center;">
             <div style="display:flex;align-items:center;gap:12px;">
                 <span style="font-size:24px;">📅</span>
                 <div>
                     <div style="font-weight:600;font-size:14px;">${data.dateStr}</div>
                     <div style="font-size:12px;color:var(--text-muted)">oleh ${esc(data.latestInspektur || 'Tim Inspeksi')}</div>
                 </div>
             </div>
             <span class="badge badge-baik">Selesai</span>
        </div>` :
        `<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:8px 0;">Belum pernah dilakukan inspeksi untuk aset di kategori ini.</div>`;

    document.getElementById('cat-modal-inspection').innerHTML = inspHtml;

    // View All button hook
    document.getElementById('catModalViewBtn').onclick = () => {
        closeCategoryModal();
        navigate('assets');
        setTimeout(() => {
            const fCat = document.getElementById('filter-category');
            if (fCat) {
                fCat.value = data.cat;
                STATE.filters.category = data.cat;
                STATE.assetPage = 1;
                renderAssetsTable();
            }
        }, 150);
    };

    document.getElementById('categoryDetailModal').classList.add('open');
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryDetailModal');
    if (modal) modal.classList.remove('open');
}

function openLocationDetailDialog(el) {
    const raw = el.getAttribute('data-info');
    if (!raw) return;

    const safeStr = raw.replace(/&quot;/g, '"');
    let data;
    try {
        data = JSON.parse(safeStr);
    } catch (e) {
        console.error("Invalid location data format", safeStr);
        return;
    }

    document.getElementById('loc-modal-title').textContent = 'Detail Lokasi: ' + data.loc;
    document.getElementById('loc-modal-icon').textContent = data.icon;
    document.getElementById('loc-modal-subtitle').textContent = `Total Aset ${data.loc}`;
    document.getElementById('loc-modal-count').textContent = fmt(data.total) + ' Unit';

    // Conditions
    document.getElementById('loc-modal-conditions').innerHTML = `
        <div class="cat-cond-box">
            <span class="cat-cond-val" style="color:var(--accent-green)">${fmt(data.kondisi.Baik)}</span>
            <span class="cat-cond-label">Baik</span>
        </div>
        <div class="cat-cond-box">
            <span class="cat-cond-val" style="color:var(--accent-yellow)">${fmt(data.kondisi.Perbaikan)}</span>
            <span class="cat-cond-label">Perbaikan</span>
        </div>
        <div class="cat-cond-box">
            <span class="cat-cond-val" style="color:var(--accent-red)">${fmt(data.kondisi.Rusak)}</span>
            <span class="cat-cond-label">Rusak</span>
        </div>
        <div class="cat-cond-box">
            <span class="cat-cond-val" style="color:var(--accent-purple)">${fmt(data.kondisi.ditelusuri)}</span>
            <span class="cat-cond-label">Ditelusuri</span>
        </div>
    `;

    // Inspection Breakdown
    const inspHtml = data.dateStr !== 'Belum Ada' ?
        `
        <div style="display:flex;justify-content:space-between;align-items:center;">
             <div style="display:flex;align-items:center;gap:12px;">
                 <span style="font-size:24px;">📅</span>
                 <div>
                     <div style="font-weight:600;font-size:14px;">${data.dateStr}</div>
                     <div style="font-size:12px;color:var(--text-muted)">oleh ${esc(data.latestInspektur || 'Tim Inspeksi')}</div>
                 </div>
             </div>
             <span class="badge badge-baik">Selesai</span>
        </div>` :
        `<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:8px 0;">Belum pernah dilakukan inspeksi untuk aset di lokasi ini.</div>`;

    document.getElementById('loc-modal-inspection').innerHTML = inspHtml;

    // View All button hook
    document.getElementById('locModalViewBtn').onclick = () => {
        closeLocationModal();
        navigate('assets');
        setTimeout(() => {
            const fLoc = document.getElementById('filter-location');
            if (fLoc) {
                fLoc.value = data.loc;
                STATE.filters.location = data.loc;
                STATE.assetPage = 1;
                renderAssetsTable();
            }
        }, 150);
    };

    document.getElementById('locationDetailModal').classList.add('open');
}

function closeLocationModal() {
    const modal = document.getElementById('locationDetailModal');
    if (modal) modal.classList.remove('open');
}

function renderChartCategory() {
    const counts = groupBy(STATE.assets, 'kategori');
    renderBarChart('chart-category', 'legend-category', counts);
}

function renderChartStatus() {
    const counts = groupBy(STATE.assets, 'status');
    renderBarChart('chart-status', 'legend-status', counts, ['#3fb950', '#d29922', '#f85149', '#888']);
}

function renderChartLocation() {
    const counts = groupBy(STATE.assets, 'lokasi');
    renderBarChart('chart-location', 'legend-location', counts);
}

function renderBarChart(containerId, legendId, counts, colors) {
    const container = document.getElementById(containerId);
    const legendEl = document.getElementById(legendId);
    if (!container) return;

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(e => e[1]), 1);
    const palette = colors || COLORS;
    const maxH = 120;

    container.innerHTML = '';
    if (legendEl) legendEl.innerHTML = '';

    if (entries.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:20px"><p>Belum ada data</p></div>';
        return;
    }

    entries.forEach(([key, val], i) => {
        const color = palette[i % palette.length];
        const isVertical = container.classList.contains('vertical-chart');

        // Use percentage width for horizontal layout, pixels for vertical layout
        const pct = Math.max(2, Math.round((val / max) * 90)); // max 90%
        const h = Math.max(8, Math.round((val / max) * maxH));
        const style = isVertical ? `width:${pct}%;height:14px;background:${color}` : `height:${h}px;background:${color}`;

        container.innerHTML += `
      <div class="bar-wrap">
        <div class="bar-value">${fmt(val)}</div>
        <div class="bar" style="${style}" title="${key}: ${fmt(val)}"></div>
        <div class="bar-label" title="${key}">${key}</div>
      </div>`;
        if (legendEl) {
            legendEl.innerHTML += `
        <div class="legend-item">
            <div class="legend-dot" style="background:${color}"></div>
            <span>${key} (${fmt(val)})</span>
        </div>`;
        }
    });
}

function renderRecentTable() {
    const tbody = document.getElementById('recent-table-body');
    const recent = [...STATE.assets].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 4);

    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>Belum ada aset</p></div></td></tr>`;
        return;
    }

    tbody.innerHTML = recent.map((a, i) => `
    <tr>
      <td style="color:var(--text-muted);font-size:12px;text-align:center;width:32px">${i + 1}</td>
      <td><code style="font-size:12px;color:var(--accent-blue)">${esc(a.kode)}</code></td>
      <td><strong>${esc(a.nama)}</strong></td>
      <td>${esc(a.kategori)}</td>
      <td>${esc(a.lokasi)}</td>
      <td style="text-align:right;font-weight:700;color:var(--accent-blue);font-variant-numeric:tabular-nums">${fmt(a.jumlah)}</td>
      <td>${badgeKondisi(a.kondisi)}</td>
      <td>${badgeStatus(a.status)}</td>
    </tr>`).join('');
}

// Navigasi cepat dari Dashboard Stat Cards
function filterAssetsByStatus(status) {
    navigate('assets');
    setTimeout(() => {
        // Reset filters first
        STATE.filters = { category: '', location: '', status: '', condition: '', search: '' };

        const fCat = document.getElementById('filter-category');
        if (fCat) fCat.value = '';
        const fLoc = document.getElementById('filter-location');
        if (fLoc) fLoc.value = '';
        const fCond = document.getElementById('filter-condition');
        if (fCond) fCond.value = '';
        const fSearch = document.getElementById('asset-search');
        if (fSearch) fSearch.value = '';

        // Set new status filter
        const fStatus = document.getElementById('filter-status');
        if (fStatus) {
            fStatus.value = status;
            STATE.filters.status = status;
        }

        STATE.assetPage = 1;
        renderAssetsTable();
    }, 150);
}

// ===========================
// ASSETS TABLE
// ===========================
function getFilteredAssets() {
    let list = [...STATE.assets];
    const { category, location, status, condition, search } = STATE.filters;
    if (category) list = list.filter(a => a.kategori === category);
    if (location) list = list.filter(a => a.lokasi === location);
    if (status) list = list.filter(a => a.status === status);
    if (condition) list = list.filter(a => a.kondisi === condition);
    if (search) {
        const q = search.toLowerCase();
        list = list.filter(a =>
            a.kode?.toLowerCase().includes(q) ||
            a.nama?.toLowerCase().includes(q) ||
            a.merek?.toLowerCase().includes(q) ||
            a.serialNumber?.toLowerCase().includes(q) ||
            a.penanggungjawab?.toLowerCase().includes(q)
        );
    }
    // Sort
    list.sort((a, b) => {
        const va = (a[STATE.sortKey] ?? '').toString().toLowerCase();
        const vb = (b[STATE.sortKey] ?? '').toString().toLowerCase();
        const numA = parseFloat(a[STATE.sortKey]);
        const numB = parseFloat(b[STATE.sortKey]);
        let cmp;
        if (!isNaN(numA) && !isNaN(numB)) { cmp = numA - numB; }
        else { cmp = va < vb ? -1 : va > vb ? 1 : 0; }
        return STATE.sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
}

// -- Hitung umur aset dari tahun perolehan ---------------------
function assetAge(tahun) {
    if (!tahun) return { label: '�', years: null, months: null };
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth(); // 0-indexed
    const acqYear = parseInt(tahun);
    const acqMonth = 0; // hanya punya tahun, anggap mulai Januari
    let years = nowYear - acqYear;
    let months = nowMonth - acqMonth;
    if (months < 0) { years--; months += 12; }
    const totalMonths = years * 12 + months;
    let label;
    if (totalMonths < 12) label = `${totalMonths} Bln`;
    else if (months === 0) label = `${years} Thn`;
    else label = `${years} Thn ${months} Bln`;
    return { label, years, months, totalMonths };
}

function ageBadge(tahun) {
    const { label, years } = assetAge(tahun);
    if (label === '�') return `<span style="color:var(--text-muted);font-size:12px">�</span>`;
    let color, bg;
    if (years < 3) { color = '#3fb950'; bg = 'rgba(63,185,80,0.12)'; }   // hijau � baru
    else if (years < 7) { color = '#d29922'; bg = 'rgba(210,153,34,0.12)'; }  // kuning � sedang
    else if (years < 10) { color = '#ffa657'; bg = 'rgba(255,166,87,0.12)'; }  // oranye � tua
    else { color = '#f85149'; bg = 'rgba(248,81,73,0.12)'; }    // merah � sangat tua
    return `<span class="age-badge" style="background:${bg};color:${color};border:1px solid ${color}30" title="Diperoleh tahun ${tahun}">${label}</span>`;
}

function renderAssetsTable() {
    populateFilterSelects();

    const asInput = document.getElementById('asset-search');
    const asClear = document.getElementById('assetSearchClear');
    if (asInput) asInput.value = STATE.filters.search || '';
    if (asClear) asClear.style.display = STATE.filters.search ? 'flex' : 'none';

    const filtered = getFilteredAssets();
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / STATE.assetsPerPage));
    if (STATE.assetPage > pages) STATE.assetPage = 1;
    const start = (STATE.assetPage - 1) * STATE.assetsPerPage;
    const slice = filtered.slice(start, start + STATE.assetsPerPage);

    document.getElementById('table-info').textContent = `Menampilkan ${slice.length} dari ${total} aset`;

    // Hitung riwayat per aset � hanya informasi, tidak memfilter apapun
    const history = getHistory();
    const historyCount = {};
    history.forEach(h => {
        historyCount[h.asetId] = (historyCount[h.asetId] || 0) + 1;
    });

    const tbody = document.getElementById('assets-table-body');
    if (slice.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14">
      <div class="empty-state">
        <div class="empty-state-icon">??</div>
        <h3>Tidak Ada Aset</h3>
        <p>Coba ubah filter atau tambahkan aset baru.</p>
      </div></td></tr>`;
    } else {
        tbody.innerHTML = slice.map(a => {
            const rCount = historyCount[a.id] || 0;
            const rBadge = rCount > 0
                ? `<button class="riwayat-count-badge" onclick="event.stopPropagation();navigateToHistoryForAsset('${a.id}')" title="Lihat ${rCount} riwayat aset ini">?? ${rCount}</button>`
                : `<span style="color:var(--text-muted);font-size:12px;padding:0 4px">�</span>`;
            return `
      <tr class="asset-row" onclick="openAssetDetail('${a.id}')" style="cursor:pointer" title="Klik untuk melihat detail lengkap">
        <td><code style="font-size:12px;color:var(--accent-blue)">${esc(a.kode)}</code></td>
        <td><strong>${esc(a.nama)}</strong></td>
        <td>${esc(a.kategori)}</td>
        <td>${esc(a.merek || '-')}</td>
        <td style="color:var(--text-muted);font-size:12px">${esc(a.serialNumber || '-')}</td>
        <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;color:var(--text-secondary)" title="${esc(a.spesifikasi || '')}">${esc(a.spesifikasi || '-')}</td>
        <td>${esc(a.lokasi)}</td>
        <td style="text-align:right;font-weight:700;font-variant-numeric:tabular-nums;color:var(--accent-blue)">${fmt(a.jumlah)}</td>
        <td style="color:var(--text-muted)">${esc(a.satuan || 'unit')}</td>
        <td>${badgeKondisi(a.kondisi)}</td>
        <td>${badgeStatus(a.status)}</td>
        <td style="text-align:center">${ageBadge(a.tahun)}</td>
        <td style="text-align:center">${rBadge}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn-icon edit" onclick="event.stopPropagation();openEditModal('${a.id}')" title="Edit">✏️</button>
            <button class="btn-icon delete" onclick="event.stopPropagation();openDeleteModal('${a.id}')" title="Hapus">🗑️</button>
          </div>
        </td>
      </tr>`;
        }).join('');
    }

    renderPagination(pages);
}

// -- Asset Detail Modal -----------------------------------------
let _detailAsetId = null;

function openAssetDetail(id) {
    const a = STATE.assets.find(x => x.id === id);
    if (!a) return;
    _detailAsetId = id;

    const { label: ageLabel, years } = assetAge(a.tahun);
    let ageColor = '#3fb950';
    if (years >= 10) ageColor = '#f85149';
    else if (years >= 7) ageColor = '#ffa657';
    else if (years >= 3) ageColor = '#d29922';

    const history = getHistory().filter(h => h.asetId === id);
    const lastHistory = history.sort((x, y) => new Date(y.tgl) - new Date(x.tgl))[0];

    document.getElementById('detail-title').textContent = a.nama;
    document.getElementById('detail-kode').textContent = a.kode + (a.serialNumber && a.serialNumber !== '-' ? `  �  SN: ${a.serialNumber}` : '');

    document.getElementById('detail-body').innerHTML = `
      <div class="detail-grid">
        <!-- STATUS STRIP -->
        <div class="detail-status-strip">
          ${badgeStatus(a.status)}
          ${badgeKondisi(a.kondisi)}
          <span class="age-badge" style="color:${ageColor};background:${ageColor}18;border:1px solid ${ageColor}30">
            ? ${ageLabel} (sejak ${a.tahun || '?'})
          </span>
        </div>

        <!-- SECTION: Identitas -->
        <div class="detail-section">
          <div class="detail-section-title">Identitas Aset</div>
          <div class="detail-row"><span>Kode Aset</span><code style="color:var(--accent-blue)">${esc(a.kode)}</code></div>
          <div class="detail-row"><span>Nama Aset</span><strong>${esc(a.nama)}</strong></div>
          <div class="detail-row"><span>Kategori</span>${esc(a.kategori || '-')}</div>
          <div class="detail-row"><span>Merek / Model</span>${esc(a.merek || '-')}</div>
          <div class="detail-row"><span>Nomor Seri</span><code style="font-size:12px">${esc(a.serialNumber || '-')}</code></div>
          <div class="detail-row"><span>Tahun Perolehan</span>${a.tahun || '-'}</div>
          <div class="detail-row"><span>Umur Aset</span><span style="color:${ageColor};font-weight:700">${ageLabel}</span></div>
        </div>

        <!-- SECTION: Lokasi -->
        <div class="detail-section">
          <div class="detail-section-title">Penanggung Jawab</div>
          <div class="detail-row"><span>Lokasi</span>${esc(a.lokasi || '-')}</div>
          <div class="detail-row"><span>Penanggung Jawab</span>${esc(a.penanggungjawab || '-')}</div>
        </div>

        <!-- SECTION: Fisik -->
        <div class="detail-section">
          <div class="detail-section-title">Detail Fisik</div>
          <div class="detail-row"><span>Jumlah</span><strong style="color:var(--accent-blue)">${fmt(a.jumlah)} ${esc(a.satuan || 'unit')}</strong></div>
          <div class="detail-row"><span>Kondisi</span>${badgeKondisi(a.kondisi)}</div>
          <div class="detail-row"><span>Status</span>${badgeStatus(a.status)}</div>
          ${a.spesifikasi ? `<div class="detail-row"><span>Spesifikasi</span><span style="color:var(--text-secondary)">${esc(a.spesifikasi)}</span></div>` : ''}
          ${a.deskripsi ? `<div class="detail-row"><span>Deskripsi / Catatan</span><span style="color:var(--text-secondary)">${esc(a.deskripsi)}</span></div>` : ''}
        </div>

        <!-- SECTION: Riwayat ringkasan -->
        ${history.length > 0 ? `
        <div class="detail-section">
          <div class="detail-section-title">Riwayat Penerimaan (${history.length} catatan)</div>
          ${lastHistory ? `<div class="detail-row"><span>Penerima Terakhir</span><strong>${esc(lastHistory.nama)}</strong> <span style="color:var(--text-muted);font-size:11px">(${lastHistory.jabatan || ''}  ${lastHistory.departemen || ''})</span></div>` : ''}
          ${lastHistory ? `<div class="detail-row"><span>Tanggal Terakhir</span>${new Date(lastHistory.tgl + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>` : ''}
          ${lastHistory?.keterangan ? `<div class="detail-row"><span>Keterangan</span><span style="color:var(--text-secondary);font-size:12px">${esc(lastHistory.keterangan)}</span></div>` : ''}
        </div>` : ''}
      </div>`;

    // Wire footer buttons
    document.getElementById('detailEditBtn').onclick = () => { closeAssetDetail(); openEditModal(id); };
    document.getElementById('detailDeleteBtn').onclick = () => { closeAssetDetail(); openDeleteModal(id); };
    document.getElementById('detailHistoryBtn').onclick = () => { closeAssetDetail(); navigateToHistoryForAsset(id); };

    document.getElementById('assetDetailModal').classList.add('open');
}

function closeAssetDetail() {
    document.getElementById('assetDetailModal').classList.remove('open');
    _detailAsetId = null;
}

// Navigasi ke Riwayat Aset dengan aset tertentu sudah dipre-filter
function navigateToHistoryForAsset(asetId) {
    navigate('history');
    setTimeout(() => {
        const sel = document.getElementById('history-filter-aset');
        if (sel) { sel.value = asetId; renderHistoryPage(); }
    }, 120);
}

function renderPagination(totalPages) {
    const el = document.getElementById('pagination');
    el.innerHTML = '';

    if (totalPages <= 1) return;

    // Prev
    const prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.textContent = '�';
    prev.disabled = STATE.assetPage === 1;
    prev.onclick = () => { STATE.assetPage--; renderAssetsTable(); };
    el.appendChild(prev);

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && Math.abs(i - STATE.assetPage) > 2 && i !== 1 && i !== totalPages) {
            if (i === 2 || i === totalPages - 1) {
                const dots = document.createElement('button');
                dots.className = 'page-btn';
                dots.textContent = '�';
                dots.disabled = true;
                el.appendChild(dots);
            }
            continue;
        }
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (i === STATE.assetPage ? ' active' : '');
        btn.textContent = i;
        btn.onclick = () => { STATE.assetPage = i; renderAssetsTable(); };
        el.appendChild(btn);
    }

    // Next
    const next = document.createElement('button');
    next.className = 'page-btn';
    next.textContent = '�';
    next.disabled = STATE.assetPage === totalPages;
    next.onclick = () => { STATE.assetPage++; renderAssetsTable(); };
    el.appendChild(next);
}

function populateFilterSelects() {
    const fCat = document.getElementById('filter-category');
    const fLoc = document.getElementById('filter-location');
    const fCatVal = fCat.value;
    const fLocVal = fLoc.value;

    fCat.innerHTML = '<option value="">Semua Kategori</option>' +
        STATE.categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    fLoc.innerHTML = '<option value="">Semua Lokasi</option>' +
        STATE.locations.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
    fCat.value = fCatVal;
    fLoc.value = fLocVal;
}

// ===========================
// CATEGORIES
// ===========================
function renderCategories() {
    const list = document.getElementById('category-list');
    list.innerHTML = STATE.categories.length === 0
        ? '<li style="color:var(--text-muted);padding:12px;font-size:13px">Belum ada kategori.</li>'
        : STATE.categories.map((c, i) => `
        <li class="tag-item">
          <span>${esc(c)}</span>
          <button class="tag-remove" onclick="deleteCategory(${i})" title="Hapus">?</button>
        </li>`).join('');

    // Summary
    const summary = document.getElementById('category-summary');
    const counts = groupBy(STATE.assets, 'kategori');
    if (STATE.categories.length === 0) {
        summary.innerHTML = '<div class="summary-empty">Belum ada kategori.</div>';
    } else {
        summary.innerHTML = STATE.categories.map(c => `
      <div class="summary-item">
        <span class="summary-label">${esc(c)}</span>
        <span class="summary-count">${counts[c] || 0} aset</span>
      </div>`).join('');
    }
}

function addCategory() {
    if (isViewer()) { showToast('Akses ditolak: akun Viewer tidak bisa menambah kategori', 'error'); return; }
    const input = document.getElementById('new-category-input');
    const val = input.value.trim();
    if (!val) return;
    if (STATE.categories.includes(val)) { showToast('Kategori sudah ada!', 'error'); return; }
    STATE.categories.push(val);
    save(); renderCategories(); input.value = '';
    showToast(`Kategori "${val}" ditambahkan`, 'success');
}

function deleteCategory(index) {
    const name = STATE.categories[index];
    STATE.categories.splice(index, 1);
    save(); renderCategories();
    showToast(`Kategori "${name}" dihapus`, 'info');
}

// ===========================
// LOCATIONS
// ===========================
function renderLocations() {
    const list = document.getElementById('location-list');
    list.innerHTML = STATE.locations.length === 0
        ? '<li style="color:var(--text-muted);padding:12px;font-size:13px">Belum ada lokasi.</li>'
        : STATE.locations.map((l, i) => `
        <li class="tag-item">
          <span>${esc(l)}</span>
          <button class="tag-remove" onclick="deleteLocation(${i})" title="Hapus">?</button>
        </li>`).join('');

    const summary = document.getElementById('location-summary');
    const counts = groupBy(STATE.assets, 'lokasi');
    if (STATE.locations.length === 0) {
        summary.innerHTML = '<div class="summary-empty">Belum ada lokasi.</div>';
    } else {
        summary.innerHTML = STATE.locations.map(l => `
      <div class="summary-item">
        <span class="summary-label">${esc(l)}</span>
        <span class="summary-count">${counts[l] || 0} aset</span>
      </div>`).join('');
    }
}

function addLocation() {
    if (isViewer()) { showToast('Akses ditolak: akun Viewer tidak bisa menambah lokasi', 'error'); return; }
    const input = document.getElementById('new-location-input');
    const val = input.value.trim();
    if (!val) return;
    if (STATE.locations.includes(val)) { showToast('Lokasi sudah ada!', 'error'); return; }
    STATE.locations.push(val);
    save(); renderLocations(); input.value = '';
    showToast(`Lokasi "${val}" ditambahkan`, 'success');
}

function deleteLocation(index) {
    const name = STATE.locations[index];
    STATE.locations.splice(index, 1);
    save(); renderLocations();
    showToast(`Lokasi "${name}" dihapus`, 'info');
}

// ===========================
// REPORTS
// ===========================
function renderReports() {
    const el = document.getElementById('reports-grid');
    const all = STATE.assets;
    const cats = groupBy(all, 'kategori');
    const locs = groupBy(all, 'lokasi');
    const stats = groupBy(all, 'status');
    const conds = groupBy(all, 'kondisi');

    function reportCard(title, data) {
        const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
        return `<div class="report-card">
      <div class="report-title">${title}</div>
      ${rows.length === 0 ? '<div class="summary-empty">Belum ada data</div>' :
                rows.map(([k, v]) => `
          <div class="report-row">
            <span class="report-key">${esc(k)}</span>
            <span class="report-val">${v}</span>
          </div>`).join('')}
    </div>`;
    }

    // Summary card
    const totalUnits = all.reduce((s, a) => s + (parseInt(a.jumlah) || 0), 0);
    const summaryCard = `<div class="report-card">
    <div class="report-title">?? Ringkasan Umum</div>
    <div class="report-row"><span class="report-key">Total Jenis Aset</span><span class="report-val">${all.length}</span></div>
    <div class="report-row"><span class="report-key">Total Unit Fisik</span><span class="report-val">${totalUnits}</span></div>
    <div class="report-row"><span class="report-key">Kategori Aktif</span><span class="report-val">${STATE.categories.length}</span></div>
    <div class="report-row"><span class="report-key">Lokasi Aktif</span><span class="report-val">${STATE.locations.length}</span></div>
    <div class="report-row"><span class="report-key">Aset Rusak/Nonaktif</span><span class="report-val" style="color:var(--accent-red)">${(stats['Rusak'] || 0) + (stats['Nonaktif'] || 0)}</span></div>
    <div class="report-row"><span class="report-key">Perlu Pemeliharaan</span><span class="report-val" style="color:var(--accent-yellow)">${stats['Pemeliharaan'] || 0}</span></div>
  </div>`;

    el.innerHTML = summaryCard
        + reportCard('Aset per Kategori', cats)
        + reportCard('Aset per Lokasi', locs)
        + reportCard('Aset per Status', stats)
        + reportCard('Aset per Kondisi', conds);
}

// ===========================
// MODAL � ADD/EDIT
// ===========================
function openAddModal() {
    if (isViewer()) { showToast('Akses ditolak: akun Viewer tidak bisa menambah data', 'error'); return; }
    STATE.editingId = null;
    document.getElementById('modal-title').textContent = 'Tambah Aset Baru';
    document.getElementById('assetForm').reset();
    document.getElementById('asset-id').value = '';
    populateFormSelects();
    document.getElementById('assetModal').classList.add('open');
}

function openEditModal(id) {
    if (isViewer()) { showToast('Akses ditolak: akun Viewer tidak bisa mengedit data', 'error'); return; }
    const a = STATE.assets.find(x => x.id === id);
    if (!a) return;
    STATE.editingId = id;
    document.getElementById('modal-title').textContent = 'Edit Aset';
    document.getElementById('asset-id').value = a.id;
    populateFormSelects();

    document.getElementById('f-kode').value = a.kode || '';
    document.getElementById('f-nama').value = a.nama || '';
    document.getElementById('f-kategori').value = a.kategori || '';
    document.getElementById('f-merek').value = a.merek || '';
    document.getElementById('f-serial').value = a.serialNumber || '';
    document.getElementById('f-tahun').value = a.tahun || '';
    document.getElementById('f-lokasi').value = a.lokasi || '';
    document.getElementById('f-penanggungjawab').value = a.penanggungjawab || '';
    document.getElementById('f-jumlah').value = a.jumlah || '';
    document.getElementById('f-satuan').value = a.satuan || '';
    document.getElementById('f-kondisi').value = a.kondisi || 'Baik';
    document.getElementById('f-status').value = a.status || 'Aktif';
    document.getElementById('f-spesifikasi').value = a.spesifikasi || '';
    document.getElementById('f-deskripsi').value = a.deskripsi || '';

    document.getElementById('assetModal').classList.add('open');
}

function closeAssetModal() {
    document.getElementById('assetModal').classList.remove('open');
    clearFormValidation();
}

function populateFormSelects() {
    const catSel = document.getElementById('f-kategori');
    const locSel = document.getElementById('f-lokasi');
    const catVal = catSel.value;
    const locVal = locSel.value;
    catSel.innerHTML = '<option value="">-- Pilih Kategori --</option>' +
        STATE.categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    locSel.innerHTML = '<option value="">-- Pilih Lokasi --</option>' +
        STATE.locations.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
    if (catVal) catSel.value = catVal;
    if (locVal) locSel.value = locVal;
}

function saveAsset() {
    if (isViewer()) { showToast('Akses ditolak', 'error'); return; }
    // Validate
    const kode = document.getElementById('f-kode').value.trim();
    const nama = document.getElementById('f-nama').value.trim();
    const kategori = document.getElementById('f-kategori').value;
    const lokasi = document.getElementById('f-lokasi').value;
    const jumlah = document.getElementById('f-jumlah').value;

    let valid = true;
    clearFormValidation();

    if (!kode) { markInvalid('f-kode'); valid = false; }
    if (!nama) { markInvalid('f-nama'); valid = false; }
    if (!kategori) { markInvalid('f-kategori'); valid = false; }
    if (!lokasi) { markInvalid('f-lokasi'); valid = false; }
    if (!jumlah || parseInt(jumlah) < 0) { markInvalid('f-jumlah'); valid = false; }

    if (!valid) { showToast('Lengkapi field wajib!', 'error'); return; }

    // Check duplicate kode
    const dupKode = STATE.assets.find(a => a.kode === kode && a.id !== STATE.editingId);
    if (dupKode) { markInvalid('f-kode'); showToast('Kode aset sudah digunakan!', 'error'); return; }

    const obj = {
        kode,
        nama,
        kategori,
        merek: document.getElementById('f-merek').value.trim(),
        serialNumber: document.getElementById('f-serial').value.trim(),
        tahun: parseInt(document.getElementById('f-tahun').value) || null,
        lokasi,
        penanggungjawab: document.getElementById('f-penanggungjawab').value.trim(),
        jumlah: parseInt(jumlah) || 0,
        satuan: document.getElementById('f-satuan').value.trim() || 'unit',
        kondisi: document.getElementById('f-kondisi').value,
        status: document.getElementById('f-status').value,
        spesifikasi: document.getElementById('f-spesifikasi').value.trim(),
        deskripsi: document.getElementById('f-deskripsi').value.trim(),
    };

    if (STATE.editingId) {
        const idx = STATE.assets.findIndex(a => a.id === STATE.editingId);
        STATE.assets[idx] = { ...STATE.assets[idx], ...obj };
        showToast(`Aset "${nama}" diperbarui`, 'success');
    } else {
        obj.id = uid();
        obj.createdAt = Date.now();
        STATE.assets.push(obj);
        showToast(`Aset "${nama}" ditambahkan`, 'success');
    }

    save();
    closeAssetModal();
    if (STATE.currentPage === 'dashboard') renderDashboard();
    if (STATE.currentPage === 'assets') renderAssetsTable();
}

function markInvalid(id) {
    document.getElementById(id)?.classList.add('invalid');
}
function clearFormValidation() {
    document.querySelectorAll('#assetForm .invalid').forEach(el => el.classList.remove('invalid'));
}

// ===========================
// MODAL � DELETE
// ===========================
function openDeleteModal(id) {
    const a = STATE.assets.find(x => x.id === id);
    if (!a) return;
    STATE.deletingId = id;
    document.getElementById('deleteAssetName').textContent = `${a.kode} � ${a.nama}`;
    document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('open');
    STATE.deletingId = null;
}

function confirmDelete() {
    const a = STATE.assets.find(x => x.id === STATE.deletingId);
    if (!a) return;
    STATE.assets = STATE.assets.filter(x => x.id !== STATE.deletingId);
    save();
    closeDeleteModal();
    showToast(`Aset "${a.nama}" dihapus`, 'info');
    if (STATE.currentPage === 'dashboard') renderDashboard();
    if (STATE.currentPage === 'assets') renderAssetsTable();
}

// ===========================
// EXPORT / PRINT
// ===========================
function exportCSV() {
    const filtered = getFilteredAssets();
    const headers = ['Kode Aset', 'Nama Aset', 'Kategori', 'Merek/Model', 'No. Seri', 'Spesifikasi', 'Tahun Perolehan', 'Lokasi', 'Penanggung Jawab', 'Jumlah', 'Satuan', 'Kondisi', 'Status', 'Deskripsi'];
    const rows = filtered.map(a => [
        a.kode, a.nama, a.kategori, a.merek, a.serialNumber, a.spesifikasi,
        a.tahun, a.lokasi, a.penanggungjawab, a.jumlah, a.satuan,
        a.kondisi, a.status, a.deskripsi
    ].map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`));

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aset-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File CSV berhasil diunduh', 'success');
}

function printAssets() {
    navigate('assets');
    setTimeout(() => window.print(), 200);
}

// -- EXCEL EXPORT --
function exportExcel() {
    const filtered = getFilteredAssets();
    const headers = ['Kode Aset', 'Nama Aset', 'Kategori', 'Merek/Model', 'No. Seri', 'Spesifikasi', 'Tahun', 'Lokasi', 'Penanggung Jawab', 'Jumlah', 'Satuan', 'Kondisi', 'Status', 'Deskripsi'];
    const fields = ['kode', 'nama', 'kategori', 'merek', 'serialNumber', 'spesifikasi', 'tahun', 'lokasi', 'penanggungjawab', 'jumlah', 'satuan', 'kondisi', 'status', 'deskripsi'];

    // Build an HTML table and wrap in Excel-compatible XML
    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='UTF-8'/>
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Aset</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>th{background:#1d3a6e;color:#fff;font-weight:bold;} td,th{border:1px solid #ccc;padding:6px;}</style>
</head><body><table>`;
    html += '<tr>' + headers.map(h => `<th>${esc(h)}</th>`).join('') + '</tr>';
    filtered.forEach(a => {
        html += '<tr>' + fields.map(f => `<td>${esc(a[f])}</td>`).join('') + '</tr>';
    });
    html += '</table></body></html>';

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aset-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File Excel berhasil diunduh ?', 'success');
}

// -- PDF EXPORT --
async function exportPdf() {
    showToast('Membuat PDF, harap tunggu...', 'info');
    const table = document.querySelector('#page-assets .data-table');
    if (!table) { showToast('Buka halaman Daftar Aset terlebih dahulu', 'error'); return; }
    try {
        const canvas = await html2canvas(table, { scale: 1.5, backgroundColor: '#0d1117', useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const imgW = pageW - margin * 2;
        const imgH = (canvas.height * imgW) / canvas.width;

        // Header
        pdf.setFillColor(13, 17, 23);
        pdf.rect(0, 0, pageW, pageH, 'F');
        pdf.setFontSize(14);
        pdf.setTextColor(230, 237, 243);
        pdf.text('AsetKu � Laporan Daftar Aset', margin, margin - 2);
        pdf.setFontSize(9);
        pdf.setTextColor(139, 148, 158);
        pdf.text(`Diekspor: ${new Date().toLocaleString('id-ID')}  |  Total: ${getFilteredAssets().length} aset`, margin, margin + 3);

        let y = margin + 8;
        let remaining = imgH;
        let srcY = 0;
        while (remaining > 0) {
            const sliceH = Math.min(remaining, pageH - y - margin);
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = (sliceH / imgW) * canvas.width;
            const ctx = sliceCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, srcY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
            pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', margin, y, imgW, sliceH);
            srcY += sliceCanvas.height;
            remaining -= sliceH;
            if (remaining > 0) { pdf.addPage(); y = margin; }
        }
        pdf.save(`aset-${new Date().toISOString().slice(0, 10)}.pdf`);
        showToast('File PDF berhasil diunduh ?', 'success');
    } catch (e) {
        showToast('Gagal membuat PDF: ' + e.message, 'error');
    }
}

// -- JPEG EXPORT --
async function exportJpeg() {
    showToast('Membuat gambar, harap tunggu...', 'info');
    const table = document.querySelector('#page-assets .data-table');
    if (!table) { showToast('Buka halaman Daftar Aset terlebih dahulu', 'error'); return; }
    try {
        const canvas = await html2canvas(table, { scale: 2, backgroundColor: '#161b22', useCORS: true });
        const url = canvas.toDataURL('image/jpeg', 0.95);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aset-${new Date().toISOString().slice(0, 10)}.jpg`;
        a.click();
        showToast('File JPEG berhasil diunduh ?', 'success');
    } catch (e) {
        showToast('Gagal membuat gambar: ' + e.message, 'error');
    }
}

// ===========================
// TOAST
// ===========================
let toastTimeout;
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ===========================
// HELPERS
// ===========================
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function fmt(n) {
    if (n === null || n === undefined || n === '') return '-';
    const num = Number(n);
    if (isNaN(num)) return String(n);
    return num.toLocaleString('id-ID');
}

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function groupBy(arr, key) {
    return arr.reduce((acc, item) => {
        const k = item[key] || 'Tidak Ditentukan';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
    }, {});
}

function badgeStatus(s) {
    const map = { 'Aktif': 'badge-aktif', 'Pemeliharaan': 'badge-pemeliharaan', 'Rusak': 'badge-rusak', 'Nonaktif': 'badge-nonaktif' };
    return `<span class="badge ${map[s] || 'badge-nonaktif'}">${esc(s)}</span>`;
}

function badgeKondisi(k) {
    const map = { 'Baik': 'badge-baik', 'Perbaikan': 'badge-perbaikan', 'Rusak': 'badge-rusak', 'ditelusuri': 'badge-ditelusuri' };
    return `<span class="badge ${map[k] || ''}">${esc(k)}</span>`;
}

// Sidebar
function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('show');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}

// ===========================
// DATABASE PAGE
// ===========================
let DB_TAB = 'users';

function renderDatabase() {
    // Only Admin can access Database
    if (SESSION && SESSION.role !== 'Admin') {
        document.getElementById('page-database').innerHTML = `
          <div class="empty-state" style="padding:80px 24px">
            <div class="empty-state-icon">??</div>
            <h3>Akses Ditolak</h3>
            <p>Halaman Database hanya bisa diakses oleh Admin.</p>
          </div>`;
        return;
    }
    switchDbTab(DB_TAB);
    if (DB_TAB === 'users') renderUsersTable();
    if (DB_TAB === 'rawassets') loadRawEditor();
    if (DB_TAB === 'settings') renderDbSettings();
    if (DB_TAB === 'importexport') { /* static */ }
}

function switchDbTab(tab) {
    DB_TAB = tab;
    document.querySelectorAll('.db-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.db-panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById(`db-panel-${tab}`);
    if (panel) panel.classList.remove('hidden');
    if (tab === 'users') renderUsersTable();
    if (tab === 'rawassets') loadRawEditor();
    if (tab === 'settings') renderDbSettings();
}

// -- USERS --
function getStoredUsers() {
    const s = localStorage.getItem('asetku_users');
    return s ? JSON.parse(s) : [];
}
function saveUsers(users) {
    localStorage.setItem('asetku_users', JSON.stringify(users));
}

function renderUsersTable() {
    const users = getStoredUsers();
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = users.map((u, i) => {
        const roleColor = { Admin: 'badge-aktif', User: 'badge-pemeliharaan', Viewer: 'badge-baik' }[u.role] || '';
        return `<tr>
          <td><div class="user-avatar" style="margin:auto;background:linear-gradient(135deg,#388bfd,#bc8cff)">${esc(u.avatar || u.name[0])}</div></td>
          <td><strong>${esc(u.username)}</strong></td>
          <td>${esc(u.name)}</td>
          <td><span class="badge ${roleColor}">${esc(u.role)}</span></td>
          <td style="color:var(--text-muted);letter-spacing:2px">${'�'.repeat(u.password?.length || 6)}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn-icon edit" onclick="openEditUserModal(${i})" title="Edit">??</button>
              <button class="btn-icon delete" onclick="deleteUser(${i})" title="Hapus">???</button>
            </div>
          </td>
        </tr>`;
    }).join('') || `<tr><td colspan="6"><div class="empty-state"><p>Belum ada pengguna.</p></div></td></tr>`;
}

let editingUserIdx = null;

function openAddUserModal() {
    editingUserIdx = null;
    showUserModal({ username: '', name: '', password: '', role: 'User', avatar: '' });
}

function openEditUserModal(idx) {
    editingUserIdx = idx;
    const u = getStoredUsers()[idx];
    if (u) showUserModal(u);
}

function showUserModal(u) {
    const existing = document.getElementById('userModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'userModal';
    modal.className = 'modal-backdrop open';
    modal.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2 class="modal-title">${editingUserIdx !== null ? 'Edit Pengguna' : 'Tambah Pengguna'}</h2>
          <button class="modal-close" onclick="document.getElementById('userModal').remove()">?</button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>Username <span class="required">*</span></label><input id="um-username" value="${esc(u.username)}" placeholder="username"/></div>
          <div class="form-group"><label>Nama Lengkap <span class="required">*</span></label><input id="um-name" value="${esc(u.name)}" placeholder="Nama lengkap"/></div>
          <div class="form-group"><label>Password <span class="required">*</span></label><input id="um-password" type="password" value="${esc(u.password || '')}" placeholder="Password"/></div>
          <div class="form-group"><label>Role</label>
            <select id="um-role">
              <option ${u.role === 'Admin' ? 'selected' : ''}>Admin</option>
              <option ${u.role === 'User' ? 'selected' : ''}>User</option>
              <option ${u.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
            </select>
          </div>
          <div class="form-group"><label>Inisial Avatar (1 huruf)</label><input id="um-avatar" value="${esc(u.avatar || '')}" placeholder="A" maxlength="2"/></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('userModal').remove()">Batal</button>
          <button class="btn btn-primary" onclick="saveUser()">Simpan</button>
        </div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

function saveUser() {
    const username = document.getElementById('um-username').value.trim();
    const name = document.getElementById('um-name').value.trim();
    const password = document.getElementById('um-password').value;
    const role = document.getElementById('um-role').value;
    const avatar = document.getElementById('um-avatar').value.trim() || name[0]?.toUpperCase() || 'U';

    if (!username || !name || !password) { showToast('Lengkapi field wajib!', 'error'); return; }

    const users = getStoredUsers();
    // Check duplicate username
    const dupIdx = users.findIndex(u => u.username === username);
    if (dupIdx !== -1 && dupIdx !== editingUserIdx) { showToast('Username sudah digunakan!', 'error'); return; }

    const obj = { username, name, password, role, avatar };
    if (editingUserIdx !== null) {
        users[editingUserIdx] = obj;
        showToast(`Pengguna "${name}" diperbarui`, 'success');
    } else {
        users.push(obj);
        showToast(`Pengguna "${name}" ditambahkan`, 'success');
    }
    saveUsers(users);
    document.getElementById('userModal')?.remove();
    renderUsersTable();
}

function deleteUser(idx) {
    const users = getStoredUsers();
    const u = users[idx];
    if (!u) return;
    if (u.username === SESSION?.username) { showToast('Tidak bisa menghapus akun yang sedang login!', 'error'); return; }
    if (!confirm(`Hapus pengguna "${u.name}"?`)) return;
    users.splice(idx, 1);
    saveUsers(users);
    renderUsersTable();
    showToast(`Pengguna "${u.name}" dihapus`, 'info');
}

// -- RAW JSON EDITOR --
function loadRawEditor() {
    const ta = document.getElementById('rawAssetsEditor');
    if (ta) ta.value = JSON.stringify(STATE.assets, null, 2);
}

function saveRawAssets() {
    const ta = document.getElementById('rawAssetsEditor');
    if (!ta) return;
    try {
        const parsed = JSON.parse(ta.value);
        if (!Array.isArray(parsed)) throw new Error('Harus berupa array');
        STATE.assets = parsed;
        save();
        showToast(`${parsed.length} aset berhasil disimpan`, 'success');
    } catch (e) {
        showToast('JSON tidak valid: ' + e.message, 'error');
    }
}

// -- SETTINGS --
function renderDbSettings() {
    const el = document.getElementById('db-info-list');
    if (!el) return;
    const users = getStoredUsers();
    const lsTotal = JSON.stringify(localStorage).length;
    el.innerHTML = [
        ['Total Aset', fmt(STATE.assets.length)],
        ['Total Kategori', fmt(STATE.categories.length)],
        ['Total Lokasi', fmt(STATE.locations.length)],
        ['Total Pengguna', fmt(users.length)],
        ['Estimasi Storage', (lsTotal / 1024).toFixed(1) + ' KB'],
        ['User Login', SESSION?.name + ' (' + SESSION?.role + ')'],
    ].map(([k, v]) => `<div class="summary-item"><span class="summary-label">${k}</span><span class="summary-count">${v}</span></div>`).join('');

    // Set perPageSelect current value
    const sel = document.getElementById('perPageSelect');
    if (sel) sel.value = STATE.assetsPerPage;
}

// -- RESET --
function resetAssets() {
    if (!confirm('Reset semua data aset ke data bawaan? Data saat ini akan hilang!')) return;
    localStorage.removeItem('asetku_assets');
    STATE.assets = seedAssets();
    save();
    // Re-seed history
    localStorage.removeItem('asetku_history');
    const seeded = seedHistory();
    localStorage.setItem('asetku_history', JSON.stringify(seeded));
    showToast('Data aset & riwayat direset ke default', 'info');
    renderDbSettings();
}

function resetAll() {
    if (!confirm('PERINGATAN: Ini akan menghapus SEMUA data (aset, kategori, lokasi, pengguna). Lanjutkan?')) return;
    if (!confirm('Konfirmasi sekali lagi: Hapus semua data?')) return;
    ['asetku_assets', 'asetku_categories', 'asetku_locations', 'asetku_users', 'asetku_history'].forEach(k => localStorage.removeItem(k));
    load();
    showToast('Semua data berhasil direset', 'info');
    renderDbSettings();
}

// -- EXPORT JSON --
function exportJson() {
    const backup = {
        exported: new Date().toISOString(),
        version: '1.0',
        assets: STATE.assets,
        categories: STATE.categories,
        locations: STATE.locations,
        users: getStoredUsers(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asetku-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON berhasil diunduh', 'success');
}

// -- IMPORT JSON --
function importJson(file) {
    const statusEl = document.getElementById('import-status');
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.assets || !Array.isArray(data.assets)) throw new Error('Format file tidak valid');
            if (!confirm(`Import ${data.assets.length} aset dari file "${file.name}"? Data saat ini akan ditimpa.`)) return;
            STATE.assets = data.assets;
            if (Array.isArray(data.categories)) STATE.categories = data.categories;
            if (Array.isArray(data.locations)) STATE.locations = data.locations;
            if (Array.isArray(data.users)) saveUsers(data.users);
            save();
            if (statusEl) statusEl.innerHTML = `<span style="color:var(--accent-green)">? Import berhasil: ${data.assets.length} aset, ${(data.categories || []).length} kategori, ${(data.locations || []).length} lokasi.</span>`;
            showToast('Import data berhasil!', 'success');
        } catch (err) {
            if (statusEl) statusEl.innerHTML = `<span style="color:var(--accent-red)">? Error: ${err.message}</span>`;
            showToast('Import gagal: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

// ===========================
// RIWAYAT ASET (HISTORY)
// ===========================
function getHistory() {
    const s = localStorage.getItem('asetku_history');
    return s ? JSON.parse(s) : [];
}
function saveHistory(data) {
    localStorage.setItem('asetku_history', JSON.stringify(data));
}

function renderHistoryPage() {
    const history = getHistory();
    const filterAsetId = document.getElementById('history-filter-aset')?.value || '';
    const search = (document.getElementById('history-search')?.value || '').toLowerCase();

    // Populate aset filter dropdown from Daftar Aset
    const sel = document.getElementById('history-filter-aset');
    if (sel) {
        const current = sel.value;
        sel.innerHTML = '<option value="">Semua Aset</option>' +
            STATE.assets.map(a => {
                const serialInfo = (a.serialNumber && a.serialNumber !== '-') ? ` [${esc(a.serialNumber)}]` : '';
                return `<option value="${esc(a.id)}" ${a.id === current ? 'selected' : ''}>${esc(a.kode)} � ${esc(a.nama)}${serialInfo}</option>`;
            }).join('');
        sel.value = current;
    }

    // -- Serial-number grouping --------------------------------------
    // When a specific asset is selected, find all assets that share
    // the same (non-empty / non-dash) serial number so we can show all
    // their history records together.
    let relatedAsetIds = [];
    let groupSerialNumber = '';
    let groupAsets = [];

    if (filterAsetId) {
        const selectedAset = STATE.assets.find(a => a.id === filterAsetId);
        const sn = selectedAset?.serialNumber?.trim();

        if (sn && sn !== '-' && sn !== '') {
            // Find all assets that share the same serial number
            groupAsets = STATE.assets.filter(a =>
                a.serialNumber?.trim() === sn
            );
            relatedAsetIds = groupAsets.map(a => a.id);
            groupSerialNumber = sn;
        } else {
            // No serial number � filter only this exact asset
            relatedAsetIds = [filterAsetId];
        }
    }

    // -- Filter records ---------------------------------------------
    let filtered = history;
    if (filterAsetId) {
        filtered = filtered.filter(h => relatedAsetIds.includes(h.asetId));
    }
    if (search) {
        filtered = filtered.filter(h => {
            // Cari aset yang terkait untuk mendapatkan no. seri & nama aset
            const aset = STATE.assets.find(a => a.id === h.asetId);
            const serialNumber = (aset?.serialNumber || '').toLowerCase();
            const namaAset = (aset?.nama || h.asetNama || '').toLowerCase();
            return (
                (h.nik || '').toLowerCase().includes(search) ||
                (h.nama || '').toLowerCase().includes(search) ||
                (h.jabatan || '').toLowerCase().includes(search) ||
                (h.departemen || '').toLowerCase().includes(search) ||
                (h.tgl || '').toLowerCase().includes(search) ||  // cari by tanggal, cth: "2024-01"
                serialNumber.includes(search) ||                         // cari by no. seri
                namaAset.includes(search)                                // cari by nama aset
            );
        });
    }

    // Sort newest first
    filtered = [...filtered].sort((a, b) => new Date(b.tgl) - new Date(a.tgl));

    // -- Group info banner ------------------------------------------
    const groupBanner = document.getElementById('history-group-banner');
    if (groupBanner) {
        if (filterAsetId && groupAsets.length > 1) {
            groupBanner.innerHTML = `
              <div class="history-group-info">
                <span class="history-group-icon">??</span>
                <div>
                  <strong>Grup No. Seri: <code>${esc(groupSerialNumber)}</code></strong>
                  <div class="history-group-tags">
                    ${groupAsets.map(a => `<span class="history-group-tag">${esc(a.kode)} � ${esc(a.nama)}</span>`).join('')}
                  </div>
                </div>
                <span class="history-group-count">${filtered.length} riwayat ditemukan</span>
              </div>`;
            groupBanner.style.display = 'block';
        } else {
            groupBanner.style.display = 'none';
            groupBanner.innerHTML = '';
        }
    }

    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;

    tbody.innerHTML = filtered.map((h) => {
        const aset = STATE.assets.find(a => a.id === h.asetId);
        const tglFmt = h.tgl ? new Date(h.tgl + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        const serialDisplay = aset?.serialNumber && aset.serialNumber !== '-'
            ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">SN: ${esc(aset.serialNumber)}</div>`
            : '';
        // Highlight rows from sibling assets (same SN, different ID)
        const isSibling = filterAsetId && h.asetId !== filterAsetId && groupAsets.length > 1;
        const rowStyle = isSibling ? 'background:rgba(56,139,253,0.04);' : '';
        const siblingBadge = isSibling
            ? `<span class="badge history-sibling-badge" title="Aset berbeda dengan no. seri sama">Terkait (SN = ${esc(groupSerialNumber)})</span>`
            : '';

        // Find previous owner
        const assetHistory = history.filter(record => record.asetId === h.asetId).sort((a, b) => new Date(a.tgl) - new Date(b.tgl));
        const currentIndex = assetHistory.findIndex(record => record.id === h.id);
        const computedPrevOwner = currentIndex > 0 ? assetHistory[currentIndex - 1].nama : '-';
        const prevOwner = h.prevOwner || computedPrevOwner;

        return `<tr style="${rowStyle}">
          <td>
            <a href="javascript:void(0)" onclick="viewAssetHistory('${esc(h.asetId)}')" style="text-decoration:none;">
              <code style="font-size:12px;color:var(--accent-blue)">${esc(aset?.kode || h.asetKode || '-')}</code>
            </a>
            ${siblingBadge}
          </td>
          <td>
            <a href="javascript:void(0)" onclick="viewAssetHistory('${esc(h.asetId)}')" style="text-decoration:none;color:inherit;">
              <strong>${esc(aset?.nama || h.asetNama || '-')}</strong>
            </a>
            ${serialDisplay}
          </td>
          <td style="font-family:monospace;font-size:12px">${esc(h.nik || '-')}</td>
          <td>${esc(h.nama || '-')}</td>
          <td style="color:var(--text-secondary)">${esc(h.jabatan || '-')}</td>
          <td style="color:var(--text-secondary)">${esc(h.departemen || '-')}</td>
          <td style="white-space:nowrap">${tglFmt}</td>
          <td>
            <a href="javascript:void(0)" onclick="showHistoryDetail('${h.id}')" style="color:var(--accent-blue);text-decoration:none;font-size:13px;">
              ${esc(prevOwner)}
            </a>
          </td>
          <td style="max-width:200px;font-size:12px;color:var(--text-muted);cursor:pointer;" onclick="showHistoryDetail('${h.id}')" title="Klik untuk lihat detail lengkap">${esc(h.keterangan || '-')}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn-icon edit" onclick="openEditHistoryModal('${h.id}')" title="Edit">✏️</button>
              <button class="btn-icon delete" onclick="deleteHistoryRecord('${h.id}')" title="Hapus">🗑️</button>
            </div>
          </td>
        </tr>`;
    }).join('') || `<tr><td colspan="10"><div class="empty-state"><div class="empty-state-icon">📁</div><p>Belum ada riwayat penerimaan aset.</p></div></td></tr>`;

    const info = document.getElementById('history-info');
    if (info) {
        const groupNote = groupAsets.length > 1 && filterAsetId
            ? ` (${groupAsets.length} aset dengan no. seri yang sama)`
            : '';
        info.textContent = `${filtered.length} riwayat${groupNote}`;
    }
}

function populateHistoryAsetSelect(selectedId = '') {
    const sel = document.getElementById('h-aset');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Aset --</option>' +
        STATE.assets.map(a => `<option value="${esc(a.id)}" ${a.id === selectedId ? 'selected' : ''}>${esc(a.kode)} � ${esc(a.nama)}</option>`).join('');
}

let _editingHistoryId = null;

function openAddHistoryModal(presetAsetId = '') {
    if (isViewer()) { showToast('Akses ditolak: akun Viewer tidak bisa menambah riwayat', 'error'); return; }
    _editingHistoryId = null;
    populateHistoryAsetSelect(presetAsetId);
    document.getElementById('h-id').value = '';
    document.getElementById('h-nik').value = '';
    document.getElementById('h-nama').value = '';
    document.getElementById('h-jabatan').value = '';
    document.getElementById('h-departemen').value = '';
    document.getElementById('h-tgl').value = new Date().toISOString().slice(0, 10);
    document.getElementById('h-prevOwner').value = '';
    document.getElementById('h-keterangan').value = '';
    document.getElementById('history-modal-title').textContent = 'Tambah Riwayat Penerimaan';
    document.getElementById('historyModal').classList.add('open');
}

function openEditHistoryModal(id) {
    const rec = getHistory().find(h => h.id === id);
    if (!rec) return;
    _editingHistoryId = id;
    populateHistoryAsetSelect(rec.asetId);
    document.getElementById('h-id').value = rec.id;
    document.getElementById('h-nik').value = rec.nik || '';
    document.getElementById('h-nama').value = rec.nama || '';
    document.getElementById('h-jabatan').value = rec.jabatan || '';
    document.getElementById('h-departemen').value = rec.departemen || '';
    document.getElementById('h-tgl').value = rec.tgl || '';
    document.getElementById('h-prevOwner').value = rec.prevOwner || '';
    document.getElementById('h-keterangan').value = rec.keterangan || '';
    document.getElementById('history-modal-title').textContent = 'Edit Riwayat Penerimaan';
    document.getElementById('historyModal').classList.add('open');
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('open');
}

function saveHistoryRecord() {
    if (isViewer()) { showToast('Akses ditolak', 'error'); return; }
    const asetId = document.getElementById('h-aset').value;
    const nik = document.getElementById('h-nik').value.trim();
    const nama = document.getElementById('h-nama').value.trim();
    const jabatan = document.getElementById('h-jabatan').value.trim();
    const departemen = document.getElementById('h-departemen').value.trim();
    const tgl = document.getElementById('h-tgl').value;
    const prevOwner = document.getElementById('h-prevOwner').value.trim();
    const keterangan = document.getElementById('h-keterangan').value.trim();

    if (!asetId) { showToast('Pilih aset terlebih dahulu!', 'error'); return; }
    if (!nik) { showToast('NIK wajib diisi!', 'error'); return; }
    if (!nama) { showToast('Nama wajib diisi!', 'error'); return; }
    if (!tgl) { showToast('Tanggal diterima wajib diisi!', 'error'); return; }

    const aset = STATE.assets.find(a => a.id === asetId);
    const history = getHistory();
    const obj = {
        id: _editingHistoryId || uid(),
        asetId,
        asetKode: aset?.kode || '',
        asetNama: aset?.nama || '',
        nik, nama, jabatan, departemen, tgl, prevOwner, keterangan,
        createdAt: _editingHistoryId
            ? (history.find(h => h.id === _editingHistoryId)?.createdAt || Date.now())
            : Date.now()
    };

    if (_editingHistoryId) {
        const idx = history.findIndex(h => h.id === _editingHistoryId);
        if (idx !== -1) history[idx] = obj;
        showToast(`Riwayat "${nama}" diperbarui`, 'success');
    } else {
        history.push(obj);
        showToast(`Riwayat "${nama}" ditambahkan`, 'success');
    }
    saveHistory(history);
    closeHistoryModal();
    renderHistoryPage();
}

function deleteHistoryRecord(id) {
    const rec = getHistory().find(h => h.id === id);
    if (!rec) return;
    if (!confirm(`Hapus riwayat "${rec.nama}" untuk aset "${rec.asetKode}"?`)) return;
    const updated = getHistory().filter(h => h.id !== id);
    saveHistory(updated);
    renderHistoryPage();
    showToast('Riwayat dihapus', 'info');
}

function exportHistoryCSV() {
    const history = getHistory();
    const headers = ['ID', 'Kode Aset', 'Nama Aset', 'NIK', 'Nama', 'Jabatan', 'Departemen', 'Tgl Diterima', 'Keterangan'];
    const rows = history.map(h => [
        h.id, h.asetKode, h.asetNama, h.nik, h.nama, h.jabatan, h.departemen, h.tgl, h.keterangan
    ].map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `riwayat-aset-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('Export CSV riwayat berhasil', 'success');
}

function viewAssetHistory(asetId) {
    const sel = document.getElementById('history-filter-aset');
    if (sel) {
        sel.value = asetId;
        renderHistoryPage();
        showToast('Menampilkan riwayat aset terpilih', 'info');
    }
}

function showHistoryDetail(id) {
    const history = getHistory();
    const h = history.find(record => record.id === id);
    if (!h) return;

    const aset = STATE.assets.find(a => a.id === h.asetId);
    const assetHistory = history.filter(record => record.asetId === h.asetId).sort((a, b) => new Date(a.tgl) - new Date(b.tgl));
    const currentIndex = assetHistory.findIndex(record => record.id === h.id);
    const computedPrevOwner = currentIndex > 0 ? assetHistory[currentIndex - 1].nama : '-';
    const prevOwner = h.prevOwner || computedPrevOwner;

    const tglFmt = h.tgl ? new Date(h.tgl + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

    document.getElementById('hd-aset-nama').textContent = aset?.nama || h.asetNama || '-';
    document.getElementById('hd-aset-kode').textContent = aset?.kode || h.asetKode || '-';
    document.getElementById('hd-penerima').textContent = h.nama || '-';
    document.getElementById('hd-nik').textContent = h.nik ? `NIK: ${h.nik}` : '-';
    document.getElementById('hd-prevOwner').textContent = prevOwner;
    document.getElementById('hd-tgl').textContent = tglFmt;

    const jabDept = [h.jabatan, h.departemen].filter(Boolean).join(' / ');
    document.getElementById('hd-jabatan-dept').textContent = jabDept || '-';

    document.getElementById('hd-keterangan').textContent = h.keterangan || 'Tidak ada keterangan.';

    document.getElementById('historyDetailModal').classList.add('open');
}

// ===========================
// EVENT LISTENERS
// ===========================

// ===========================
// INSPEKSI ASET
// ===========================

function getInspeksi() {
    const s = localStorage.getItem('asetku_inspeksi');
    return s ? JSON.parse(s) : [];
}
function saveInspeksiData(data) {
    localStorage.setItem('asetku_inspeksi', JSON.stringify(data));
}

// ── Auto-resolve status berdasarkan tanggal ────────────────
function resolveInspeksiStatus(record) {
    if (record.status === 'Selesai') return 'Selesai';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tgl = new Date(record.tglInspeksi + 'T00:00:00');
    return tgl < today ? 'Terlambat' : 'Dijadwalkan';
}

// ── Badge status inspeksi ──────────────────────────────────
function badgeInspeksiStatus(resolvedStatus) {
    const map = {
        'Dijadwalkan': 'badge-dijadwalkan',
        'Selesai': 'badge-selesai-inspeksi',
        'Terlambat': 'badge-terlambat',
    };
    return `<span class="badge ${map[resolvedStatus] || ''}">${resolvedStatus}</span>`;
}

function badgeKondisiInspeksi(kondisi) {
    if (!kondisi) return `<span style="color:var(--text-muted);font-size:12px">—</span>`;
    const map = {
        'Baik': 'badge-baik',
        'Perbaikan': 'badge-perbaikan',
        'Rusak': 'badge-rusak',
        'Perlu Tindakan': 'badge-perlu-tindakan',
        'ditelusuri': 'badge-ditelusuri',
    };
    return `<span class="badge ${map[kondisi] || ''}">${kondisi}</span>`;
}

// ── Hitung minggu ke- dalam tahun ─────────────────────────
function weekNumber(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
}

// ── Seed data inspeksi ─────────────────────────────────────
function seedInspeksi() {
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

    const records = [];
    const inspekturList = ['Andi Prasetyo', 'Dewi Kusuma', 'Budi Santoso', 'Rina Wulandari'];

    STATE.assets.slice(0, 8).forEach((aset, i) => {
        // Jadwal inspeksi: beberapa sudah lewat (Terlambat/Selesai), beberapa mendatang
        const offsets = [-14, -7, 0, 7]; // minggu lalu, minggu lalu, hari ini, minggu depan
        offsets.forEach((offset, j) => {
            const tgl = addDays(today, offset + (i % 2 === 0 ? 0 : 3));
            const isFuture = tgl > today;
            const isPast = tgl < today;
            let status = 'Dijadwalkan';
            let kondisi = '';
            let catatan = '';
            if (isPast && (j === 0)) {
                // Minggu 2 minggu lalu → Selesai
                status = 'Selesai';
                kondisi = ['Baik', 'Perbaikan', 'Baik', 'Perlu Tindakan', 'Baik', 'Rusak', 'Baik', 'Perbaikan'][i];
                catatan = 'Inspeksi rutin mingguan selesai dilakukan.';
            } else if (isPast && j === 1) {
                // Minggu lalu → Terlambat (belum dilakukan)
                status = 'Terlambat';
            }
            records.push({
                id: uid(),
                asetId: aset.id,
                asetKode: aset.kode,
                asetNama: aset.nama,
                tglInspeksi: fmt(tgl),
                status,
                kondisiTemuan: kondisi,
                inspektur: status === 'Selesai' ? inspekturList[i % inspekturList.length] : '',
                catatan,
                createdAt: Date.now() - (offsets.length - j) * 86400000 * 7,
            });
        });
    });
    return records;
}

// ── Render halaman inspeksi ────────────────────────────────


function renderInspeksiPage() {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const allInspeksi = getInspeksi();

    // Build latest inspection per asset
    const latestByAset = {};
    allInspeksi.forEach(r => {
        if (!latestByAset[r.asetId] || new Date(r.tglInspeksi) > new Date(latestByAset[r.asetId].tglInspeksi)) {
            latestByAset[r.asetId] = r;
        }
    });

    // Filters from toolbar
    const filterLokasi = document.getElementById('inspeksi-filter-lokasi')?.value || '';
    const filterStatus = document.getElementById('inspeksi-filter-status')?.value || '';
    const search = (document.getElementById('inspeksi-search')?.value || '').toLowerCase();

    // Populate lokasi filter
    const selLokasi = document.getElementById('inspeksi-filter-lokasi');
    if (selLokasi) {
        const cur = selLokasi.value;
        const lokasiList = [...new Set(STATE.assets.map(a => a.lokasi).filter(Boolean))].sort();
        selLokasi.innerHTML = '<option value="">Semua Lokasi</option>' +
            lokasiList.map(l => `<option value="${esc(l)}" ${l === cur ? 'selected' : ''}>${esc(l)}</option>`).join('');
        selLokasi.value = cur;
    }

    // Filter assets
    let assets = [...STATE.assets];
    if (filterLokasi) assets = assets.filter(a => a.lokasi === filterLokasi);
    if (search) assets = assets.filter(a =>
        (a.nama || '').toLowerCase().includes(search) ||
        (a.kode || '').toLowerCase().includes(search)
    );
    if (filterStatus) {
        assets = assets.filter(a => {
            const r = latestByAset[a.id];
            const s = r ? resolveInspeksiStatus(r) : 'Belum Diinspeksi';
            return s === filterStatus;
        });
    }

    // Summary counts (based on all assets)
    const allAssets = STATE.assets;
    const countSelesai = allAssets.filter(a => {
        const r = latestByAset[a.id];
        return r && resolveInspeksiStatus(r) === 'Selesai';
    }).length;
    const countTerlambat = allAssets.filter(a => {
        const r = latestByAset[a.id];
        return r && resolveInspeksiStatus(r) === 'Terlambat';
    }).length;
    const countBelum = allAssets.filter(a => !latestByAset[a.id]).length;

    const strip = document.getElementById('inspeksi-summary-strip');
    if (strip) {
        strip.innerHTML = `
          <div class="inspeksi-card inspeksi-card-green">
            <div class="inspeksi-card-icon">\u2705</div>
            <div class="inspeksi-card-body">
              <div class="inspeksi-card-value">${countSelesai}</div>
              <div class="inspeksi-card-label">Selesai</div>
            </div>
          </div>
          <div class="inspeksi-card inspeksi-card-red">
            <div class="inspeksi-card-icon">\u26a0\ufe0f</div>
            <div class="inspeksi-card-body">
              <div class="inspeksi-card-value">${countTerlambat}</div>
              <div class="inspeksi-card-label">Terlambat</div>
            </div>
          </div>
          <div class="inspeksi-card inspeksi-card-neutral">
            <div class="inspeksi-card-icon">\ud83d\udccc</div>
            <div class="inspeksi-card-body">
              <div class="inspeksi-card-value">${countBelum}</div>
              <div class="inspeksi-card-label">Belum Diinspeksi</div>
            </div>
          </div>
          <div class="inspeksi-card inspeksi-card-blue">
            <div class="inspeksi-card-icon">\ud83c\udfd7\ufe0f</div>
            <div class="inspeksi-card-body">
              <div class="inspeksi-card-value">${STATE.locations.length}</div>
              <div class="inspeksi-card-label">Lokasi</div>
            </div>
          </div>`;
    }

    // Group assets by lokasi
    const grouped = {};
    assets.forEach(a => {
        const lok = a.lokasi || 'Tanpa Lokasi';
        if (!grouped[lok]) grouped[lok] = [];
        grouped[lok].push(a);
    });

    const container = document.getElementById('inspeksi-location-container');
    if (!container) return;

    const info = document.getElementById('inspeksi-info');
    if (info) info.textContent = `${assets.length} aset di ${Object.keys(grouped).length} lokasi`;

    if (assets.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">\ud83d\udd0d</div><p>Tidak ada aset yang cocok.</p></div>`;
        return;
    }

    container.innerHTML = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([lokasi, asetList]) => {
        const doneCount = asetList.filter(a => {
            const r = latestByAset[a.id];
            return r && resolveInspeksiStatus(r) === 'Selesai';
        }).length;
        const pct = Math.round((doneCount / asetList.length) * 100);
        const progressColor = pct === 100 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';

        const rows = asetList.map(a => {
            const rec = latestByAset[a.id];
            const resolved = rec ? resolveInspeksiStatus(rec) : null;
            const lastTgl = rec ? new Date(rec.tglInspeksi + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
            const lastInspektur = rec?.inspektur || '';

            const statusBadge = rec
                ? badgeInspeksiStatus(resolved)
                : `<span class="badge" style="background:#1f2937;color:var(--text-muted)">Belum Diinspeksi</span>`;

            const kondisiInfo = rec?.kondisiTemuan
                ? badgeKondisiInspeksi(rec.kondisiTemuan)
                : `<span style="color:var(--text-muted);font-size:11px">\u2014</span>`;

            return `<tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <code style="font-size:11px;color:var(--accent-blue);background:var(--bg-secondary);padding:2px 6px;border-radius:4px">${esc(a.kode)}</code>
                  <div>
                    <div style="font-weight:600;font-size:13px">${esc(a.nama)}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${esc(a.kategori || '')} ${a.serialNumber && a.serialNumber !== '-' ? '· SN: ' + esc(a.serialNumber) : ''}</div>
                  </div>
                </div>
              </td>
              <td style="text-align:center">${statusBadge}</td>
              <td style="text-align:center">${kondisiInfo}</td>
              <td style="text-align:center">${lastTgl ? `<div style="font-size:11px;line-height:1.4">${lastTgl}<br/><span style="color:var(--text-muted)">${lastInspektur || '\u2014'}</span></div>` : '<span style="color:var(--text-muted)">\u2014</span>'}</td>
              <td style="max-width:180px;font-size:12px;color:var(--text-muted)" title="${esc(rec?.catatan || '')}">${rec?.catatan ? esc(rec.catatan) : '<span style="color:var(--text-muted)">\u2014</span>'}</td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  <input type="date" class="insp-date-input" id="date-${a.id}" value="${todayStr}"
                    style="padding:4px 8px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;outline:none;width:130px" />
                  <input type="text" class="insp-name-input" id="name-${a.id}" value=""
                    placeholder="Nama inspektur..."
                    style="padding:4px 8px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;outline:none;width:140px" />
                </div>
              </td>
              <td>
                <div class="qk-group">
                  <button class="qk-btn qk-baik ${rec?.kondisiTemuan === 'Baik' && resolved === 'Selesai' ? 'qk-active' : ''}" onclick="quickInspeksi('${a.id}', 'Baik')" title="Kondisi Baik">\u2705 Baik</button>
                  <button class="qk-btn qk-perbaikan ${rec?.kondisiTemuan === 'Perbaikan' && resolved === 'Selesai' ? 'qk-active' : ''}" onclick="quickInspeksi('${a.id}', 'Perbaikan')" title="Kondisi Perbaikan">\ud83d\udfe1 Perbaikan</button>
                  <button class="qk-btn qk-rusak ${rec?.kondisiTemuan === 'Rusak' && resolved === 'Selesai' ? 'qk-active' : ''}" onclick="quickInspeksi('${a.id}', 'Rusak')" title="Kondisi Rusak">\ud83d\udfe0 Rusak</button>
                  <button class="qk-btn qk-tindakan ${rec?.kondisiTemuan === 'Perlu Tindakan' && resolved === 'Selesai' ? 'qk-active' : ''}" onclick="quickInspeksi('${a.id}', 'Perlu Tindakan')" title="Perlu Tindakan">\u26a0\ufe0f Tindakan</button>
                  <button class="qk-btn qk-ditelusuri ${rec?.kondisiTemuan === 'ditelusuri' && resolved === 'Selesai' ? 'qk-active' : ''}" onclick="quickInspeksi('${a.id}', 'ditelusuri')" title="Ditelusuri">\ud83d\udd0d Ditelusuri</button>
                </div>
              </td>
              <td style="white-space:nowrap">
                <div style="display:flex;gap:4px;align-items:center;">
                  ${rec ? `<button class="btn-icon edit" onclick="openEditInspeksiModal('${rec.id}')" title="Edit Terakhir">✏️</button>
                           <button class="btn-icon delete" onclick="deleteInspeksiRecord('${rec.id}')" title="Hapus Terakhir">🗑️</button>` : ''}
                  <button class="btn btn-outline-sm" onclick="openInspeksiHistory('${a.id}')" style="padding:4px 8px;font-size:11px;min-height:36px;border-radius:4px" title="Lihat semua riwayat inspeksi">📜 Riwayat</button>
                </div>
              </td>
            </tr>`;
        }).join('');

        return `
        <div class="lokasi-group">
          <div class="lokasi-group-header" onclick="toggleLokasiGroup(this)">
            <span class="lokasi-group-icon">\ud83d\udccd</span>
            <span class="lokasi-group-name">${esc(lokasi)}</span>
            <span class="lokasi-group-count">${asetList.length} aset</span>
            <div class="lokasi-progress-bar" style="width:120px">
              <div class="lokasi-progress-fill" style="width:${pct}%;background:${progressColor}"></div>
            </div>
            <span style="font-size:11px;color:var(--text-muted);margin-left:4px">${pct}%</span>
            <span class="lokasi-group-toggle">\u25be</span>
          </div>
          <div class="lokasi-group-body">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Aset</th>
                  <th style="text-align:center">Status Terakhir</th>
                  <th style="text-align:center">Kondisi Terakhir</th>
                  <th style="text-align:center">Tgl &amp; Inspektur</th>
                  <th>Keterangan</th>
                  <th>Atur Inspeksi Baru</th>
                  <th>Kondisi Sekarang ⚡</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`;
    }).join('');
}

// ── Quick inspect: klik kondisi → simpan record baru ──────────
function quickInspeksi(asetId, kondisi) {
    const tgl = document.getElementById(`date-${asetId}`)?.value || new Date().toISOString().slice(0, 10);
    const inspektur = document.getElementById(`name-${asetId}`)?.value.trim() || '';

    const aset = STATE.assets.find(a => a.id === asetId);
    if (!aset) return;

    const data = getInspeksi();
    const rec = {
        id: uid(),
        asetId,
        asetKode: aset.kode,
        asetNama: aset.nama,
        tglInspeksi: tgl,
        status: 'Selesai',
        kondisiTemuan: kondisi,
        inspektur,
        catatan: '',
        createdAt: Date.now(),
    };
    data.push(rec);
    saveInspeksiData(data);
    showToast(`\u2705 ${aset.kode} \u2014 Kondisi: ${kondisi}`, 'success');
    renderInspeksiPage();
}

// ── Toggle collapse location group ───────────────────────────
function toggleLokasiGroup(header) {
    const body = header.nextElementSibling;
    const toggle = header.querySelector('.lokasi-group-toggle');
    const isOpen = !body.classList.contains('collapsed');
    body.classList.toggle('collapsed', isOpen);
    toggle.textContent = isOpen ? '\u25b8' : '\u25be';
}

function quickKondisi(id, kondisi) {
    const data = getInspeksi();
    const idx = data.findIndex(r => r.id === id);
    if (idx === -1) return;
    data[idx].kondisiTemuan = kondisi;
    data[idx].status = 'Selesai'; // otomatis selesai saat kondisi diisi
    saveInspeksiData(data);
    showToast(`Kondisi diperbarui: ${kondisi}`, 'success');
    renderInspeksiPage();
}

// ── Modal helpers ──────────────────────────────────────────
let _editingInspeksiId = null;

function openAddInspeksiModal() {
    _editingInspeksiId = null;
    document.getElementById('inspeksiModalTitle').textContent = 'Tambah Jadwal Inspeksi';

    // Populate aset select
    const sel = document.getElementById('inspeksi-aset-select');
    sel.innerHTML = '<option value="">— Pilih Aset —</option>' +
        STATE.assets.map(a => `<option value="${a.id}">${esc(a.kode)} — ${esc(a.nama)}</option>`).join('');

    // Default date = next Monday (weekly schedule)
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    document.getElementById('inspeksi-tgl').value = nextMonday.toISOString().slice(0, 10);
    document.getElementById('inspeksi-status').value = 'Dijadwalkan';
    document.getElementById('inspeksi-kondisi').value = '';
    document.getElementById('inspeksi-inspektur').value = '';
    document.getElementById('inspeksi-catatan').value = '';

    document.getElementById('inspeksiModal').classList.add('open');
}

function openEditInspeksiModal(id) {
    const r = getInspeksi().find(x => x.id === id);
    if (!r) return;
    _editingInspeksiId = id;
    document.getElementById('inspeksiModalTitle').textContent = 'Edit Jadwal Inspeksi';

    const sel = document.getElementById('inspeksi-aset-select');
    sel.innerHTML = '<option value="">— Pilih Aset —</option>' +
        STATE.assets.map(a => `<option value="${a.id}" ${a.id === r.asetId ? 'selected' : ''}>${esc(a.kode)} — ${esc(a.nama)}</option>`).join('');

    document.getElementById('inspeksi-tgl').value = r.tglInspeksi || '';
    document.getElementById('inspeksi-status').value = r.status || 'Dijadwalkan';
    document.getElementById('inspeksi-kondisi').value = r.kondisiTemuan || '';
    document.getElementById('inspeksi-inspektur').value = r.inspektur || '';
    document.getElementById('inspeksi-catatan').value = r.catatan || '';

    document.getElementById('inspeksiModal').classList.add('open');
}

function closeInspeksiModal() {
    document.getElementById('inspeksiModal').classList.remove('open');
    _editingInspeksiId = null;
}

// ── Inspeksi History Modal ─────────────────────────────────
function openInspeksiHistory(asetId) {
    const aset = STATE.assets.find(a => a.id === asetId);
    if (!aset) return;

    document.getElementById('ih-aset-nama').textContent = aset.nama;
    document.getElementById('ih-aset-kode').textContent = aset.kode + (aset.serialNumber !== '-' ? ` · SN: ${aset.serialNumber}` : '');

    const historyData = getInspeksi()
        .filter(r => r.asetId === asetId)
        .sort((a, b) => new Date(b.tglInspeksi) - new Date(a.tglInspeksi));

    const tbody = document.getElementById('inspeksi-history-tbody');
    if (historyData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">\ud83d\udeab Belum ada riwayat inspeksi untuk aset ini.</td></tr>`;
    } else {
        tbody.innerHTML = historyData.map(r => {
            const tgl = new Date(r.tglInspeksi + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            return `
            <tr>
                <td style="font-weight:600">${tgl}</td>
                <td>${badgeKondisiInspeksi(r.kondisiTemuan || '\u2014')}</td>
                <td>${esc(r.inspektur || '\u2014')}</td>
                <td style="color:var(--text-secondary);font-size:12px;max-width:200px" title="${esc(r.catatan || '')}">${esc(r.catatan || '\u2014')}</td>
                <td>${badgeInspeksiStatus(resolveInspeksiStatus(r))}</td>
            </tr>`;
        }).join('');
    }

    document.getElementById('inspeksiHistoryModal').classList.add('open');
}

function closeInspeksiHistoryModal() {
    document.getElementById('inspeksiHistoryModal').classList.remove('open');
}

function saveInspeksiRecord() {
    const asetId = document.getElementById('inspeksi-aset-select').value;
    const tgl = document.getElementById('inspeksi-tgl').value;
    const status = document.getElementById('inspeksi-status').value;
    const kondisi = document.getElementById('inspeksi-kondisi').value;
    const inspektur = document.getElementById('inspeksi-inspektur').value.trim();
    const catatan = document.getElementById('inspeksi-catatan').value.trim();

    if (!asetId) { showToast('Pilih aset terlebih dahulu!', 'error'); return; }
    if (!tgl) { showToast('Tanggal inspeksi wajib diisi!', 'error'); return; }

    const aset = STATE.assets.find(a => a.id === asetId);
    const data = getInspeksi();
    const obj = {
        id: _editingInspeksiId || uid(),
        asetId, asetKode: aset?.kode || '', asetNama: aset?.nama || '',
        tglInspeksi: tgl, status, kondisiTemuan: kondisi,
        inspektur, catatan,
        createdAt: _editingInspeksiId
            ? (data.find(r => r.id === _editingInspeksiId)?.createdAt || Date.now())
            : Date.now(),
    };

    if (_editingInspeksiId) {
        const idx = data.findIndex(r => r.id === _editingInspeksiId);
        if (idx !== -1) data[idx] = obj;
        showToast(`Jadwal inspeksi "${aset?.kode}" diperbarui`, 'success');
    } else {
        data.push(obj);
        showToast(`Jadwal inspeksi "${aset?.kode}" ditambahkan`, 'success');
    }

    saveInspeksiData(data);
    closeInspeksiModal();
    renderInspeksiPage();
}

function deleteInspeksiRecord(id) {
    const r = getInspeksi().find(x => x.id === id);
    if (!r) return;
    if (!confirm(`Hapus jadwal inspeksi "${r.asetKode}" pada ${r.tglInspeksi}?`)) return;
    saveInspeksiData(getInspeksi().filter(x => x.id !== id));
    showToast('Jadwal inspeksi dihapus', 'info');
    renderInspeksiPage();
}


// ===========================
// INSPEKSI EXPORT / PRINT
// ===========================

function getInspeksiExportData() {
    const allInspeksi = getInspeksi();
    const latestByAset = {};
    allInspeksi.forEach(r => {
        if (!latestByAset[r.asetId] || new Date(r.tglInspeksi) > new Date(latestByAset[r.asetId].tglInspeksi)) {
            latestByAset[r.asetId] = r;
        }
    });
    return STATE.assets.map(a => {
        const rec = latestByAset[a.id];
        const resolved = rec ? resolveInspeksiStatus(rec) : 'Belum Diinspeksi';
        return {
            kode: a.kode,
            nama: a.nama,
            kategori: a.kategori || '',
            lokasi: a.lokasi || '',
            status: resolved,
            kondisi: rec?.kondisiTemuan || '-',
            inspektur: rec?.inspektur || '-',
            tanggal: rec?.tglInspeksi || '-',
            keterangan: rec?.catatan || '-',
        };
    });
}

function exportInspeksiExcel() {
    const data = getInspeksiExportData();
    const headers = ['Kode Aset', 'Nama Aset', 'Kategori', 'Lokasi', 'Status Inspeksi', 'Kondisi', 'Inspektur', 'Tanggal', 'Keterangan'];
    const fields = ['kode', 'nama', 'kategori', 'lokasi', 'status', 'kondisi', 'inspektur', 'tanggal', 'keterangan'];
    const e = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='UTF-8'/>
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Inspeksi</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>th{background:#1d3a6e;color:#fff;font-weight:bold;} td,th{border:1px solid #ccc;padding:6px;}</style>
</head><body><table>`;
    html += '<tr>' + headers.map(h => `<th>${e(h)}</th>`).join('') + '</tr>';
    data.forEach(row => {
        html += '<tr>' + fields.map(f => `<td>${e(row[f])}</td>`).join('') + '</tr>';
    });
    html += '</table></body></html>';
    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspeksi-aset-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File Excel Inspeksi berhasil diunduh', 'success');
}

async function exportInspeksiPdf() {
    showToast('Membuat PDF Inspeksi, harap tunggu...', 'info');
    const container = document.getElementById('inspeksi-location-container');
    if (!container || !container.innerHTML.trim()) { showToast('Buka halaman Inspeksi Aset terlebih dahulu', 'error'); return; }
    try {
        const canvas = await html2canvas(container, { scale: 1.5, backgroundColor: '#0d1117', useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const imgW = pageW - margin * 2;
        const imgH = (canvas.height * imgW) / canvas.width;
        pdf.setFillColor(13, 17, 23);
        pdf.rect(0, 0, pageW, pageH, 'F');
        pdf.setFontSize(14);
        pdf.setTextColor(230, 237, 243);
        pdf.text('AsetKu \u2014 Inspeksi Aset', margin, margin - 2);
        pdf.setFontSize(9);
        pdf.setTextColor(139, 148, 158);
        pdf.text(`Diekspor: ${new Date().toLocaleString('id-ID')}`, margin, margin + 3);
        let y = margin + 8;
        let remaining = imgH;
        let srcY = 0;
        while (remaining > 0) {
            const sliceH = Math.min(remaining, pageH - y - margin);
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = (sliceH / imgW) * canvas.width;
            const ctx = sliceCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, srcY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
            pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', margin, y, imgW, sliceH);
            srcY += sliceCanvas.height;
            remaining -= sliceH;
            if (remaining > 0) { pdf.addPage(); pdf.setFillColor(13, 17, 23); pdf.rect(0, 0, pageW, pageH, 'F'); y = margin; }
        }
        pdf.save(`inspeksi-aset-${new Date().toISOString().slice(0, 10)}.pdf`);
        showToast('File PDF Inspeksi berhasil diunduh', 'success');
    } catch (e) {
        showToast('Gagal membuat PDF: ' + e.message, 'error');
    }
}

async function exportInspeksiJpeg() {
    showToast('Membuat gambar Inspeksi, harap tunggu...', 'info');
    const container = document.getElementById('inspeksi-location-container');
    if (!container || !container.innerHTML.trim()) { showToast('Buka halaman Inspeksi Aset terlebih dahulu', 'error'); return; }
    try {
        const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#161b22', useCORS: true });
        const url = canvas.toDataURL('image/jpeg', 0.95);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inspeksi-aset-${new Date().toISOString().slice(0, 10)}.jpg`;
        a.click();
        showToast('File JPEG Inspeksi berhasil diunduh', 'success');
    } catch (e) {
        showToast('Gagal membuat gambar: ' + e.message, 'error');
    }
}

function printInspeksi() {
    navigate('inspeksi');
    setTimeout(() => window.print(), 200);
}

function resetInspeksiFilters() {
    const lokasi = document.getElementById('inspeksi-filter-lokasi');
    const status = document.getElementById('inspeksi-filter-status');
    const search = document.getElementById('inspeksi-search');
    const clearBtn = document.getElementById('inspeksiSearchClear');
    if (lokasi) lokasi.value = '';
    if (status) status.value = '';
    if (search) { search.value = ''; }
    if (clearBtn) clearBtn.style.display = 'none';
    renderInspeksiPage();
    showToast('Filter inspeksi direset', 'info');
}


// ===========================
// QR SCAN MODULE
// ===========================
let _qrStream = null;
let _qrAnimFrame = null;
let _qrRunning = false;

function openScanModal() {
    document.getElementById('qrScanModal').classList.add('open');
    document.getElementById('qrMatchResult').style.display = 'none';
    document.getElementById('qrManualInput').value = '';
    setQRStatus('waiting', 'Arahkan kamera ke QR code aset...');
    startCamera();
}

function closeScanModal() {
    stopCamera();
    document.getElementById('qrScanModal').classList.remove('open');
}

async function startCamera() {
    const video = document.getElementById('qrVideo');
    const noCam = document.getElementById('qrNoCameraMsg');
    try {
        _qrStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        video.srcObject = _qrStream;
        video.style.display = 'block';
        noCam.style.display = 'none';
        _qrRunning = true;
        requestAnimationFrame(scanQRFrame);
    } catch (e) {
        video.style.display = 'none';
        noCam.style.display = 'flex';
        setQRStatus('waiting', 'Kamera tidak tersedia — gunakan input manual di bawah.');
    }
}

function stopCamera() {
    _qrRunning = false;
    if (_qrAnimFrame) cancelAnimationFrame(_qrAnimFrame);
    if (_qrStream) { _qrStream.getTracks().forEach(t => t.stop()); _qrStream = null; }
}

function scanQRFrame() {
    if (!_qrRunning) return;
    const video = document.getElementById('qrVideo');
    const canvas = document.getElementById('qrCanvas');
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR !== 'undefined') {
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
            if (code && code.data) {
                onQRDetected(code.data);
                return; // stop loop after detection
            }
        }
    }
    _qrAnimFrame = requestAnimationFrame(scanQRFrame);
}

function setQRStatus(type, text) {
    const el = document.getElementById('qrStatus');
    if (!el) return;
    el.className = `qr-status qr-status-${type}`;
    el.textContent = text;
}

function onQRDetected(code) {
    if (!code) return;
    // Stop scanning
    stopCamera();

    // Match by kode or serialNumber (case-insensitive)
    const query = code.trim().toLowerCase();
    const aset = STATE.assets.find(a =>
        (a.kode || '').toLowerCase() === query ||
        (a.serialNumber || '').toLowerCase() === query
    );

    if (!aset) {
        setQRStatus('error', `QR tidak dikenali: "${code}"`);
        document.getElementById('qrMatchResult').style.display = 'none';
        // Re-start camera after 2s for retry
        setTimeout(() => { _qrRunning = true; startCamera(); }, 2000);
        return;
    }

    // Found!
    setQRStatus('success', `✅ Aset ditemukan: ${aset.kode}`);

    // Show match card
    const allInsp = getInspeksi();
    const last = allInsp.filter(r => r.asetId === aset.id)
        .sort((a, b) => new Date(b.tglInspeksi) - new Date(a.tglInspeksi))[0];
    const lastStatus = last ? resolveInspeksiStatus(last) : null;
    const todayStr = new Date().toISOString().slice(0, 10);

    const resultEl = document.getElementById('qrMatchResult');
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="qr-match-card">
        <div class="qr-match-header">
          <code style="color:var(--accent-blue);font-size:13px">${esc(aset.kode)}</code>
          <strong style="font-size:14px">${esc(aset.nama)}</strong>
        </div>
        <div class="qr-match-meta">
          <span>📍 ${esc(aset.lokasi || '—')}</span>
          <span>${lastStatus ? badgeInspeksiStatus(lastStatus) : '<span style="color:var(--text-muted);font-size:12px">Belum Diinspeksi</span>'}</span>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px;align-items:center;flex-wrap:wrap">
          <input type="date" id="qr-tgl" value="${todayStr}"
            style="padding:5px 8px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;outline:none" />
          <input type="text" id="qr-inspektur" placeholder="Nama inspektur..."
            style="flex:1;min-width:120px;padding:5px 8px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;outline:none" />
        </div>
        <div style="margin-top:10px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Kondisi sekarang:</div>
          <div class="qk-group">
            <button class="qk-btn qk-baik" onclick="qrInspeksi('${aset.id}','Baik')">✅ Baik</button>
            <button class="qk-btn qk-perbaikan" onclick="qrInspeksi('${aset.id}','Perbaikan')">🟡 Perbaikan</button>
            <button class="qk-btn qk-rusak" onclick="qrInspeksi('${aset.id}','Rusak')">🟠 Rusak</button>
            <button class="qk-btn qk-tindakan" onclick="qrInspeksi('${aset.id}','Perlu Tindakan')">⚠️ Tindakan</button>
          </div>
        </div>
        <div style="margin-top:10px;display:flex;gap:6px">
          <button class="btn btn-ghost" style="flex:1" onclick="closeScanModal();scrollToAset('${aset.id}')">📍 Temukan di Halaman</button>
          <button class="btn btn-outline-sm" onclick="startCamera();document.getElementById('qrMatchResult').style.display='none'">🔄 Scan Lagi</button>
        </div>
      </div>`;
}

function qrInspeksi(asetId, kondisi) {
    const tgl = document.getElementById('qr-tgl')?.value || new Date().toISOString().slice(0, 10);
    const inspektur = document.getElementById('qr-inspektur')?.value.trim() || '';
    const aset = STATE.assets.find(a => a.id === asetId);
    if (!aset) return;

    const data = getInspeksi();
    data.push({
        id: uid(), asetId,
        asetKode: aset.kode, asetNama: aset.nama,
        tglInspeksi: tgl, status: 'Selesai', kondisiTemuan: kondisi,
        inspektur, catatan: '', createdAt: Date.now(),
    });
    saveInspeksiData(data);
    showToast(`✅ ${aset.kode} — Kondisi: ${kondisi}`, 'success');
    closeScanModal();
    renderInspeksiPage();
    scrollToAset(asetId);
}

// Scroll & highlight asset row in the Inspeksi page
function scrollToAset(asetId) {
    setTimeout(() => {
        const input = document.getElementById(`date-${asetId}`);
        if (!input) return;
        const row = input.closest('tr');
        if (!row) return;
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('row-highlight');
        setTimeout(() => row.classList.remove('row-highlight'), 2500);
    }, 200);
}

// ── QR Code generation for asset ──────────────────────────
// Called from asset detail modal if user wants to print/save QR
function generateAssetQR(asetId) {
    const aset = STATE.assets.find(a => a.id === asetId);
    if (!aset) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>QR Aset — ${aset.kode}</title>
      <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;padding:20px;gap:10px;background:#fff;color:#111}
      h3{margin:0;font-size:16px}p{margin:0;font-size:12px;color:#555} @media print{button{display:none}}</style>
    </head><body>
      <div id="qr"></div>
      <h3>${aset.kode}</h3>
      <p>${aset.nama}</p>
      <p style="margin-top:4px;font-size:10px;color:#999">📍 ${aset.lokasi || '—'} &nbsp;·&nbsp; SN: ${aset.serialNumber || '—'}</p>
      <button onclick="window.print()" style="margin-top:12px;padding:6px 16px;cursor:pointer">🖨️ Print</button>
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
      <script>QRCode.toCanvas(document.getElementById('qr'),'${aset.kode}',{width:200,margin:1},()=>{})<\/script>
    </body></html>`);
    win.document.close();
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    renderSessionUser();

    // Tunggu Firebase sync selesai tarik data dari cloud (jika terhubung)
    if (window._firebaseSyncReady) {
        await window._firebaseSyncReady;
    }

    load();
    renderDashboard();

    // Navigation
    document.querySelectorAll('[data-page]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            navigate(el.dataset.page);
        });
    });

    // Category & Location Buttons
    const addCatBtn = document.getElementById('addCategoryBtn');
    if (addCatBtn) addCatBtn.addEventListener('click', addCategory);

    const addLocBtn = document.getElementById('addLocationBtn');
    if (addLocBtn) addLocBtn.addEventListener('click', addLocation);

    // Menu toggle
    document.getElementById('menuBtn').addEventListener('click', openSidebar);
    document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
    document.getElementById('overlay').addEventListener('click', closeSidebar);

    // Add Asset Button
    document.getElementById('addAssetBtn').addEventListener('click', () => {
        openAddModal();
        if (STATE.currentPage !== 'assets') navigate('assets');
    });

    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeAssetModal);
    document.getElementById('cancelBtn').addEventListener('click', closeAssetModal);
    document.getElementById('saveBtn').addEventListener('click', saveAsset);
    document.getElementById('assetModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeAssetModal();
    });

    // Category Detail modal close
    const catModalCloseBtn = document.getElementById('categoryModalClose');
    if (catModalCloseBtn) catModalCloseBtn.addEventListener('click', closeCategoryModal);
    const catModal = document.getElementById('categoryDetailModal');
    if (catModal) catModal.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeCategoryModal();
    });

    // Location Detail modal close
    const locModalCloseBtn = document.getElementById('locationModalClose');
    if (locModalCloseBtn) locModalCloseBtn.addEventListener('click', closeLocationModal);
    const locModal = document.getElementById('locationDetailModal');
    if (locModal) locModal.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeLocationModal();
    });

    // Delete modal
    document.getElementById('deleteModalClose').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDelete);
    document.getElementById('deleteModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeDeleteModal();
    });

    // Global search
    document.getElementById('globalSearch').addEventListener('input', e => {
        STATE.filters.search = e.target.value.trim();
        STATE.assetPage = 1;
        navigate('assets');
    });

    // Filter selects
    document.getElementById('filter-category').addEventListener('change', e => {
        STATE.filters.category = e.target.value;
        STATE.assetPage = 1;
        renderAssetsTable();
    });
    document.getElementById('filter-location').addEventListener('change', e => {
        STATE.filters.location = e.target.value;
        STATE.assetPage = 1;
        renderAssetsTable();
    });
    document.getElementById('filter-status').addEventListener('change', e => {
        STATE.filters.status = e.target.value;
        STATE.assetPage = 1;
        renderAssetsTable();
    });
    document.getElementById('filter-condition').addEventListener('change', e => {
        STATE.filters.condition = e.target.value;
        STATE.assetPage = 1;
        renderAssetsTable();
    });

    // Sort
    document.querySelectorAll('.sortable th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (STATE.sortKey === key) {
                STATE.sortDir = STATE.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                STATE.sortKey = key;
                STATE.sortDir = 'asc';
            }
            renderAssetsTable();
        });
    });

    // Export dropdown toggle
    const _xBtn = document.getElementById('exportBtn');
    const _xMenu = document.getElementById('exportMenu');
    _xBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        _xMenu.classList.toggle('open');
    });
    document.addEventListener('click', function () { if (_xMenu) _xMenu.classList.remove('open'); });

    // Export format buttons
    document.getElementById('exportCsvBtn')?.addEventListener('click', function () { exportCSV(); _xMenu.classList.remove('open'); });
    document.getElementById('exportExcelBtn')?.addEventListener('click', function () { exportExcel(); _xMenu.classList.remove('open'); });
    document.getElementById('exportPdfBtn')?.addEventListener('click', function () { exportPdf(); _xMenu.classList.remove('open'); });
    document.getElementById('exportJpegBtn')?.addEventListener('click', function () { exportJpeg(); _xMenu.classList.remove('open'); });

    document.getElementById('printBtn').addEventListener('click', printAssets);

    // Categories
    document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
    document.getElementById('new-category-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') addCategory();
    });

    // Locations
    document.getElementById('addLocationBtn').addEventListener('click', addLocation);
    document.getElementById('new-location-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') addLocation();
    });

    // Keyboard shortcut: Escape closes modals
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeAssetDetail();
            closeAssetModal();
            closeDeleteModal();
            closeHistoryModal();
            document.getElementById('userModal')?.remove();
        }
    });

    // QR Scan modal
    document.getElementById('qrScanClose')?.addEventListener('click', closeScanModal);
    document.getElementById('qrScanModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeScanModal(); });
    // Detail modal close
    document.getElementById('detailModalClose')?.addEventListener('click', closeAssetDetail);
    document.getElementById('detailCloseBtn')?.addEventListener('click', closeAssetDetail);
    document.getElementById('assetDetailModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeAssetDetail(); });

    // RIWAYAT ASET listeners
    document.getElementById('addHistoryBtn')?.addEventListener('click', () => openAddHistoryModal());
    document.getElementById('historyModalClose')?.addEventListener('click', closeHistoryModal);
    document.getElementById('historyCancelBtn')?.addEventListener('click', closeHistoryModal);
    document.getElementById('historySaveBtn')?.addEventListener('click', saveHistoryRecord);
    document.getElementById('historyModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeHistoryModal(); });
    document.getElementById('historyDetailModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) document.getElementById('historyDetailModal').classList.remove('open'); });
    document.getElementById('history-filter-aset')?.addEventListener('change', renderHistoryPage);
    document.getElementById('history-search')?.addEventListener('input', renderHistoryPage);
    document.getElementById('exportHistoryCsvBtn')?.addEventListener('click', exportHistoryCSV);


    // INSPEKSI ASET listeners
    document.getElementById('addInspeksiBtn')?.addEventListener('click', openAddInspeksiModal);
    document.getElementById('inspeksiModalClose')?.addEventListener('click', closeInspeksiModal);
    document.getElementById('inspeksiHistoryModalClose')?.addEventListener('click', closeInspeksiHistoryModal);
    document.getElementById('inspeksiCancelBtn')?.addEventListener('click', closeInspeksiModal);
    document.getElementById('inspeksiSaveBtn')?.addEventListener('click', saveInspeksiRecord);
    document.getElementById('inspeksiModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeInspeksiModal(); });
    document.getElementById('inspeksiHistoryModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeInspeksiHistoryModal(); });
    document.getElementById('inspeksi-filter-lokasi')?.addEventListener('change', renderInspeksiPage);
    document.getElementById('inspeksi-filter-status')?.addEventListener('change', renderInspeksiPage);
    document.getElementById('inspeksi-search')?.addEventListener('input', renderInspeksiPage);

    // Clear search buttons
    const globalSearchInput = document.getElementById('globalSearch');
    const globalSearchClear = document.getElementById('globalSearchClear');
    if (globalSearchInput && globalSearchClear) {
        globalSearchInput.addEventListener('input', () => {
            globalSearchClear.style.display = globalSearchInput.value ? 'inline-block' : 'none';
        });
        globalSearchClear.addEventListener('click', () => {
            globalSearchInput.value = '';
            globalSearchClear.style.display = 'none';
            STATE.filters.search = '';
            STATE.assetPage = 1;
            if (STATE.currentPage === 'assets') {
                const asInput = document.getElementById('asset-search');
                if (asInput) asInput.value = '';
                document.getElementById('assetSearchClear').style.display = 'none';
                renderAssetsTable();
            }
        });
    }

    // Daftar Aset specific search
    const assetSearchInput = document.getElementById('asset-search');
    const assetSearchClear = document.getElementById('assetSearchClear');
    if (assetSearchInput && assetSearchClear) {
        assetSearchInput.addEventListener('input', () => {
            assetSearchClear.style.display = assetSearchInput.value ? 'inline-block' : 'none';
            STATE.filters.search = assetSearchInput.value.trim();
            STATE.assetPage = 1;
            renderAssetsTable();
        });
        assetSearchClear.addEventListener('click', () => {
            assetSearchInput.value = '';
            assetSearchClear.style.display = 'none';
            STATE.filters.search = '';
            STATE.assetPage = 1;
            if (globalSearchInput) globalSearchInput.value = '';
            if (globalSearchClear) globalSearchClear.style.display = 'none';
            renderAssetsTable();
        });
    }

    const inspeksiSearchInput = document.getElementById('inspeksi-search');
    const inspeksiSearchClear = document.getElementById('inspeksiSearchClear');
    if (inspeksiSearchInput && inspeksiSearchClear) {
        inspeksiSearchInput.addEventListener('input', () => {
            inspeksiSearchClear.style.display = inspeksiSearchInput.value ? 'inline-block' : 'none';
        });
        inspeksiSearchClear.addEventListener('click', () => {
            inspeksiSearchInput.value = '';
            inspeksiSearchClear.style.display = 'none';
            renderInspeksiPage();
        });
    }

    const historySearchInput = document.getElementById('history-search');
    const historySearchClear = document.getElementById('historySearchClear');
    if (historySearchInput && historySearchClear) {
        historySearchInput.addEventListener('input', () => {
            historySearchClear.style.display = historySearchInput.value ? 'inline-block' : 'none';
        });
        historySearchClear.addEventListener('click', () => {
            historySearchInput.value = '';
            historySearchClear.style.display = 'none';
            renderHistoryPage();
        });
    }

    // Reset inspeksi filters
    document.getElementById('resetInspeksiBtn')?.addEventListener('click', resetInspeksiFilters);

    // Inspeksi Export dropdown toggle
    const _ixBtn = document.getElementById('inspeksiExportBtn');
    const _ixMenu = document.getElementById('inspeksiExportMenu');
    _ixBtn?.addEventListener('click', function (e) {
        e.stopPropagation();
        _ixMenu.classList.toggle('open');
    });
    document.addEventListener('click', function () { if (_ixMenu) _ixMenu.classList.remove('open'); });

    // Inspeksi Export format buttons
    document.getElementById('inspeksiExportExcelBtn')?.addEventListener('click', function () { exportInspeksiExcel(); _ixMenu.classList.remove('open'); });
    document.getElementById('inspeksiExportPdfBtn')?.addEventListener('click', function () { exportInspeksiPdf(); _ixMenu.classList.remove('open'); });
    document.getElementById('inspeksiExportJpegBtn')?.addEventListener('click', function () { exportInspeksiJpeg(); _ixMenu.classList.remove('open'); });

    // Inspeksi Print
    document.getElementById('inspeksiPrintBtn')?.addEventListener('click', printInspeksi);

    // DATABASE tabs
    document.querySelectorAll('.db-tab').forEach(btn => {
        btn.addEventListener('click', () => switchDbTab(btn.dataset.tab));
    });

    // Database: Users
    document.getElementById('addUserBtn')?.addEventListener('click', openAddUserModal);

    // Database: Raw JSON editor
    document.getElementById('rawLoadBtn')?.addEventListener('click', loadRawEditor);
    document.getElementById('rawSaveBtn')?.addEventListener('click', saveRawAssets);

    // Database: Settings
    document.getElementById('perPageSelect')?.addEventListener('change', e => {
        STATE.assetsPerPage = parseInt(e.target.value);
        STATE.assetPage = 1;
        showToast(`Baris per halaman: ${STATE.assetsPerPage}`, 'info');
    });
    document.getElementById('resetAssetsBtn')?.addEventListener('click', resetAssets);
    document.getElementById('resetAllBtn')?.addEventListener('click', resetAll);

    // Database: Import/Export
    document.getElementById('exportJsonBtn')?.addEventListener('click', exportJson);
    document.getElementById('exportCsvAllBtn')?.addEventListener('click', exportCSV);
    document.getElementById('importJsonFile')?.addEventListener('change', e => importJson(e.target.files[0]));

    // Nav: hide database link from non-admin (purely visual hint; checkAuth still protects access)
    if (SESSION && SESSION.role !== 'Admin') {
        const navDb = document.getElementById('nav-database');
        if (navDb) navDb.style.opacity = '0.4';
    }
});
