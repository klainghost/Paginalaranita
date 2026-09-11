# deploy.ps1 - Sube cambios a GitHub y los despliega en el servidor
# Uso: .\deploy.ps1
#      .\deploy.ps1 "mensaje del commit"

param(
    [string]$Mensaje = ""
)

$SERVIDOR   = "207.248.126.25"
$USUARIO    = "usuario"
$DIR_SERVER = "~/Escritorio/laranita3d"
$PM2_NAME   = "ranita3d"

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

# 2. Push a GitHub
Paso "Subiendo a GitHub..."
git push origin main
if ($LASTEXITCODE -ne 0) { Falla "git push fallo" }
Ok "Push completado"

# 3. Deploy en el servidor via SSH
Paso "Desplegando en el servidor..."

$remoto = "cd $DIR_SERVER && git pull origin main && pm2 restart $PM2_NAME && pm2 save"
ssh "${USUARIO}@${SERVIDOR}" $remoto

if ($LASTEXITCODE -ne 0) { Falla "El deploy en el servidor fallo" }

Ok "Deploy completado"
Write-Host ""
Write-Host "   https://laranita3d.com.ar" -ForegroundColor Yellow
