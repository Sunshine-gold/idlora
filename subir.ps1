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

.PARAMETER DryRun
    Muestra todo lo que haría pero no crea el repo ni sube nada. Sirve para probar el script.

.EXAMPLE
    .\subir.ps1

.EXAMPLE
    .\subir.ps1 -Nombre idlora -Si
#>
[CmdletBinding()]
param(
    [string]$Nombre,
    [switch]$Publico,
    [switch]$Si,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Info  ($m) { Write-Host "  $m" -ForegroundColor Gray }
function Paso  ($m) { Write-Host ""; Write-Host "> $m" -ForegroundColor Cyan }
function Ok    ($m) { Write-Host "  [ok] $m" -ForegroundColor Green }
function Aviso ($m) { Write-Host "  [!] $m" -ForegroundColor Yellow }
function Mal   ($m) { Write-Host "  [x] $m" -ForegroundColor Red }

# Corre un comando nativo sin que su stderr dispare el ErrorActionPreference global.
# Devuelve objeto con .Code (exit code) y .Out (texto combinado).
function Invoke-Native {
    param(
        [Parameter(Mandatory)][string]$Exe,
        [string[]]$Arguments = @()
    )
    # Se resuelve la ruta real del ejecutable para no chocar con funciones del script.
    $cmd = Get-Command $Exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $cmd) {
        return [pscustomobject]@{ Code = 127; Out = "$Exe no encontrado" }
    }
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $raw  = & $cmd.Source @Arguments 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    $text = (($raw | ForEach-Object { "$_" }) -join "`n").Trim()
    [pscustomobject]@{ Code = $code; Out = $text }
}

function Invoke-Git { param([string[]]$Arguments) Invoke-Native -Exe 'git' -Arguments $Arguments }
function Invoke-Gh  { param([string[]]$Arguments) Invoke-Native -Exe 'gh'  -Arguments $Arguments }

Write-Host ""
Write-Host "  PUBLICAR EL REPOSITORIO EN GITHUB" -ForegroundColor White
Write-Host "  ------------------------------------------------" -ForegroundColor DarkGray

# ---------- 1. git presente ----------
Paso "Verificando git"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Mal "git no está instalado o no está en el PATH."
    exit 1
}
Ok ((Invoke-Git @('--version')).Out)

# ---------- 2. estamos en un repo ----------
Paso "Verificando el repositorio"
$dentro = Invoke-Git @('rev-parse', '--is-inside-work-tree')
if ($dentro.Out -ne 'true' -and $PSScriptRoot) {
    # Si se ejecutó desde otra carpeta, probamos parados donde vive el script.
    Push-Location $PSScriptRoot
    $dentro = Invoke-Git @('rev-parse', '--is-inside-work-tree')
}
if ($dentro.Out -ne 'true') {
    Mal "Esta carpeta no es un repositorio git."
    Info "Ejecutá primero:  git init -b main"
    exit 1
}
$raiz = (Invoke-Git @('rev-parse', '--show-toplevel')).Out
Info "Carpeta: $raiz"
Set-Location $raiz

$commit = Invoke-Git @('rev-list', '-n', '1', 'HEAD')
if ($commit.Code -ne 0 -or -not $commit.Out) {
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
$estado = Invoke-Git @('status', '--porcelain')
if ($estado.Code -ne 0) {
    Mal "No pude leer el estado del repo."
    exit 1
}
if ($estado.Out) {
    Aviso "Hay cambios sin commitear. NO se van a subir."
    ($estado.Out -split "`n") | Select-Object -First 10 | ForEach-Object { Info $_ }
    Info "Si los querés incluir:  git add -A ; git commit -m ""mensaje"""
}
else {
    Ok "Todo commiteado"
}

# ---------- 5. remote existente ----------
$remote = Invoke-Git @('remote', 'get-url', 'origin')
if ($remote.Code -eq 0 -and $remote.Out) {
    Paso "Ya existe un remoto 'origin'"
    Info $remote.Out
    Write-Host ""
    $r = Read-Host "  ¿Hacer push al remoto existente? (s/n)"
    if ($r -ne 's') { Info "Cancelado, no se tocó nada."; exit 0 }
    $pushear = Invoke-Git @('push', '-u', 'origin', 'HEAD')
    if ($pushear.Code -ne 0) {
        Mal "El push falló:"
        Info $pushear.Out
        exit 1
    }
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
Ok ((Invoke-Gh @('--version')).Out -split "`n" | Select-Object -First 1)

# ---------- 7. sesión de gh ----------
Paso "Verificando la sesión de GitHub"
$auth = Invoke-Gh @('auth', 'status')
if ($auth.Code -ne 0) {
    Aviso "gh está instalado pero no tiene sesión iniciada."
    Write-Host ""
    Write-Host "  Ejecutá esto primero (es interactivo, elegís navegador o token):" -ForegroundColor White
    Write-Host "     gh auth login"
    Write-Host ""
    Info "Después volvé a correr este script. No hay nada roto: no se tocó el repo."
    exit 1
}
$u = Invoke-Gh @('api', 'user', '--jq', '.login')
$usuario = if ($u.Code -eq 0 -and $u.Out) { $u.Out } else { '' }
if ($usuario) { Ok "Sesión iniciada como $usuario" } else { $usuario = 'TU-USUARIO' }

# ---------- 8. confirmación ----------
Paso "Resumen"
Info "Repositorio : $Nombre"
Info "Visibilidad : $visibilidad"
Info "Rama        : $((Invoke-Git @('rev-parse', '--abbrev-ref', 'HEAD')).Out)"
Info "Commits     : $((Invoke-Git @('rev-list', '--count', 'HEAD')).Out)"
Info "Destino     : github.com/$usuario/$Nombre"

if ($DryRun) {
    Write-Host ""
    Ok "Dry run: no se crea ni se sube nada. Todo lo anterior funcionó."
    exit 0
}

if (-not $Si) {
    Write-Host ""
    $r = Read-Host "  Escribí SUBIR para confirmar (Enter para cancelar)"
    if ($r -ne 'SUBIR') { Info "Cancelado, no se tocó nada."; exit 0 }
}

# ---------- 9. crear y subir ----------
Paso "Creando el repositorio y subiendo"
$argsGh = @('repo', 'create', $Nombre, '--source', '.', '--remote', 'origin', '--push')
if ($Publico) { $argsGh += '--public' } else { $argsGh += '--private' }

$creado = Invoke-Gh $argsGh
if ($creado.Code -ne 0) {
    Mal "No se pudo crear o subir el repositorio."
    if ($creado.Out) { Info $creado.Out }
    Info "Si el nombre ya existe en tu cuenta, probá con otro:  .\subir.ps1 -Nombre otro-nombre"
    exit 1
}

# ---------- 10. resultado ----------
Write-Host ""
Write-Host "  LISTO" -ForegroundColor Green
Write-Host "  ------------------------------------------------" -ForegroundColor DarkGray
$v = Invoke-Gh @('repo', 'view', $Nombre, '--json', 'url', '--jq', '.url')
$url = if ($v.Code -eq 0 -and $v.Out) { $v.Out } else { "https://github.com/$usuario/$Nombre" }
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
