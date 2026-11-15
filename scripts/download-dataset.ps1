#requires -Version 7.0
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$DestinationDirectory,
    [string]$ManifestPath,
    [string]$ManifestUrl = 'https://raw.githubusercontent.com/ahmet123taha/aistro-flame-in-freefall/main/data/dataset-release.json',
    [string]$PythonCommand = 'python'
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$destinationRoot = [IO.Path]::GetFullPath($DestinationDirectory)
[IO.Directory]::CreateDirectory($destinationRoot) | Out-Null
$cacheRoot = Join-Path $destinationRoot '.aistro-download-cache'
[IO.Directory]::CreateDirectory($cacheRoot) | Out-Null
if ((Get-Item -LiteralPath $cacheRoot).Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw 'The download cache must not be a symlink or junction.'
}
$verifierPath = Join-Path $PSScriptRoot 'verify-dataset.py'
if (-not (Test-Path -LiteralPath $verifierPath -PathType Leaf)) { throw 'verify-dataset.py must be beside this script.' }
& $PythonCommand --version
if ($LASTEXITCODE -ne 0) { throw 'Python 3 is required.' }

function Assert-PublicHttps([string]$Url) {
    $parsed = [Uri]$Url
    if (-not $parsed.IsAbsoluteUri -or $parsed.Scheme -ne 'https' -or $parsed.UserInfo) {
        throw 'A credential-free HTTPS URL is required.'
    }
}
function Get-VerifiedAsset($Asset) {
    $name = [string]$Asset.name
    if ($name -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]+$' -or $name -ne [IO.Path]::GetFileName($name)) {
        throw 'Unsafe release asset filename.'
    }
    if ([string]$Asset.sha256 -notmatch '^[0-9a-fA-F]{64}$' -or [long]$Asset.bytes -lt 0) {
        throw "Invalid checksum or size for $name"
    }
    Assert-PublicHttps ([string]$Asset.url)
    $path = Join-Path $cacheRoot $name
    $valid = $false
    if (Test-Path -LiteralPath $path -PathType Leaf) {
        $existing = Get-Item -LiteralPath $path
        if ($existing.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked cache file rejected: $name" }
        $valid = $existing.Length -eq [long]$Asset.bytes -and (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -eq [string]$Asset.sha256
        if (-not $valid) { throw "Cached file differs; inspect or remove this single file before retrying: $path" }
    }
    if (-not $valid) {
        $temporary = Join-Path $cacheRoot ($name + '.' + [Guid]::NewGuid().ToString('N') + '.partial')
        try {
            Write-Host "Downloading $name"
            Invoke-WebRequest -Uri ([string]$Asset.url) -OutFile $temporary
            if ((Get-Item -LiteralPath $temporary).Length -ne [long]$Asset.bytes -or (Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash -ne [string]$Asset.sha256) {
                throw "Downloaded asset checksum or size mismatch: $name"
            }
            Move-Item -LiteralPath $temporary -Destination $path
        } finally {
            if (Test-Path -LiteralPath $temporary -PathType Leaf) { Remove-Item -LiteralPath $temporary }
        }
    }
    return $path
}

if ($ManifestPath) {
    $manifestText = Get-Content -LiteralPath $ManifestPath -Raw
} else {
    Assert-PublicHttps $ManifestUrl
    $manifestText = (Invoke-WebRequest -Uri $ManifestUrl).Content
}
$manifest = $manifestText | ConvertFrom-Json
if (-not $manifest.PSObject.Properties['assets']) { throw 'Release manifest has no assets; publication may be incomplete.' }
$parts = @($manifest.assets | Where-Object { $_.name -match '^Veri_Seti-public-part-\d+\.tar\.gz$' } | Sort-Object name)
if ($parts.Count -eq 0) { throw 'No dataset archive parts are listed.' }
if ($manifest.PSObject.Properties['inventory']) {
    $inventoryAsset = $manifest.inventory
} else {
    $inventoryAsset = @($manifest.assets | Where-Object { $_.name -eq 'dataset-files.jsonl.gz' })
    if ($inventoryAsset.Count -ne 1) { throw 'Release manifest must identify exactly one dataset-files.jsonl.gz inventory.' }
    $inventoryAsset = $inventoryAsset[0]
}
$inventoryPath = Get-VerifiedAsset $inventoryAsset
foreach ($part in $parts) {
    $archivePath = Get-VerifiedAsset $part
    & $PythonCommand $verifierPath --root $destinationRoot --inventory $inventoryPath --extract-part $archivePath --archive-sha256 ([string]$part.sha256)
    if ($LASTEXITCODE -ne 0) { throw "Part verification failed; archive retained: $archivePath" }
    # Remove only the verified cached archive, never the dataset or a directory tree.
    Remove-Item -LiteralPath $archivePath
}
Write-Host "Installed and verified $($parts.Count) parts under $destinationRoot"
Write-Host "Per-file inventory retained at $inventoryPath"
