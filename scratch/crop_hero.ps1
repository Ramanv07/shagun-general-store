Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\raman\.gemini\antigravity-ide\brain\e190f276-df7f-46eb-91e6-b7c76a94134d\.user_uploaded\media_1791178001612.jpg'
$src = [System.Drawing.Bitmap]::FromFile($imgPath)

# Crop hero vanity area
# Coordinates in 1024x576 image:
# x: ~420, y: 76, width: 604, height: 285
$rect = New-Object System.Drawing.Rectangle(420, 76, 604, 285)
$hero = $src.Clone($rect, $src.PixelFormat)

$outDir = 'c:\Users\raman\Downloads\shagun-general-store\public\images'
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir }
$hero.Save("$outDir\hero-vanity.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg)

$hero.Dispose()
$src.Dispose()
Write-Output "Successfully saved hero-vanity.jpg"
