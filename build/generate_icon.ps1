Add-Type -AssemblyName System.Drawing

$size = 512
$bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$g.Clear([System.Drawing.Color]::Transparent)

# Helper for rounded rect path
function Get-RoundedRectPath($x, $y, $w, $h, $radius) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc(($x + $w - $d), $y, $d, $d, 270, 90)
    $path.AddArc(($x + $w - $d), ($y + $h - $d), $d, $d, 0, 90)
    $path.AddArc($x, ($y + $h - $d), $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

# 1. Soft Ambient Shadow behind squircle
$shadowRect = New-Object System.Drawing.Rectangle 44, 52, 424, 424
$shadowPath = Get-RoundedRectPath 44 52 424 424 96
$shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(110, 0, 0, 0))
$g.FillPath($shadowBrush, $shadowPath)
$shadowBrush.Dispose()
$shadowPath.Dispose()

# 2. Main Squircle Body
$mainX = 44
$mainY = 44
$mainW = 424
$mainH = 424
$mainRadius = 96
$mainPath = Get-RoundedRectPath $mainX $mainY $mainW $mainH $mainRadius

# Base dark gradient (Obsidian / Space Slate)
$rectF = New-Object System.Drawing.RectangleF $mainX, $mainY, $mainW, $mainH
$bgGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rectF, `
    ([System.Drawing.Color]::FromArgb(255, 24, 25, 34)), `
    ([System.Drawing.Color]::FromArgb(255, 9, 10, 14)), `
    55.0
$g.FillPath($bgGrad, $mainPath)
$bgGrad.Dispose()

# 3. Inner Radial Gold Bloom / Caustic in center
$causticPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$causticPath.AddEllipse(120, 120, 272, 272)
$causticBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $causticPath
$causticBrush.CenterColor = [System.Drawing.Color]::FromArgb(90, 245, 158, 11)
$causticBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 245, 158, 11))
$g.FillEllipse($causticBrush, 120, 120, 272, 272)
$causticBrush.Dispose()
$causticPath.Dispose()

# 4. Metallic Bifrost Rim Border
$rimGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rectF, `
    ([System.Drawing.Color]::FromArgb(255, 252, 211, 77)), `
    ([System.Drawing.Color]::FromArgb(255, 180, 83, 9)), `
    45.0
$rimPen = New-Object System.Drawing.Pen $rimGrad, 7.0
$g.DrawPath($rimPen, $mainPath)
$rimPen.Dispose()
$rimGrad.Dispose()

# 5. Inner Glass Specular Bevel Line (top reflection)
$innerPath = Get-RoundedRectPath ($mainX + 4) ($mainY + 4) ($mainW - 8) ($mainH - 8) ($mainRadius - 4)
$specularPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(50, 255, 255, 255)), 2.5
$g.DrawPath($specularPen, $innerPath)
$specularPen.Dispose()
$innerPath.Dispose()

# 6. Center Glyph: The All-Seeing Eye of Heimdall
# Eyebrow accent arc above eye
$eyebrowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$eyebrowPath.AddArc(196, 140, 120, 50, 195, 150)
$eyebrowPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(220, 251, 191, 36)), 5.0
$eyebrowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$eyebrowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawPath($eyebrowPen, $eyebrowPath)
$eyebrowPen.Dispose()
$eyebrowPath.Dispose()

# Outer stylized almond eye contour
$eyePath = New-Object System.Drawing.Drawing2D.GraphicsPath
$pLeft = New-Object System.Drawing.Point 132, 256
$pRight = New-Object System.Drawing.Point 380, 256
$cTop1 = New-Object System.Drawing.Point 185, 170
$cTop2 = New-Object System.Drawing.Point 327, 170
$cBot1 = New-Object System.Drawing.Point 327, 342
$cBot2 = New-Object System.Drawing.Point 185, 342

$eyePath.AddBezier($pLeft, $cTop1, $cTop2, $pRight)
$eyePath.AddBezier($pRight, $cBot1, $cBot2, $pLeft)
$eyePath.CloseFigure()

# Fill dark translucent inside eye
$eyeFillBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(200, 12, 13, 18))
$g.FillPath($eyeFillBrush, $eyePath)
$eyeFillBrush.Dispose()

# Eye Golden Border Stroke
$eyeGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush `
    (New-Object System.Drawing.RectangleF 130, 160, 254, 190), `
    ([System.Drawing.Color]::FromArgb(255, 253, 224, 71)), `
    ([System.Drawing.Color]::FromArgb(255, 217, 119, 6)), `
    0.0
$eyePen = New-Object System.Drawing.Pen $eyeGrad, 15.0
$eyePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$g.DrawPath($eyePen, $eyePath)
$eyePen.Dispose()
$eyeGrad.Dispose()
$eyePath.Dispose()

# 7. Iris: Glowing Bifrost Amber Ring
$irisRect = New-Object System.Drawing.Rectangle 194, 194, 124, 124
$irisBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush `
    (New-Object System.Drawing.RectangleF 194, 194, 124, 124), `
    ([System.Drawing.Color]::FromArgb(255, 245, 158, 11)), `
    ([System.Drawing.Color]::FromArgb(255, 180, 83, 9)), `
    90.0
$g.FillEllipse($irisBrush, $irisRect)
$irisBrush.Dispose()

# 8. Pupil: Luminous Cyan / Teal Core (Bifrost Energy Source)
$pupilRect = New-Object System.Drawing.Rectangle 222, 222, 68, 68
$pupilPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$pupilPath.AddEllipse($pupilRect)
$pupilBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $pupilPath
$pupilBrush.CenterColor = [System.Drawing.Color]::FromArgb(255, 165, 243, 252)
$pupilBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 6, 182, 212))
$g.FillEllipse($pupilBrush, $pupilRect)
$pupilBrush.Dispose()
$pupilPath.Dispose()

# 9. Inner Specular Glint Reflection Dot
$glintBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 255, 255, 255))
$g.FillEllipse($glintBrush, 244, 238, 14, 14)
$g.FillEllipse($glintBrush, 263, 258, 6, 6)
$glintBrush.Dispose()

# 10. Satellite Telemetry Bead on Upper-Right Corner
$satHalo = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(90, 6, 182, 212))
$g.FillEllipse($satHalo, 368, 108, 36, 36)
$satHalo.Dispose()

$satCore = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 34, 211, 238))
$g.FillEllipse($satCore, 376, 116, 20, 20)
$satCore.Dispose()

$satGlint = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$g.FillEllipse($satGlint, 381, 120, 5, 5)
$satGlint.Dispose()

# Save PNG
$outPng = "C:\code\Heimdall\build\icon.png"
$bmp.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
Write-Host "Generated master icon at $outPng successfully!"
