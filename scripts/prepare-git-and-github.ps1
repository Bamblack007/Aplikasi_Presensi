param(
  [string]$RepoName = "aplikasi-presensi",
  [string]$Visibility = "public"
)

function Check-Cmd($cmd) {
  try {
    & $cmd --version > $null 2>&1
    return $true
  } catch {
    return $false
  }
}

if (-not (Check-Cmd git)) {
  Write-Error "Git tidak ditemukan. Install Git terlebih dahulu: https://git-scm.com/downloads"
  exit 1
}

# Initialize git if needed
if (-not (Test-Path .git)) {
  git init
}

git add .
if (-not (git rev-parse --verify HEAD 2>$null)) {
  git commit -m "chore: initial commit"
} else {
  try {
    git commit -m "chore: update"
  } catch {
    Write-Host "No changes to commit"
  }
}

if (Check-Cmd gh) {
  Write-Host "Detected GitHub CLI (gh). Creating repo '$RepoName'..."
  gh repo create $RepoName --$Visibility --source=. --remote=origin --push
  Write-Host "Repo created and code pushed to GitHub."
} else {
  Write-Host "GitHub CLI (gh) not found. Create a repo manually on GitHub, then run:" 
  Write-Host "  git remote add origin https://github.com/<your-user>/$RepoName.git"
  Write-Host "  git branch -M main"
  Write-Host "  git push -u origin main"
}
