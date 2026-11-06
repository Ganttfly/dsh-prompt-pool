param(
  [Parameter(Mandatory = $true)][string]$Path,
  [Parameter(Mandatory = $true)][string]$OutFile
)
# Extracts one file from the Electron app.asar archive (stored, uncompressed).
$asar = 'C:\Users\robinshen\AppData\Local\Programs\DeepSeek Harness\resources\app.asar'
$fs = [System.IO.File]::OpenRead($asar)
try {
  $head = New-Object byte[] 16
  $null = $fs.Read($head, 0, 16)
  $headerSize = [BitConverter]::ToUInt32($head, 4)
  $jsonLen = $headerSize - 8
  $jsonBytes = New-Object byte[] $jsonLen
  $fs.Position = 16
  $read = 0
  while ($read -lt $jsonLen) {
    $n = $fs.Read($jsonBytes, $read, $jsonLen - $read)
    if ($n -le 0) { break }
    $read += $n
  }
  $base = 8 + $headerSize
  $root = [System.Text.Encoding]::UTF8.GetString($jsonBytes) | ConvertFrom-Json
  $segments = $Path -split '[\\/]' | Where-Object { $_ -ne '' }
  $node = $root
  foreach ($seg in $segments) {
    $prop = $node.files.PSObject.Properties[$seg]
    if ($null -eq $prop) { throw "not found in asar: $Path (at '$seg')" }
    $node = $prop.Value
  }
  if ($node.files) { throw "path is a directory, not a file: $Path" }
  $size = [int]$node.size
  $fs.Position = $base + [int64]$node.offset
  $bytes = New-Object byte[] $size
  $read = 0
  while ($read -lt $size) {
    $n = $fs.Read($bytes, $read, $size - $read)
    if ($n -le 0) { break }
    $read += $n
  }
  $dir = Split-Path -Parent $OutFile
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [System.IO.File]::WriteAllBytes($OutFile, $bytes)
  Write-Output "extracted $size bytes -> $OutFile"
}
finally { $fs.Close() }
