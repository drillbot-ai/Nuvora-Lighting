# Script mejorado para completar la actualización de fuentes
$workingDir = "c:\Users\fabio\My Drive (fabio.diaz.castro@gmail.com)\NUVORA LIGHTING\02_Web_Marketing\04_Content\NUVORA Website"
Set-Location $workingDir

$files = Get-ChildItem -Filter "*.htm" | Where-Object { $_.Name -ne "update_fonts_final.ps1" }

foreach ($file in $files) {
    Write-Host "Procesando: $($file.Name)"
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Actualizar imports que aún tengan Lusitana
    $content = $content -replace "@import url\('https://fonts\.googleapis\.com/css2\?family=Lusitana[^']*'\);", "@import url('https://fonts.googleapis.com/css2?family=Tenor+Sans:wght@400&family=Manrope:wght@300;400;500;600&display=swap');"
    
    # Actualizar imports que tengan Crimson Text
    $content = $content -replace "@import url\('https://fonts\.googleapis\.com/css2\?family=Crimson\+Text[^']*'\);", ""
    
    # Reemplazar las referencias a Lusitana que el script anterior no capturó
    $content = $content -replace "font-family:\s*['`"]?Lusitana['`"]?\s*,\s*serif", "font-family:'Tenor Sans',serif"
    $content = $content -replace "font-family:\s*Lusitana\s*,\s*serif", "font-family:'Tenor Sans',serif"
    
    # Reemplazar Cinzel por Tenor Sans
    $content = $content -replace "font-family:\s*['`"]?Cinzel['`"]?\s*,\s*serif", "font-family:'Tenor Sans',serif"
    $content = $content -replace "font-family:\s*Cinzel\s*,\s*serif", "font-family:'Tenor Sans',serif"
    
    # Reemplazar Crimson Text por Manrope
    $content = $content -replace "font-family:\s*['`"]?Crimson\s*Text['`"]?\s*,\s*serif", "font-family:Manrope,sans-serif"
    
    # Asegurar que las declaraciones de Lusitana, Cinzel se actualicen
    $content = $content -replace "font-family:\s*['`"]Lusitana['`"]", "font-family:'Tenor Sans'"
    $content = $content -replace "font-family:\s*['`"]Cinzel['`"]", "font-family:'Tenor Sans'"
    
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "Actualización completada!"