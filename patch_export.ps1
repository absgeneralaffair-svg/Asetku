$file = 'C:\Users\LENOVO-Intel Core i5\.gemini\antigravity\scratch\asset-management\app.js'
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Check current state
$lines = $content -split "`r?`n"
$lineNum = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'exportBtn.*addEventListener.*exportCSV') {
        $lineNum = $i + 1
        break
    }
}
Write-Host "Found exportCSV listener at line: $lineNum"

# Build replacement
$oldBlock = "    // Export & Print`r`n    document.getElementById('exportBtn').addEventListener('click', exportCSV);`r`n    document.getElementById('printBtn').addEventListener('click', printAssets);"
$newBlock = @"
    // Export dropdown toggle
    const _xBtn = document.getElementById('exportBtn');
    const _xMenu = document.getElementById('exportMenu');
    _xBtn?.addEventListener('click', function(e) {
        e.stopPropagation();
        _xMenu.classList.toggle('open');
    });
    document.addEventListener('click', function() { if (_xMenu) _xMenu.classList.remove('open'); });

    // Export format buttons
    document.getElementById('exportCsvBtn')?.addEventListener('click',   function() { exportCSV();   _xMenu.classList.remove('open'); });
    document.getElementById('exportExcelBtn')?.addEventListener('click', function() { exportExcel(); _xMenu.classList.remove('open'); });
    document.getElementById('exportPdfBtn')?.addEventListener('click',   function() { exportPdf();   _xMenu.classList.remove('open'); });
    document.getElementById('exportJpegBtn')?.addEventListener('click',  function() { exportJpeg();  _xMenu.classList.remove('open'); });

    document.getElementById('printBtn').addEventListener('click', printAssets);
"@

if ($content.Contains($oldBlock)) {
    $content = $content.Replace($oldBlock, $newBlock.TrimEnd())
    [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
    Write-Host "SUCCESS: Export listeners updated"
}
else {
    # Try with \n only
    $oldBlock2 = "    // Export & Print`n    document.getElementById('exportBtn').addEventListener('click', exportCSV);`n    document.getElementById('printBtn').addEventListener('click', printAssets);"
    if ($content.Contains($oldBlock2)) {
        $content = $content.Replace($oldBlock2, $newBlock.TrimEnd())
        [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
        Write-Host "SUCCESS (LF): Export listeners updated"
    }
    else {
        Write-Host "NOT FOUND - dumping lines around export:"
        for ($i = [Math]::Max(0, $lineNum - 3); $i -lt [Math]::Min($lines.Count, $lineNum + 5); $i++) {
            Write-Host "${i}: $($lines[$i])"
        }
    }
}
