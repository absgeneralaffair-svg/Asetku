/**
 * firebase-sync.js
 * 
 * Adapter real-time Firebase Firestore untuk AsetKu.
 * TIDAK mengubah app.js — cukup patch localStorage agar otomatis sync ke cloud.
 * 
 * Cara kerja:
 * 1. Saat halaman dibuka → ambil data terbaru dari Firestore → isi localStorage
 * 2. Saat data disimpan (localStorage.setItem) → juga dikirim ke Firestore
 * 3. Firestore onSnapshot → saat ada perubahan dari device lain → update localStorage + re-render
 */

(function () {
    // ── Deteksi: apakah Firebase config sudah diisi? ──────────────────
    const isConfigured = typeof FIREBASE_CONFIG !== 'undefined' &&
        FIREBASE_CONFIG.apiKey &&
        !FIREBASE_CONFIG.apiKey.includes('GANTI');

    if (!isConfigured) {
        console.warn('[AsetKu Sync] Firebase belum dikonfigurasi. Menggunakan localStorage lokal.');
        window._firebaseSyncReady = Promise.resolve(false);
        return;
    }

    // ── Inisialisasi Firebase ──────────────────────────────────────────
    let db;
    let _isSyncingFromRemote = false; // flag untuk mencegah loop
    const _origSetItem = localStorage.setItem.bind(localStorage);
    const _origGetItem = localStorage.getItem.bind(localStorage);

    const COLLECTION = 'asetku_data';

    // ── UTILITY: Tampil status sync di UI ─────────────────────────────
    function showSyncStatus(text, isError = false) {
        let el = document.getElementById('sync-status-bar');
        if (!el) {
            el = document.createElement('div');
            el.id = 'sync-status-bar';
            el.style.cssText = `
                position:fixed;bottom:16px;right:16px;z-index:9999;
                padding:8px 14px;border-radius:20px;font-size:12px;font-weight:600;
                display:flex;align-items:center;gap:6px;
                transition:all 0.3s;box-shadow:0 4px 12px rgba(0,0,0,0.3);
                background:${isError ? '#f85149' : '#238636'};color:#fff;
            `;
            document.body.appendChild(el);
        }
        el.innerHTML = isError ? ('⚠️ ' + text) : ('☁️ ' + text);
        el.style.opacity = '1';
        clearTimeout(el._timeout);
        el._timeout = setTimeout(() => { el.style.opacity = '0'; }, 3000);
    }

    // ── PATCH localStorage.setItem ─────────────────────────────────────
    // Setiap kali app.js menyimpan data → juga kirim ke Firestore
    localStorage.setItem = function (key, value) {
        _origSetItem(key, value);  // tetap simpan lokal seperti biasa

        if (!db || !SYNC_KEYS.includes(key) || _isSyncingFromRemote) return;

        db.collection(COLLECTION).doc(key).set({ data: value, updatedAt: Date.now() })
            .then(() => { showSyncStatus('Data tersinkron'); })
            .catch(err => { console.error('[Sync] Gagal push:', err); showSyncStatus('Sync gagal: ' + err.message, true); });
    };

    // ── PULL: ambil data dari Firestore saat startup ───────────────────
    async function pullFromFirestore() {
        const docs = await Promise.all(
            SYNC_KEYS.map(key => db.collection(COLLECTION).doc(key).get())
        );
        let pulled = 0;
        docs.forEach(doc => {
            if (doc.exists && doc.data().data) {
                _origSetItem(doc.id, doc.data().data);
                pulled++;
            }
        });
        if (pulled > 0) showSyncStatus(`${pulled} data diambil dari cloud`);
        return pulled;
    }

    // ── SUBSCRIBE: dengarkan perubahan real-time ───────────────────────
    function subscribeRealtime() {
        db.collection(COLLECTION).onSnapshot(snapshot => {
            let changed = false;
            snapshot.docChanges().forEach(change => {
                if (change.type === 'modified' || change.type === 'added') {
                    const key = change.doc.id;
                    if (!SYNC_KEYS.includes(key)) return;

                    const remoteData = change.doc.data().data;
                    const localData = _origGetItem(key);

                    if (remoteData !== localData) {
                        _isSyncingFromRemote = true;
                        _origSetItem(key, remoteData);
                        _isSyncingFromRemote = false;
                        changed = true;
                    }
                }
            });

            if (changed && typeof renderCurrentPage === 'function') {
                renderCurrentPage();
                showSyncStatus('Update dari perangkat lain');
            }
        }, err => {
            console.error('[Sync] Listener error:', err);
            showSyncStatus('Koneksi terputus', true);
        });
    }

    // ── MAIN: inisialisasi Firebase + sync ────────────────────────────
    window._firebaseSyncReady = (async () => {
        try {
            // Load Firebase SDK jika belum ada
            if (typeof firebase === 'undefined') {
                console.warn('[Sync] Firebase SDK tidak ditemukan. Pastikan Firebase CDN sudah ditambahkan di index.html.');
                return false;
            }

            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            db = firebase.firestore();

            // Coba koneksi sederhana
            showSyncStatus('Menghubungkan ke cloud...');

            // Pull data terbaru dari Firestore ke localStorage
            await pullFromFirestore();

            // Mulai dengarkan perubahan real-time
            subscribeRealtime();

            showSyncStatus('Terhubung ke cloud');
            console.log('[AsetKu Sync] Firebase Firestore aktif & real-time sync berjalan.');
            return true;
        } catch (err) {
            console.error('[Sync] Gagal inisialisasi Firebase:', err);
            showSyncStatus('Tidak dapat terhubung ke cloud. Mode lokal aktif.', true);
            return false;
        }
    })();

    // ── Expose: render ulang halaman saat ini ─────────────────────────
    // Ini dipanggil ketika ada update dari Firestore
    function renderCurrentPage() {
        if (typeof STATE === 'undefined') return;
        // Re-load state dari localStorage (yang sudah diupdate)
        if (typeof load === 'function') load();
        // Render halaman yang sedang aktif
        const page = STATE?.currentPage;
        if (!page) return;
        const renders = {
            dashboard: () => typeof renderDashboard === 'function' && renderDashboard(),
            assets: () => typeof renderAssetsTable === 'function' && renderAssetsTable(),
            history: () => typeof renderHistoryPage === 'function' && renderHistoryPage(),
            inspeksi: () => typeof renderInspeksiPage === 'function' && renderInspeksiPage(),
            categories: () => typeof renderCategories === 'function' && renderCategories(),
            locations: () => typeof renderLocations === 'function' && renderLocations(),
            reports: () => typeof renderReports === 'function' && renderReports(),
        };
        if (renders[page]) renders[page]();
    }

    window.renderCurrentPage = renderCurrentPage;

})();
