param(
  [Parameter(Mandatory = $true)][string]$OutFile
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not ('DshWin32' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class DshWin32 {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
}
'@ -ReferencedAssemblies System.Drawing
}

$procs = Get-Process -Name 'DeepSeek Harness' -ErrorAction Stop | Where-Object { $_.MainWindowHandle -ne 0 }
if (-not $procs) { throw 'no DeepSeek Harness window found' }
$proc = $procs | Select-Object -First 1
$hwnd = $proc.MainWindowHandle
if ([DshWin32]::IsIconic($hwnd)) { [void][DshWin32]::ShowWindow($hwnd, 9); Start-Sleep -Milliseconds 600 }

$rect = New-Object DshWin32+RECT
[void][DshWin32]::GetWindowRect($hwnd, [ref]$rect)
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -le 0 -or $height -le 0) { throw "bad window rect $width x $height" }

$bmp = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $graphics.GetHdc()
$ok = [DshWin32]::PrintWindow($hwnd, $hdc, 2)
$graphics.ReleaseHdc($hdc)
$graphics.Dispose()

$dir = Split-Path -Parent $OutFile
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)

# Report ink coverage so a blank capture is obvious.
$sample = New-Object System.Drawing.Bitmap 160, 100
$g2 = [System.Drawing.Graphics]::FromImage($sample)
$g2.DrawImage($bmp, 0, 0, 160, 100)
$g2.Dispose()
$distinct = @{}
for ($y = 0; $y -lt 100; $y += 3) { for ($x = 0; $x -lt 160; $x += 3) { $distinct[$sample.GetPixel($x, $y).ToArgb()] = 1 } }
$sample.Dispose()
$bmp.Dispose()

Write-Output ("printWindow={0} size={1}x{2} distinctColors={3} -> {4}" -f $ok, $width, $height, $distinct.Count, $OutFile)
