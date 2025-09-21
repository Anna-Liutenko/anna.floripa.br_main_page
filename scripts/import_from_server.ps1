<#
import_from_server.ps1

Usage (PowerShell):
  1) Edit (or pass) `$Server` if different.
  2) Run in the repository root: `.\scripts\import_from_server.ps1`

What it does:
 - Detects common webroot directories on the remote server
 - Copies the live site files (excluding .git) into a local temp folder
 - Moves files into the repo working tree and commits
 - Pushes to the configured GitHub remote (adds origin if missing)

Notes:
 - Requires OpenSSH (`ssh`/`scp`) available in PowerShell (Windows 10+ or Git for Windows).
 - If `tar` is not available locally, run this in Git Bash/WSL or install 7-Zip.
 - You will be prompted for SSH password or use SSH agent/key.
 - For pushing to GitHub via HTTPS you may need a Personal Access Token; prefer SSH remote.
#>

param(
    [string]$Server = 'root@31.97.173.218',
    [string[]]$Candidates = @('/var/www/html','/var/www','/srv/www','/home','/root'),
    [string]$GitHubHttps = 'https://github.com/Anna-Liutenko/anna.floripa.br_main_page.git',
    [switch]$UseSshRemote
)

function Write-Log { param($m) Write-Host "[info] $m" }

# Ensure running in repo root
$repoRoot = (Get-Location).Path
if (-not (Test-Path (Join-Path $repoRoot '.git'))) {
    Write-Host "WARNING: Current folder does not look like a git repo (no .git). Continue? (y/N)" -NoNewline
    $c = Read-Host
    if ($c -ne 'y') { Write-Host 'Aborting.'; exit 1 }
}

# Set remote path directly
$found = '/var/www/anna-site'

Write-Log "Using remote path: $found"
$timestamp = (Get-Date).ToString('yyyyMMddHHmmss')

# Prepare temp dir
$tempDir = Join-Path $env:TEMP "site_import_$timestamp"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Log "Copying files from remote into: $tempDir"

# Detect rsync locally
$haveRsync = $false
try { & rsync --version > $null 2>&1; if ($LASTEXITCODE -eq 0) { $haveRsync = $true } } catch { $haveRsync = $false }

if ($haveRsync) {
    Write-Log 'Using rsync over SSH to copy files (with sudo).'
    $remoteSpec = "$($Server):$($found)/"
    & rsync -a -e 'ssh' --rsync-path='sudo rsync' --exclude='.git' $remoteSpec $tempDir
    if ($LASTEXITCODE -ne 0) { Write-Log 'rsync failed — falling back to streamed tar'; $haveRsync = $false }
}

if (-not $haveRsync) {
    Write-Log 'Using streamed tar over SSH to copy files (with sudo).'
    try { & tar --version > $null 2>&1 } catch { }
    if ($LASTEXITCODE -ne 0) { Write-Host "Local 'tar' not found. Run in Git Bash/WSL or install tar."; exit 1 }
    $sshTarCmd = "sudo tar -C '$found' -cf - --exclude='.git' ."
    & ssh $Server $sshTarCmd | & tar -x -C $tempDir
    if ($LASTEXITCODE -ne 0) { Write-Host 'Streamed ssh|tar failed. Aborting.'; exit 1 }
}

# Move files into repo root, skipping .git
Write-Log 'Moving files into repository root (skipping .git)'
Get-ChildItem -Path $tempDir -Force | Where-Object { $_.Name -ne '.git' } | ForEach-Object {
    $dest = Join-Path $repoRoot $_.Name
    if (Test-Path $dest) {
        Write-Log "Removing existing $($_.Name)"
        Remove-Item -LiteralPath $dest -Recurse -Force -ErrorAction SilentlyContinue
    }
    Move-Item -LiteralPath $_.FullName -Destination $repoRoot -Force
}

# Cleanup temp
Remove-Item -Recurse -Force $tempDir

# Git add/commit
Write-Log 'Staging files and creating commit'
git add -A
$commitMsg = "Import site files from $Server on $timestamp"
$diff = git status --porcelain
if (-not $diff) { Write-Host 'No changes to commit.'; exit 0 }

git commit -m "$commitMsg"
if ($LASTEXITCODE -ne 0) { Write-Host 'git commit failed. Resolve manually.'; exit 1 }

# Setup remote if missing
$remoteUrl = git config --get remote.origin.url
if (-not $remoteUrl) {
    if ($UseSshRemote) { $url = 'git@github.com:Anna-Liutenko/anna.floripa.br_main_page.git' } else { $url = $GitHubHttps }
    git remote add origin $url
    Write-Log "Added remote origin $url"
} else { Write-Log "Existing remote origin: $remoteUrl" }

# Push
Write-Log "Pushing to origin main (you may be prompted for credentials)"
git push -u origin main
if ($LASTEXITCODE -ne 0) { Write-Host 'git push failed. You may need to authenticate or create branch main on remote.'; exit 1 }

Write-Host 'Import complete. Check GitHub repository to verify files.'
