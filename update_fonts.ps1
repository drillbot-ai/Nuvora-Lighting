# Script para actualizar todas las fuentes en el sitio NUVORA
# Reemplaza Lusitana, Cinzel, Crimson Text con Tenor Sans para títulos
# Mantiene Manrope para texto del cuerpo

$files = Get-ChildItem -Path "." -Filter "*.htm" -Exclude "update_fonts.ps1"

foreach ($file in $files) {
    Write-Host "Actualizando fuentes en: $($file.Name)"
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Actualizar imports de Google Fonts
    $content = $content -replace "@import url\('https://fonts\.googleapis\.com/css2\?family=Lusitana[^']*'\);", "@import url('https://fonts.googleapis.com/css2?family=Tenor+Sans:wght@400&family=Manrope:wght@300;400;500;600&display=swap');"
    $content = $content -replace "@import url\('https://fonts\.googleapis\.com/css2\?family=Cinzel[^']*'\);", "@import url('https://fonts.googleapis.com/css2?family=Tenor+Sans:wght@400&family=Manrope:wght@300;400;500;600&display=swap');"
    $content = $content -replace "@import url\('https://fonts\.googleapis\.com/css2\?family=Crimson\+Text[^']*'\);", ""
    
    # Reemplazar todas las referencias a Lusitana con Tenor Sans
    $content = $content -replace "font-family:\s*['""]?Lusitana['""]?\s*,\s*serif", "font-family:'Tenor Sans',serif"
    $content = $content -replace "font-family:\s*['""]Lusitana['""],\s*serif", "font-family:'Tenor Sans',serif"
    $content = $content -replace "font-family:\s*Lusitana\s*,\s*serif", "font-family:'Tenor Sans',serif"
    
    # Reemplazar todas las referencias a Cinzel con Tenor Sans
    $content = $content -replace "font-family:\s*['""]?Cinzel['""]?\s*,\s*serif", "font-family:'Tenor Sans',serif"
    $content = $content -replace "font-family:\s*['""]Cinzel['""],\s*serif", "font-family:'Tenor Sans',serif"
    $content = $content -replace "font-family:\s*Cinzel\s*,\s*serif", "font-family:'Tenor Sans',serif"
    
    # Reemplazar referencias a Crimson Text con Manrope (para texto del cuerpo)
    $content = $content -replace "font-family:\s*['""]?Crimson\s*Text['""]?\s*,\s*serif", "font-family:Manrope,sans-serif"
    $content = $content -replace "font-family:\s*['""]Crimson\s*Text['""],\s*serif", "font-family:Manrope,sans-serif"
    
    # Reemplazar referencias a Inter con Manrope
    $content = $content -replace "font-family:\s*['""]?Inter['""]?\s*,\s*sans-serif", "font-family:Manrope,sans-serif"
    $content = $content -replace "font-family:\s*['""]Inter['""],\s*sans-serif", "font-family:Manrope,sans-serif"
    $content = $content -replace "font-family:\s*Inter\s*,\s*sans-serif", "font-family:Manrope,sans-serif"
    
    # Asegurar que tenemos el import correcto si no existe
    if ($content -notmatch "@import url\('https://fonts\.googleapis\.com/css2\?family=Tenor\+Sans") {
        if ($content -match "<style>") {
            $content = $content -replace "<style>", "<style>`n@import url('https://fonts.googleapis.com/css2?family=Tenor+Sans:wght@400&family=Manrope:wght@300;400;500;600&display=swap');"
        }
    }
    
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

Write-Host "¡Actualización de fuentes completada en todos los archivos .htm!"