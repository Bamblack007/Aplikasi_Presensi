param(
  [string]$ProjectName = "aplikasi-presensi"
)

function Check-Cmd($cmd) {
  try {
    & $cmd --version > $null 2>&1
    return $true
  } catch {
    return $false
  }
}

if (-not (Check-Cmd vercel)) {
  Write-Host "Vercel CLI tidak ditemukan. Install dengan: npm i -g vercel"
  exit 1
}

Write-Host "Login ke Vercel (jika belum):"
vercel login

Write-Host "Men-deploy project ke Vercel (interaktif). Jika ingin non-interaktif, gunakan 'vercel --prod --confirm'."
vercel --prod
