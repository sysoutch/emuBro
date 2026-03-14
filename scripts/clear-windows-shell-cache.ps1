param(
    [switch]$DryRun,
    [switch]$PurgeInstalledAppData,
    [switch]$KeepExplorerClosed
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[emuBro-shell-reset] $Message"
}

function Remove-PathIfExists {
    param(
        [string]$Path,
        [switch]$Recurse
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    Write-Step "Removing $Path"
    if ($DryRun) {
        return
    }

    if ($Recurse) {
        Remove-Item -LiteralPath $Path -Force -Recurse -ErrorAction SilentlyContinue
        return
    }

    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
}

function Remove-MatchingChildren {
    param(
        [string]$Directory,
        [string[]]$Patterns
    )

    if (-not (Test-Path -LiteralPath $Directory)) {
        return
    }

    Get-ChildItem -LiteralPath $Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $item = $_
        $matches = $false
        foreach ($pattern in $Patterns) {
            if ($item.Name -like $pattern) {
                $matches = $true
                break
            }
        }

        if (-not $matches) {
            return
        }

        Write-Step "Removing $($item.FullName)"
        if ($DryRun) {
            return
        }

        Remove-Item -LiteralPath $item.FullName -Force -Recurse -ErrorAction SilentlyContinue
    }
}

Write-Step "Stopping emuBro if it is running"
if (-not $DryRun) {
    Get-Process -Name "emuBro" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

$userDesktop = Join-Path $env:USERPROFILE "Desktop"
$publicDesktop = Join-Path $env:PUBLIC "Desktop"
$startMenuPrograms = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$taskbarPinned = Join-Path $env:APPDATA "Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"
$explorerCacheDir = Join-Path $env:LOCALAPPDATA "Microsoft\Windows\Explorer"

Write-Step "Removing emuBro shortcuts and pinned taskbar links"
Remove-PathIfExists -Path (Join-Path $startMenuPrograms "emuBro") -Recurse
Remove-PathIfExists -Path (Join-Path $startMenuPrograms "emuBro.lnk")
Remove-PathIfExists -Path (Join-Path $startMenuPrograms "emubro.lnk")
Remove-MatchingChildren -Directory $startMenuPrograms -Patterns @("emuBro*.lnk", "emubro*.lnk")
Remove-MatchingChildren -Directory $userDesktop -Patterns @("emuBro*.lnk", "emubro*.lnk")
Remove-MatchingChildren -Directory $publicDesktop -Patterns @("emuBro*.lnk", "emubro*.lnk")
Remove-MatchingChildren -Directory $taskbarPinned -Patterns @("emuBro*.lnk", "emubro*.lnk")

if ($PurgeInstalledAppData) {
    Write-Step "Purging installed app folders under LocalAppData"
    Remove-PathIfExists -Path (Join-Path $env:LOCALAPPDATA "emuBro") -Recurse
    Remove-PathIfExists -Path (Join-Path $env:LOCALAPPDATA "Programs\emuBro") -Recurse
    Remove-PathIfExists -Path (Join-Path $env:LOCALAPPDATA "Programs\emubro_desktop") -Recurse
}

Write-Step "Stopping Explorer to clear icon cache"
if (-not $DryRun) {
    Get-Process -Name "explorer" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
}

Write-Step "Removing Explorer icon cache files"
Remove-PathIfExists -Path (Join-Path $env:LOCALAPPDATA "IconCache.db")
Remove-MatchingChildren -Directory $explorerCacheDir -Patterns @("iconcache*", "IconCache*")

if (-not $KeepExplorerClosed) {
    Write-Step "Restarting Explorer"
    if (-not $DryRun) {
        Start-Process explorer.exe
    }
}

Write-Step "Done"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Reinstall or launch emuBro."
Write-Host "2. Check the taskbar icon before re-pinning."
Write-Host "3. Re-pin only after verifying the runtime icon looks correct."

