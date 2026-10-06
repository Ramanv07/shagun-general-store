Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\raman\.gemini\antigravity-ide\brain\e190f276-df7f-46eb-91e6-b7c76a94134d\.user_uploaded\media_1791178001612.jpg'
$img = [System.Drawing.Image]::FromFile($imgPath)
Write-Output "Image Dimensions: $($img.Width)x$($img.Height)"
$img.Dispose()
