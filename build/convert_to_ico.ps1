Add-Type -AssemblyName System.Drawing

$srcPath = "C:\code\Heimdall\build\icon.png"
$icoPath = "C:\code\Heimdall\build\icon.ico"

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$sizes = @(256, 128, 64, 48, 32, 16)

$pngBuffers = @()

foreach ($s in $sizes) {
    $targetBmp = New-Object System.Drawing.Bitmap $s, $s, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($targetBmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcBmp, 0, 0, $s, $s)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $targetBmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $targetBmp.Dispose()
    $pngBuffers += ,($ms.ToArray())
    $ms.Dispose()
}

$srcBmp.Dispose()

# Create ICO file
$fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create), ([System.IO.FileAccess]::Write)
$bw = New-Object System.IO.BinaryWriter $fs

# Header: 6 bytes
$bw.Write([uint16]0)          # Reserved
$bw.Write([uint16]1)          # Type = 1 (ICO)
$bw.Write([uint16]$sizes.Count) # Count of images

$offset = 6 + ($sizes.Count * 16)

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]
    $buf = $pngBuffers[$i]
    $w = if ($s -ge 256) { [byte]0 } else { [byte]$s }
    $h = if ($s -ge 256) { [byte]0 } else { [byte]$s }

    $bw.Write($w)             # Width
    $bw.Write($h)             # Height
    $bw.Write([byte]0)        # Color count
    $bw.Write([byte]0)        # Reserved
    $bw.Write([uint16]1)      # Color planes
    $bw.Write([uint16]32)     # Bits per pixel
    $bw.Write([uint32]$buf.Length) # Image bytes
    $bw.Write([uint32]$offset)     # Offset
    $offset += $buf.Length
}

# Write PNG data for each image
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $bw.Write($pngBuffers[$i])
}

$bw.Close()
$fs.Close()

Write-Host "Successfully generated multi-resolution icon at $icoPath (Size: $((Get-Item $icoPath).Length) bytes)"
