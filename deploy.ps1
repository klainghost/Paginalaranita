# deploy.ps1 - Sube cambios a GitHub (el servidor se actualiza solo via webhook)
# Uso: .\deploy.ps1
#      .\deploy.ps1 "mensaje del commit"

param(
    [string]$Mensaje = ""
)

$ErrorActionPreference = "Stop"

function Paso($texto)  { Write-Host "" ; Write-Host ">> $texto" -ForegroundColor Cyan }
function Ok($texto)    { Write-Host "   OK: $texto" -ForegroundColor Green }
function Falla($texto) { Write-Host "   ERROR: $texto" -ForegroundColor Red ; exit 1 }

# 1. Commit si hay cambios
Paso "Revisando cambios locales..."

$cambios = git status --porcelain
if ($cambios) {
    if ($Mensaje -eq "") {
        $Mensaje = Read-Host "   Hay cambios sin commitear. Mensaje del commit"
        if ($Mensaje -eq "") {
            $Mensaje = "chore: actualizacion $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        }
    }
    git add -A
    git commit -m $Mensaje
    Ok "Commit: $Mensaje"
} else {
    Ok "Sin cambios locales pendientes"
}

# 2. Push - el webhook en el servidor hace git pull + pm2 restart automaticamente
Paso "Subiendo a GitHub..."
git push origin main
if ($LASTEXITCODE -ne 0) { Falla "git push fallo" }

Ok "Push completado - el servidor se actualiza en segundos via webhook"
Write-Host ""
$url = "https://laranita3d.com.ar"
Write-Host "   $url" -ForegroundColor Yellow