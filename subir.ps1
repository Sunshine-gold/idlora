#Requires -Version 5.1
<#
.SYNOPSIS
    Publica este repositorio en GitHub como privado y devuelve el link para compartir.

.DESCRIPTION
    Script de una sola tarea: crear el repositorio remoto y subir lo que ya está commiteado.

    Qué hace:
      - Verifica que estés dentro de un repo git con al menos un commit.
      - Verifica que gh (GitHub CLI) exista y tenga sesión iniciada.
      - Crea el repo con la visibilidad elegida (privado por defecto).
      - Agrega 'origin' y hace el primer push.
      - Muestra la URL final.

    Qué NO hace:
      - No instala nada.
      - No pide elevación (UAC).
      - No descarga binarios.
      - No toca configuración del sistema, firewall, servicios ni tareas programadas.
      - No borra ni reescribe commits (nada de reset --hard, clean -f ni force push).

    Red que usa: solo la de gh hacia github.com, y solo cuando confirmás.

    Si lo editás, guardalo como UTF-8 con BOM para que Windows PowerShell 5.1
    muestre bien los acentos.

.PARAMETER Nombre
    Nombre del repositorio en GitHub. Por defecto usa el nombre de la carpeta.

.PARAMETER Publico
    Crea el repositorio público. Sin este flag, siempre es privado.

.PARAMETER Si
    Salta la confirmación manual. Usalo solo si sabés lo que hace.

.EXAMPLE
    .\subir.ps1

.EXAMPLE
    .\subir.ps1 -Nombre kraenns-nombre -Si
#>
[CmdletBinding()]
param(
    [string]$Nombre,
    [switch]$Publico,
    [switch]$Si
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Info  ($m) { Write-Host "  $m" -ForegroundColor Gray }
function Paso  ($m) { Write-Host ""; Write-Host "> $m" -ForegroundColor Cyan }
function Ok    ($m) { Write-Host "  [ok] $m" -ForegroundColor Green }
function Aviso ($m) { Write-Host "  [!] $m" -ForegroundColor Yellow }
function Mal   ($m) { Write-Host "  [x] $m" -ForegroundColor Red }

# Llama a gh sin que el stderr nativo dispare el ErrorActionPreference global.
function Call-Gh {
    param([string[]]$GhArgs)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out  = & gh @GhArgs 2>&1 | Out-String
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    [pscustomobject]@{ Code = $code; Out = ($out -as [string]).Trim() }
}

Write-Host ""
Write-Host "  PUBLICAR EL REPOSITORIO EN GITHUB" -ForegroundColor White
Write-Host "  ------------------------------------------------" -ForegroundColor DarkGray

# ---------- 1. git presente ----------
Paso "Verificando git"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Mal "git no está instalado o no está en el PATH."
    exit 1
}
Ok ("git " + (git --version))

# ---------- 2. estamos en un repo ----------
Paso "Verificando el repositorio"
$dentro = git rev-parse --is-inside-work-tree 2>$null
if ($dentro -ne 'true') {
    Mal "Esta carpeta no es un repositorio git."
    Info "Ejecutá primero:  git init -b main"
    exit 1
}
$raiz = git rev-parse --show-toplevel
Info "Carpeta: $raiz"
Set-Location $raiz

$commit = git rev-list -n 1 HEAD 2>$null
if (-not $commit) {
    Mal "El repositorio no tiene commits todavía."
    Info "Ejecutá primero:  git add -A ; git commit -m ""primer commit"""
    exit 1
}
Ok "Hay commits para subir"

# ---------- 3. nombre ----------
if (-not $Nombre) {
    $Nombre = Split-Path -Leaf $raiz
}
$visibilidad = if ($Publico) { 'público' } else { 'privado' }

# ---------- 4. estado del árbol ----------
Paso "Revisando cambios sin commitear"
$pendientes = git status --porcelain
if ($pendientes) {
    Aviso "Hay cambios sin commitear. NO se van a subir."
    $pendientes | Select-Object -First 10 | ForEach-Object { Info $_ }
    Info "Si los querés incluir:  git add -A ; git commit -m ""mensaje"""
}
else {
    Ok "Todo commiteado"
}

# ---------- 5. remote existente ----------
$remote = git remote get-url origin 2>$null
if ($remote) {
    Paso "Ya existe un remoto 'origin'"
    Info $remote
    Write-Host ""
    $r = Read-Host "  ¿Hacer push al remoto existente? (s/n)"
    if ($r -ne 's') { Info "Cancelado, no se tocó nada."; exit 0 }
    git push -u origin HEAD
    if ($LASTEXITCODE -ne 0) { Mal "El push falló."; exit 1 }
    Ok "Subido"
    exit 0
}

# ---------- 6. gh disponible? ----------
Paso "Buscando GitHub CLI (gh)"
$gh = Get-Command gh -ErrorAction SilentlyContinue

if (-not $gh) {
    Aviso "No encontré 'gh' instalado."
    Write-Host ""
    Write-Host "  Camino manual (5 minutos):" -ForegroundColor White
    Write-Host "  1. Abrí https://github.com/new"
    Write-Host "  2. Nombre: $Nombre    Visibilidad: $visibilidad    Sin README ni .gitignore"
    Write-Host "  3. Copiá la URL del repo y ejecutá:" -ForegroundColor Gray
    Write-Host "       git remote add origin https://github.com/TU-USUARIO/$Nombre.git"
    Write-Host "       git push -u origin main"
    Write-Host ""
    Info "Abrí la URL a mano (este script no lanza procesos ni abre ventanas)."
    exit 0
}
Ok ("gh " + (gh --version | Select-Object -First 1))

# ---------- 7. sesión de gh ----------
$auth = Call-Gh @('auth', 'status')
if ($auth.Code -ne 0) {
    Aviso "gh está instalado pero no tiene sesión iniciada."
    Write-Host ""
    Write-Host "  Ejecutá esto primero (es interactivo, elegís navegador o token):" -ForegroundColor White
    Write-Host "     gh auth login"
    Write-Host ""
    Info "Después volvé a correr este script. No hay nada roto: no se tocó el repo."
    exit 1
}
$u = Call-Gh @('api', 'user', '--jq', '.login')
$usuario = if ($u.Code -eq 0) { $u.Out } else { '' }
if ($usuario) { Ok "Sesión iniciada como $usuario" } else { $usuario = 'TU-USUARIO' }

# ---------- 8. confirmación ----------
Paso "Resumen"
Info "Repositorio : $Nombre"
Info "Visibilidad : $visibilidad"
Info "Rama        : $(git rev-parse --abbrev-ref HEAD)"
Info "Commits     : $(git rev-list --count HEAD)"
Info "Destino     : github.com/$usuario/$Nombre"

if (-not $Si) {
    Write-Host ""
    $r = Read-Host "  Escribí SUBIR para confirmar (Enter para cancelar)"
    if ($r -ne 'SUBIR') { Info "Cancelado, no se tocó nada."; exit 0 }
}

# ---------- 9. crear y subir ----------
Paso "Creando el repositorio y subiendo"
$argsGh = @('repo', 'create', $Nombre, '--source', '.', '--remote', 'origin', '--push')
if ($Publico) { $argsGh += '--public' } else { $argsGh += '--private' }

& gh @argsGh
if ($LASTEXITCODE -ne 0) {
    Mal "No se pudo crear o subir el repositorio."
    Info "Si el nombre ya existe en tu cuenta, probá con otro:  .\subir.ps1 -Nombre otro-nombre"
    exit 1
}

# ---------- 10. resultado ----------
Write-Host ""
Write-Host "  LISTO" -ForegroundColor Green
Write-Host "  ------------------------------------------------" -ForegroundColor DarkGray
$url = ''
$v = Call-Gh @('repo', 'view', $Nombre, '--json', 'url', '--jq', '.url')
if ($v.Code -eq 0 -and $v.Out) { $url = $v.Out }
if (-not $url) { $url = "https://github.com/$usuario/$Nombre" }
Info "Repo     : $url"
Info "Interfaz : $url/tree/main/site"
Write-Host ""
if (-not $Publico) {
    Write-Host "  Es privado: solo lo ve quien invites." -ForegroundColor Yellow
    Write-Host "  Para sumar a alguien:" -ForegroundColor Yellow
    Write-Host "     gh api -X PUT repos/$usuario/$Nombre/collaborators/USUARIO -f permission=push" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Ojo: el HTML no se renderiza dentro del repo." -ForegroundColor Yellow
    Write-Host "  Para que lo vean: abrir el repo con github.dev, o Pages (requiere Pro)," -ForegroundColor Yellow
    Write-Host "  o pasar la carpeta y abrir site/index.html." -ForegroundColor Yellow
}
Write-Host ""
