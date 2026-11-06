param([switch]$Force)
# Clears the Desktop renderer's HTTP / V8 caches so the next start re-downloads
# the boot manifest and every client bundle. Safe: caches rebuild themselves.
$ErrorActionPreference = 'Stop'
$userData = Join-Path $env:APPDATA '@deepseek-ai/dsh-desktop'

$running = Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue
if ($running -and -not $Force) {
  Write-Output "DeepSeek Harness is still running ($($running.Count) processes). Close the app first, then re-run this script."
  exit 1
}

foreach ($name in 'Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache') {
  $target = Join-Path $userData $name
  if (Test-Path -LiteralPath $target) {
    try {
      Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
      Write-Output "cleared  $name"
    } catch {
      Write-Output "failed   $name : $($_.Exception.Message)"
    }
  } else {
    Write-Output "absent   $name"
  }
}
Write-Output 'done'
