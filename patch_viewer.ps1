$file = 'C:\Users\LENOVO-Intel Core i5\.gemini\antigravity\scratch\asset-management\app.js'
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Each replacement: [search, replace]
$patches = @(
    @{
        Search  = "function openAddModal() {`r`n    STATE.editingId = null;"
        Replace = "function openAddModal() {`r`n    if (isViewer()) { showToast('Akses ditolak: akun Viewer tidak bisa menambah data', 'error'); return; }`r`n    STATE.editingId = null;"
    },
    @{
        Search  = "function openEditModal(id) {`r`n    STATE.editingId = id;"
        Replace = "function openEditModal(id) {`r`n    if (isViewer()) { showToast('Akses ditolak: akun Viewer tidak bisa mengedit data', 'error'); return; }`r`n    STATE.editingId = id;"
    },
    @{
        Search  = "function saveAsset() {`r`n    // Validate"
        Replace = "function saveAsset() {`r`n    if (isViewer()) { showToast('Akses ditolak', 'error'); return; }`r`n    // Validate"
    },
    @{
        Search  = "function addCategory() {`r`n    const input = document.getElementById('new-category-input');"
        Replace = "function addCategory() {`r`n    if (isViewer()) { showToast('Akses ditolak: akun Viewer tidak bisa menambah kategori', 'error'); return; }`r`n    const input = document.getElementById('new-category-input');"
    },
    @{
        Search  = "function addLocation() {`r`n    const input = document.getElementById('new-location-input');"
        Replace = "function addLocation() {`r`n    if (isViewer()) { showToast('Akses ditolak: akun Viewer tidak bisa menambah lokasi', 'error'); return; }`r`n    const input = document.getElementById('new-location-input');"
    },
    @{
        Search  = "function openAddHistoryModal(presetAsetId = '') {`r`n    _editingHistoryId = null;"
        Replace = "function openAddHistoryModal(presetAsetId = '') {`r`n    if (isViewer()) { showToast('Akses ditolak: akun Viewer tidak bisa menambah riwayat', 'error'); return; }`r`n    _editingHistoryId = null;"
    },
    @{
        Search  = "function saveHistoryRecord() {`r`n    const asetId = document.getElementById('h-aset').value;"
        Replace = "function saveHistoryRecord() {`r`n    if (isViewer()) { showToast('Akses ditolak', 'error'); return; }`r`n    const asetId = document.getElementById('h-aset').value;"
    }
)

$count = 0
foreach ($p in $patches) {
    if ($content.Contains($p.Search)) {
        $content = $content.Replace($p.Search, $p.Replace)
        $count++
        Write-Host "Patched: $($p.Search.Substring(0, [Math]::Min(60, $p.Search.Length)))..."
    }
    else {
        Write-Host "NOT FOUND: $($p.Search.Substring(0, [Math]::Min(60, $p.Search.Length)))"
    }
}

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "Done. $count / $($patches.Count) patches applied."
